
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';
import { pool } from '../models/db';
import type { AuthRequest } from '../middleware/auth.middleware';
import { insertAuditLog } from '../models/audit-log.model';

async function sendPrivacyEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!process.env.RESEND_API_KEY) {
        console.error('Privacy notification email was not sent: RESEND_API_KEY is not configured.');
        return false;
    }
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
                to: [to],
                subject,
                html,
            }),
        });
        if (!response.ok) {
            console.error('Privacy notification email failed:', await response.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('Privacy notification email failed:', error);
        return false;
    }
}

function getRequestedAdminId(req: AuthRequest): string | undefined {
    const id = req.params.id;
    return id === undefined || id === 'me' ? req.admin?.id : typeof id === 'string' ? id : undefined;
}

export const getAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const id = getRequestedAdminId(req);
        if (id !== req.admin?.id) {
            res.status(403).json({ error: 'No puedes consultar otro perfil de administrador.' });
            return;
        }
        const query = `SELECT id, nombre, email, telefono_corporativo, empresa, profile_photo,
                              mfa_facial_status, totp_enabled, updated_at
                       FROM admins WHERE id = $1`;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Administrador no encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Error al obtener el perfil del administrador:', error);
        res.status(500).json({ error: 'No se pudo obtener el perfil del administrador.' });
    }
};

export const updateAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = getRequestedAdminId(req);
    if (id !== req.admin?.id) {
        res.status(403).json({ error: 'No puedes modificar otro perfil de administrador.' });
        return;
    }

    const body: unknown = req.body;
    if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        res.status(400).json({ error: 'Los datos del perfil no son válidos.' });
        return;
    }

    const { nombre, email, telefono_corporativo, empresa, newPassword, profilePhoto } = body as Record<string, unknown>;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120) {
        res.status(400).json({ error: 'El nombre debe tener entre 2 y 120 caracteres.' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        res.status(400).json({ error: 'Escribe un correo electrónico válido.' });
        return;
    }
    if (normalizedEmail !== req.admin?.email.toLowerCase()) {
        res.status(400).json({ error: 'El correo corporativo no puede modificarse desde este apartado.' });
        return;
    }
    if (newPassword !== undefined && (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 128
        || !/\p{Ll}/u.test(newPassword) || !/\p{Lu}/u.test(newPassword) || !/\p{N}/u.test(newPassword))) {
        res.status(400).json({ error: 'La nueva contraseña debe tener 12 caracteres e incluir mayúscula, minúscula y número.' });
        return;
    }
    if (profilePhoto !== undefined && (profilePhoto !== null
        && (typeof profilePhoto !== 'string' || !profilePhoto.startsWith('data:image/') || profilePhoto.length > 1_500_000))) {
        res.status(400).json({ error: 'La foto de perfil no es válida o supera el tamaño permitido.' });
        return;
    }
    if (telefono_corporativo !== null && (typeof telefono_corporativo !== 'string' || telefono_corporativo.trim().length > 30)) {
        res.status(400).json({ error: 'El teléfono debe tener como máximo 30 caracteres.' });
        return;
    }
    if (empresa !== null && (typeof empresa !== 'string' || empresa.trim().length > 120)) {
        res.status(400).json({ error: 'La empresa debe tener como máximo 120 caracteres.' });
        return;
    }

    try {
        const passwordHash = typeof newPassword === 'string' ? await bcrypt.hash(newPassword, 12) : null;
        const query = `
            UPDATE admins
            SET nombre = $1,
                telefono_corporativo = $2,
                empresa = $3,
                password = COALESCE($4, password),
                profile_photo = COALESCE($5, profile_photo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING id, nombre, email, telefono_corporativo, empresa, profile_photo,
                      mfa_facial_status, totp_enabled, updated_at;
        `;

        const values = [
            nombre.trim(),
            typeof telefono_corporativo === 'string' ? telefono_corporativo.trim() || null : null,
            typeof empresa === 'string' ? empresa.trim() || null : null,
            passwordHash,
            typeof profilePhoto === 'string' ? profilePhoto : null,
            id,
        ];
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const result = await client.query(query, values);

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                res.status(404).json({ error: 'Administrador no encontrado' });
                return;
            }

            await insertAuditLog(client, req, {
                adminId: id,
                action: 'ADMIN_PROFILE_UPDATED',
                resourceType: 'admin',
                resourceId: id,
                details: {
                    fields: [
                        'nombre',
                        ...(telefono_corporativo !== undefined ? ['telefono_corporativo'] : []),
                        ...(empresa !== undefined ? ['empresa'] : []),
                        ...(passwordHash ? ['contraseña'] : []),
                        ...(typeof profilePhoto === 'string' ? ['foto de perfil'] : []),
                    ],
                    passwordChanged: Boolean(passwordHash),
                    profilePhotoChanged: typeof profilePhoto === 'string',
                },
            });
            await client.query('COMMIT');
            res.json({ message: 'Perfil actualizado correctamente', admin: result.rows[0] });
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            res.status(409).json({ error: 'Ese correo ya está asociado a otra cuenta.' });
            return;
        }
        console.error('Error al actualizar el perfil del administrador:', error);
        res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
    }
};

export const getPrivacyAccess = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.admin?.id;
    if (!id) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `SELECT id, nombre, email, telefono_corporativo, empresa, profile_photo,
                    account_status, created_at, updated_at,
                    mfa_facial_status, totp_enabled
             FROM admins WHERE id = $1 AND account_status = 'active'`,
            [id]
        );
        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'No se encontró una cuenta activa asociada a esta sesión.' });
            return;
        }
        const row = result.rows[0];
        await insertAuditLog(client, req, {
            adminId: id,
            action: 'PRIVACY_ACCESS',
            resourceType: 'admin',
            resourceId: id,
            details: { purpose: 'exercise_arco_access' },
        });
        await client.query(
            `INSERT INTO privacy_audit_logs
                (admin_id, action, result, details, purpose, notice_version)
             VALUES ($1, 'ACCESS', 'Consulta de datos realizada', '{}'::jsonb,
                     'Ejercicio del derecho de acceso', '1.0')`,
            [id]
        );
        await client.query('COMMIT');
        res.json({
            identificacion: { nombre_completo: row.nombre },
            contacto: { correo_electronico: row.email, telefono: row.telefono_corporativo },
            cuenta: {
                id: String(row.id),
                fecha_registro: row.created_at,
                estado: row.account_status,
                ultima_actualizacion: row.updated_at,
                empresa: row.empresa,
            },
            vehiculo: { asociado: null },
            seguridad: {
                autenticacion_facial_habilitada: row.mfa_facial_status,
                autenticador_totp_habilitado: row.totp_enabled,
            },
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al consultar los datos personales:', error);
        res.status(500).json({ error: 'No fue posible consultar tus datos personales.' });
    } finally {
        client.release();
    }
};

export const rectifyPrivacyData = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.admin?.id;
    if (!id) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    const body = req.body as Record<string, unknown> | null;
    const nombre = typeof body?.nombre === 'string' ? body.nombre.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const telefono = typeof body?.telefono === 'string' ? body.telefono.trim() : '';

    if (nombre.length < 2 || nombre.length > 120) {
        res.status(400).json({ error: 'El nombre debe tener entre 2 y 120 caracteres.' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
        res.status(400).json({ error: 'Escribe un correo electrónico válido.' });
        return;
    }
    if (telefono.length > 30) {
        res.status(400).json({ error: 'El teléfono debe tener como máximo 30 caracteres.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const duplicate = await client.query(
            'SELECT id FROM admins WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1',
            [email, id]
        );
        if (duplicate.rows.length > 0) {
            await client.query('ROLLBACK');
            res.status(409).json({ error: 'Ese correo ya está asociado a otra cuenta.' });
            return;
        }
        const account = await client.query(
            `SELECT id, nombre, email FROM admins
             WHERE id = $1 AND account_status = 'active' FOR UPDATE`,
            [id]
        );
        if (account.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'No se encontró una cuenta activa.' });
            return;
        }
        await client.query(
            `UPDATE privacy_rectification_requests
             SET status = 'rejected',
                 review_note = 'Reemplazada por una solicitud más reciente',
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE admin_id = $1 AND status = 'pending'`,
            [id]
        );
        await client.query(
            `UPDATE admins SET nombre = $1, email = $2, telefono_corporativo = $3,
                 updated_at = CURRENT_TIMESTAMP WHERE id = $4`,
            [nombre, email, telefono || null, id]
        );
        await insertAuditLog(client, req, {
            adminId: id,
            action: 'PRIVACY_RECTIFICATION',
            resourceType: 'admin',
            resourceId: id,
            details: { fields: ['nombre', 'email', 'telefono_corporativo'] },
        });
        await client.query(
            `INSERT INTO privacy_audit_logs
                (admin_id, action, result, details, purpose, notice_version)
             VALUES ($1, 'RECTIFICATION', 'Datos actualizados',
                     '{"fields":["nombre","email","telefono"]}'::jsonb,
                     'Ejercicio del derecho de rectificación', '1.0')`,
            [id]
        );
        await client.query('COMMIT');

        res.json({ success: true, message: 'Tus datos se actualizaron correctamente.' });
    } catch (error) {
        await client.query('ROLLBACK');
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            res.status(409).json({ error: 'Ese correo ya está asociado a otra cuenta.' });
            return;
        }
        console.error('Error al rectificar los datos:', error);
        res.status(500).json({ error: 'No fue posible actualizar tus datos.' });
    } finally {
        client.release();
    }
};

export const getPendingRectifications = async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewerId = req.admin?.id;
    if (!reviewerId) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    try {
        const reviewer = await pool.query(
            "SELECT account_role FROM admins WHERE id = $1 AND account_status = 'active'",
            [reviewerId]
        );
        if (reviewer.rows[0]?.account_role !== 'admin') {
            res.status(403).json({ error: 'Solo personal autorizado puede revisar solicitudes ARCO.' });
            return;
        }
        const result = await pool.query(
            `SELECT r.id::text AS id, r.admin_id::text AS admin_id, r.nombre, r.email,
                    r.telefono_corporativo, r.status, r.created_at,
                    a.nombre AS current_nombre, a.email AS current_email,
                    a.telefono_corporativo AS current_telefono
             FROM privacy_rectification_requests r
             JOIN admins a ON a.id = r.admin_id
             WHERE r.status = 'pending'
             ORDER BY r.created_at DESC, r.id DESC
             LIMIT 100`
        );
        res.json({ items: result.rows });
    } catch (error) {
        console.error('Error al consultar solicitudes de rectificación:', error);
        res.status(500).json({ error: 'No fue posible consultar las solicitudes pendientes.' });
    }
};

export const getMyRectificationStatus = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.admin?.id;
    if (!id) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    try {
        const result = await pool.query(
            `SELECT id::text AS id, status, review_note, created_at, reviewed_at
             FROM privacy_rectification_requests
             WHERE admin_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT 1`,
            [id]
        );
        res.json({ request: result.rows[0] ?? null });
    } catch (error) {
        console.error('Error al consultar el estado de rectificación:', error);
        res.status(500).json({ error: 'No fue posible consultar el estado de la rectificación.' });
    }
};

export const reviewRectification = async (req: AuthRequest, res: Response): Promise<void> => {
    const reviewerId = req.admin?.id;
    const rawRequestId = typeof req.params.requestId === 'string' ? req.params.requestId : '';
    const decision = typeof req.body?.decision === 'string' ? req.body.decision.trim().toLowerCase() : '';
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 500) : null;
    if (!reviewerId) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    if (!/^[1-9]\d*$/.test(rawRequestId ?? '') || !['approved', 'rejected'].includes(decision)) {
        res.status(400).json({ error: 'La decisión de rectificación no es válida.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const reviewer = await client.query(
            "SELECT account_role FROM admins WHERE id = $1 AND account_status = 'active' FOR UPDATE",
            [reviewerId]
        );
        if (reviewer.rows[0]?.account_role !== 'admin') {
            await client.query('ROLLBACK');
            res.status(403).json({ error: 'Solo personal autorizado puede revisar solicitudes ARCO.' });
            return;
        }
        const request = await client.query(
            `SELECT r.id, r.admin_id, r.nombre, r.email, r.telefono_corporativo,
                    r.status, a.email AS current_email
             FROM privacy_rectification_requests r
             JOIN admins a ON a.id = r.admin_id
             WHERE r.id = $1 FOR UPDATE OF r`,
            [rawRequestId]
        );
        const pending = request.rows[0];
        if (!pending || pending.status !== 'pending') {
            await client.query('ROLLBACK');
            res.status(404).json({ error: 'La solicitud no existe o ya fue revisada.' });
            return;
        }

        if (decision === 'approved') {
            const duplicate = await client.query(
                'SELECT id FROM admins WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1',
                [pending.email, pending.admin_id]
            );
            if (duplicate.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({ error: 'El correo solicitado pertenece a otra cuenta.' });
                return;
            }
            await client.query(
                `UPDATE admins
                 SET nombre = $1, email = $2, telefono_corporativo = $3, updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4 AND account_status = 'active'`,
                [pending.nombre, pending.email, pending.telefono_corporativo, pending.admin_id]
            );
        }

        await client.query(
            `UPDATE privacy_rectification_requests
             SET status = $1, reviewed_by = $2, review_note = $3,
                 reviewed_at = CURRENT_TIMESTAMP
             WHERE id = $4`,
            [decision, reviewerId, note, rawRequestId]
        );
        await insertAuditLog(client, req, {
            adminId: reviewerId,
            action: decision === 'approved'
                ? 'PRIVACY_RECTIFICATION_APPROVED'
                : 'PRIVACY_RECTIFICATION_REJECTED',
            resourceType: 'privacy_rectification',
            resourceId: rawRequestId,
            details: { requesterAdminId: pending.admin_id, status: decision },
        });
        await client.query(
            `INSERT INTO privacy_audit_logs
                (admin_id, action, result, details, purpose, notice_version)
             VALUES ($1, 'RECTIFICATION', $2,
                     $3::jsonb, 'Ejercicio del derecho de rectificación', '1.0')`,
            [
                pending.admin_id,
                decision === 'approved' ? 'Solicitud autorizada y cambios aplicados' : 'Solicitud rechazada',
                JSON.stringify({ status: decision }),
            ]
        );
        await client.query('COMMIT');

        await sendPrivacyEmail(
            pending.email,
            decision === 'approved'
                ? 'Tus cambios de datos fueron autorizados'
                : 'Tu solicitud de rectificación fue rechazada',
            decision === 'approved'
                ? '<p>Sigil.IA autorizó tu solicitud de rectificación. Los datos solicitados ya fueron aplicados a tu cuenta.</p>'
                : `<p>Sigil.IA revisó tu solicitud de rectificación y no pudo autorizarla.</p>${note ? `<p>Motivo: ${note.replace(/[&<>"']/g, '')}</p>` : ''}`
        );
        res.json({
            success: true,
            status: decision,
            message: decision === 'approved'
                ? 'Solicitud autorizada y cambios aplicados.'
                : 'Solicitud rechazada.',
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al revisar solicitud de rectificación:', error);
        res.status(500).json({ error: 'No fue posible revisar la solicitud.' });
    } finally {
        client.release();
    }
};

export const reviewRectificationByEmail = async (req: AuthRequest, res: Response): Promise<void> => {
    const rawRequestId = typeof req.body?.requestId === 'string' ? req.body.requestId : '';
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const decision = typeof req.body?.decision === 'string' ? req.body.decision.trim().toLowerCase() : '';
    if (!/^[1-9]\d*$/.test(rawRequestId) || !/^[A-Za-z0-9_-]{43,128}$/.test(token)
        || !['approved', 'rejected'].includes(decision)) {
        res.status(400).json({ error: 'Los datos de revisión no son válidos.' });
        return;
    }

    const tokenHash = createHash('sha256').update(token).digest('hex');
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await client.query(
            `SELECT r.id, r.admin_id, r.nombre, r.email, r.telefono_corporativo, r.status,
                    r.review_token_hash, r.review_token_expires_at
             FROM privacy_rectification_requests r
             WHERE r.id = $1
               AND r.review_token_expires_at > CURRENT_TIMESTAMP
             FOR UPDATE`,
            [rawRequestId]
        );
        const request = result.rows[0];
        if (!request || request.status !== 'pending'
            || request.review_token_hash !== tokenHash) {
            await client.query('ROLLBACK');
            res.status(403).json({ error: 'El enlace de revisión no es válido o ya expiró.' });
            return;
        }

        if (decision === 'approved') {
            const duplicate = await client.query(
                'SELECT id FROM admins WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1',
                [request.email, request.admin_id]
            );
            if (duplicate.rows.length > 0) {
                await client.query('ROLLBACK');
                res.status(409).json({ error: 'El correo solicitado pertenece a otra cuenta.' });
                return;
            }
            await client.query(
                `UPDATE admins
                 SET nombre = $1, email = $2, telefono_corporativo = $3,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $4 AND account_status = 'active'`,
                [request.nombre, request.email, request.telefono_corporativo, request.admin_id]
            );
        }

        await client.query(
            `UPDATE privacy_rectification_requests
             SET status = $1,
                 review_note = CASE WHEN $1 = 'approved' THEN 'Autorizada desde el correo de soporte'
                                    ELSE 'Rechazada desde el correo de soporte' END,
                 reviewed_at = CURRENT_TIMESTAMP,
                 review_token_hash = NULL,
                 review_token_expires_at = NULL
             WHERE id = $2`,
            [decision, rawRequestId]
        );
        await insertAuditLog(client, req, {
            adminId: request.admin_id,
            action: decision === 'approved'
                ? 'PRIVACY_RECTIFICATION_APPROVED_BY_SUPPORT'
                : 'PRIVACY_RECTIFICATION_REJECTED_BY_SUPPORT',
            resourceType: 'privacy_rectification',
            resourceId: rawRequestId,
            details: { status: decision, channel: 'support_email' },
        });
        await client.query(
            `INSERT INTO privacy_audit_logs
                (admin_id, action, result, details, purpose, notice_version)
             VALUES ($1, 'RECTIFICATION', $2,
                     $3::jsonb, 'Ejercicio del derecho de rectificación', '1.0')`,
            [
                request.admin_id,
                decision === 'approved'
                    ? 'Solicitud autorizada desde el correo de soporte'
                    : 'Solicitud rechazada desde el correo de soporte',
                JSON.stringify({ status: decision, channel: 'support_email' }),
            ]
        );
        await client.query('COMMIT');

        await sendPrivacyEmail(
            request.email,
            decision === 'approved'
                ? 'Tus cambios de datos fueron autorizados'
                : 'Tu solicitud de rectificación fue rechazada',
            decision === 'approved'
                ? '<p>Sigil.IA autorizó tu solicitud de rectificación. Los datos solicitados ya fueron aplicados a tu cuenta.</p>'
                : '<p>Sigil.IA revisó tu solicitud de rectificación y no pudo autorizarla.</p>'
        );
        res.json({
            success: true,
            status: decision,
            message: decision === 'approved'
                ? 'Solicitud autorizada y cambios aplicados.'
                : 'Solicitud rechazada.',
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al revisar solicitud desde el correo:', error);
        res.status(500).json({ error: 'No fue posible revisar la solicitud.' });
    } finally {
        client.release();
    }
};

export const cancelPrivacyAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.admin?.id;
    if (!id) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    const confirmation = typeof req.body?.confirmation === 'string' ? req.body.confirmation.trim().toUpperCase() : '';
    if (confirmation !== 'CONFIRMAR') {
        res.status(400).json({ error: 'Escribe CONFIRMAR para reiniciar el perfil.' });
        return;
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const account = await client.query(
            `SELECT id FROM admins WHERE id = $1 AND account_status = 'active' FOR UPDATE`, [id]
        );
        if (account.rows.length === 0) {
            await client.query('ROLLBACK');
            res.status(409).json({ error: 'La cuenta no existe o ya se encuentra dada de baja.' });
            return;
        }
        const vehicles = await client.query<{ id: string }>(
            `SELECT v.id::text AS id FROM vehicles v
             WHERE EXISTS (SELECT 1 FROM drivers d WHERE d.vehicle_id = v.id AND d.admin_id = $1)
             ORDER BY v.id FOR UPDATE OF v`,
            [id]
        );
        await client.query(
            `INSERT INTO privacy_audit_logs
                (admin_id, action, result, details, purpose, notice_version)
             VALUES ($1, 'CANCELLATION', 'Perfil reiniciado',
                     '{}'::jsonb,
                     'Ejercicio del derecho de cancelación', '1.0')`,
            [id]
        );
        await insertAuditLog(client, req, {
            adminId: id,
            action: 'PROFILE_RESET',
            resourceType: 'admin',
            resourceId: id,
            details: { accountDeleted: false, profileReset: true },
        });
        await client.query('DELETE FROM drivers WHERE admin_id = $1', [id]);
        await client.query('DELETE FROM password_reset_tokens WHERE admin_id = $1', [id]);
        if (vehicles.rows.length > 0) {
            await client.query(
                `DELETE FROM vehicles v WHERE v.id = ANY($1::bigint[])
                 AND NOT EXISTS (SELECT 1 FROM drivers d WHERE d.vehicle_id = v.id)`,
                [vehicles.rows.map((vehicle) => vehicle.id)]
            );
        }
        await client.query(
            `UPDATE admins SET nombre = 'Administrador', empresa = NULL, telefono_corporativo = NULL,
                profile_photo = NULL, face_template_encrypted = NULL, mfa_facial_status = FALSE,
                totp_secret_encrypted = NULL, totp_enabled = FALSE, totp_last_used_step = NULL,
                mfa_nonce = NULL, mfa_setup_expires_at = NULL, mfa_failed_attempts = 0,
                mfa_locked_until = NULL, first_login_required = TRUE,
                temporary_password_expires_at = NULL, session_version = session_version + 1,
                updated_at = NOW() WHERE id = $1`, [id]
        );
        await client.query('COMMIT');
        res.json({ success: true, message: 'Perfil reiniciado. Inicia sesión con tu correo y contraseña actuales.' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error al reiniciar el perfil:', error);
        res.status(500).json({ error: 'No fue posible reiniciar el perfil.' });
    } finally {
        client.release();
    }
};

export const getPrivacyAudit = async (req: AuthRequest, res: Response): Promise<void> => {
    const id = req.admin?.id;
    if (!id) {
        res.status(401).json({ error: 'La sesión no es válida.' });
        return;
    }
    try {
        const result = await pool.query(
            `SELECT id::text AS id, action, result, details, purpose, notice_version, created_at
             FROM privacy_audit_logs
             WHERE admin_id = $1
             ORDER BY created_at DESC, id DESC
             LIMIT 100`,
            [id]
        );
        res.json({ items: result.rows });
    } catch (error) {
        console.error('Error al consultar la bitácora de privacidad:', error);
        res.status(500).json({ error: 'No fue posible consultar tu historial de privacidad.' });
    }
};
