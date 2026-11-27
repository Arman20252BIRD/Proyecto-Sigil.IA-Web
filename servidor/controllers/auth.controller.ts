import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import { pool } from '../models/db';
import { jwtSecret } from './auth.config';
import { decryptFaceData, encryptFaceData } from '../models/face-data';
import type { AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';
import { insertAuditLog, writeAuditLog } from '../models/audit-log.model';
import { ensurePasswordResetSchema } from '../models/password-reset-token.model';

const FACE_DESCRIPTOR_LENGTH = 1024;
const FACE_MATCH_THRESHOLD = 0.5;
const MFA_MAX_FAILURES = 5;
const PRIVACY_NOTICE_VERSION = '1.0';

type FaceDescriptor = number[];
type AdminIdentity = { id: string; email: string; nombre: string };
type TokenPurpose = 'access' | 'mfa' | 'enroll' | 'setup' | 'onboarding';

function isFaceDescriptor(value: unknown): value is FaceDescriptor {
    return Array.isArray(value)
        && value.length === FACE_DESCRIPTOR_LENGTH
        && value.every((feature) => typeof feature === 'number' && Number.isFinite(feature) && Math.abs(feature) <= 100)
        && value.some((feature) => feature !== 0);
}

function faceSimilarity(left: FaceDescriptor, right: FaceDescriptor): number {
    if (left.length !== right.length) return 0;
    const squaredDistance = left.reduce((sum, feature, index) => sum + (feature - right[index]) ** 2, 0);
    const distance = Math.round(100 * 25 * squaredDistance) / 100;
    if (distance === 0) return 1;
    const normalized = (1 - Math.sqrt(distance) / 100 - 0.2) / 0.6;
    return Math.round(100 * Math.max(0, Math.min(1, normalized))) / 100;
}

function signToken(admin: AdminIdentity, purpose: TokenPurpose, jti?: string): string {
    return jwt.sign(
        { sub: admin.id, email: admin.email, nombre: admin.nombre, purpose, ...(jti ? { jti } : {}) },
        jwtSecret,
        { expiresIn: purpose === 'access' ? '8h' : purpose === 'mfa' ? '5m' : '15m' }
    );
}

function identityFromRow(admin: { id: string | number; email: string; nombre: string }): AdminIdentity {
    return { id: String(admin.id), email: admin.email, nombre: admin.nombre };
}

async function recordMfaFailure(adminId: string, jti: string): Promise<void> {
    await pool.query(
        `UPDATE admins
         SET mfa_failed_attempts = mfa_failed_attempts + 1,
             mfa_locked_until = CASE
                 WHEN mfa_failed_attempts + 1 >= $3 THEN NOW() + INTERVAL '15 minutes'
                 ELSE mfa_locked_until
             END,
             mfa_nonce = CASE WHEN mfa_failed_attempts + 1 >= $3 THEN NULL ELSE mfa_nonce END,
             mfa_setup_expires_at = CASE WHEN mfa_failed_attempts + 1 >= $3 THEN NULL ELSE mfa_setup_expires_at END
         WHERE id = $1 AND mfa_nonce = $2`,
        [adminId, jti, MFA_MAX_FAILURES]
    );
}

async function consumeMfaSession(adminId: string, jti: string, totpTimeStep?: number): Promise<boolean> {
    if (totpTimeStep !== undefined) {
        const result = await pool.query(
            `UPDATE admins
             SET mfa_nonce = NULL, mfa_setup_expires_at = NULL, totp_last_used_step = $3,
                 mfa_failed_attempts = 0, mfa_locked_until = NULL
             WHERE id = $1 AND mfa_nonce = $2
               AND (totp_last_used_step IS NULL OR totp_last_used_step < $3)
             RETURNING id`,
            [adminId, jti, totpTimeStep]
        );
        return result.rowCount === 1;
    }

    const result = await pool.query(
        `UPDATE admins
         SET mfa_nonce = NULL, mfa_setup_expires_at = NULL,
             mfa_failed_attempts = 0, mfa_locked_until = NULL
         WHERE id = $1 AND mfa_nonce = $2
         RETURNING id`,
        [adminId, jti]
    );
    return result.rowCount === 1;
}

function sendLockedResponse(res: Response, lockedUntil: Date | string | null): boolean {
    if (!lockedUntil || new Date(lockedUntil as string).getTime() <= Date.now()) return false;
    res.status(429).json({ error: 'Demasiados intentos de MFA. Inicia sesión de nuevo más tarde.' });
    return true;
}

function isDuplicateEmail(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export const validateAdminInvitation = async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.body?.invitationToken === 'string' ? req.body.invitationToken.trim() : '';
    if (!/^[A-Za-z0-9_-]{40,64}$/.test(token)) {
        res.status(400).json({ error: 'Escribe un código de invitación válido.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT email, empresa, expires_at
             FROM admin_invitations
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
             LIMIT 1`,
            [createHash('sha256').update(token).digest('hex')]
        );
        const invitation = result.rows[0];
        if (!invitation) {
            res.status(403).json({ error: 'La invitación no es válida, expiró o ya fue utilizada.' });
            return;
        }
        res.json({ valid: true, email: invitation.email, empresa: invitation.empresa, expiresAt: invitation.expires_at });
    } catch (error) {
        console.error('Error al validar la invitación:', error);
        res.status(503).json({ error: 'No fue posible validar la invitación.' });
    }
};

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
    res.status(410).json({ error: 'El registro público está deshabilitado. La cuenta debe ser creada previamente por soporte de Sigilia.' });
    return;

    const { nombre, email, password, telefono_corporativo, empresa, faceDescriptor, profilePhoto,
        privacyNoticeAccepted, biometricConsent, marketingConsent, invitationToken } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120) {
        res.status(400).json({ error: 'El nombre debe tener entre 2 y 120 caracteres.' });
        return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
        res.status(400).json({ error: 'Escribe un correo electrónico válido.' });
        return;
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128
        || !/\p{Ll}/u.test(password) || !/\p{Lu}/u.test(password) || !/\p{N}/u.test(password)) {
        res.status(400).json({
            error: 'La contraseña debe tener entre 12 y 128 caracteres e incluir mayúscula, minúscula y número.',
        });
        return;
    }
    if (typeof invitationToken !== 'string' || !/^[A-Za-z0-9_-]{40,64}$/.test(invitationToken)) {
        res.status(403).json({ error: 'El registro está cerrado. Necesitas una invitación válida emitida por Sigilia.' });
        return;
    }
    if (!isFaceDescriptor(faceDescriptor)) {
        res.status(400).json({
            error: 'No se recibió una plantilla facial válida. Activa la cámara, captura el rostro y vuelve a intentarlo.',
        });
        return;
    }
    if (privacyNoticeAccepted !== true) {
        res.status(400).json({ error: 'Debes aceptar el Aviso de privacidad para crear la cuenta.' });
        return;
    }
    if (biometricConsent !== true) {
        res.status(400).json({ error: 'Debes aceptar expresamente el tratamiento del descriptor facial.' });
        return;
    }
    if (profilePhoto !== undefined && profilePhoto !== null
        && (typeof profilePhoto !== 'string' || !profilePhoto.startsWith('data:image/') || profilePhoto.length > 1_500_000)) {
        res.status(400).json({ error: 'La foto de perfil no es válida o supera el tamaño permitido.' });
        return;
    }

    try {
        await pool.query('DELETE FROM pending_admin_enrollments WHERE expires_at <= NOW()');
        const invitationResult = await pool.query(
            `SELECT id, email, empresa, role
             FROM admin_invitations
             WHERE token_hash = $1
               AND used_at IS NULL
               AND expires_at > NOW()
             LIMIT 1`,
            [createHash('sha256').update(invitationToken).digest('hex')]
        );
        const invitation = invitationResult.rows[0];
        if (!invitation || invitation.email.trim().toLowerCase() !== normalizedEmail) {
            res.status(403).json({ error: 'La invitación no es válida, expiró o no corresponde al correo corporativo autorizado.' });
            return;
        }
        const existing = await pool.query(
            `SELECT 1 FROM admins WHERE email = $1
             UNION ALL
             SELECT 1 FROM pending_admin_enrollments WHERE email = $1 AND expires_at > NOW()
             LIMIT 1`,
            [normalizedEmail]
        );
        if (existing.rowCount) {
            res.status(409).json({ error: 'Ya existe una cuenta o un registro pendiente con ese correo.' });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const totpSecret = generateSecret();
        const enrollmentId = randomUUID();
        const pending = await pool.query(
            `INSERT INTO pending_admin_enrollments
                (id, nombre, email, password, telefono_corporativo, empresa, profile_photo,
                 privacy_notice_version, privacy_notice_accepted, biometric_consent, marketing_consent,
                 face_template_encrypted, totp_secret_encrypted, invitation_id, account_role, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW() + INTERVAL '15 minutes')
             RETURNING email`,
            [
                enrollmentId,
                nombre.trim(),
                normalizedEmail,
                passwordHash,
                typeof telefono_corporativo === 'string' ? telefono_corporativo.trim() : null,
                invitation.empresa,
                typeof profilePhoto === 'string' ? profilePhoto : null,
                PRIVACY_NOTICE_VERSION,
                true,
                true,
                marketingConsent === true,
                encryptFaceData(JSON.stringify(faceDescriptor)),
                encryptFaceData(totpSecret),
                invitation.id,
                invitation.role,
            ]
        );

        const recorded = await writeAuditLog(req, {
            action: 'REGISTRATION_STARTED',
            details: { email: normalizedEmail, privacyVersion: PRIVACY_NOTICE_VERSION, invitationId: invitation.id },
        });
        if (!recorded) {
            res.status(503).json({ error: 'No fue posible registrar el inicio del proceso de alta.' });
            return;
        }

        const identity: AdminIdentity = { id: '0', email: pending.rows[0].email, nombre: nombre.trim() };
        res.status(201).json({
            success: true,
            message: 'Escanea el código con tu aplicación autenticadora y confirma el código para terminar el registro.',
            enrollmentToken: signToken(identity, 'enroll', enrollmentId),
            otpAuthUrl: generateURI({ issuer: 'Sigil.IA', label: normalizedEmail, secret: totpSecret }),
            expiresInSeconds: 900,
        });
    } catch (error) {
        if (isDuplicateEmail(error)) {
            res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
            return;
        }
        console.error('Error al registrar administrador:', error);
        res.status(500).json({ error: 'Error en el servidor al crear la cuenta.' });
    }
};

export const completeAdminOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
    const adminId = req.admin?.id;
    const { nombre, telefono_corporativo, empresa, password, faceDescriptor,
        profilePhoto, privacyNoticeAccepted, termsAccepted, biometricConsent, marketingConsent } = req.body ?? {};

    if (!adminId || typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120) {
        res.status(400).json({ error: 'El nombre debe tener entre 2 y 120 caracteres.' });
        return;
    }
    if (typeof password !== 'string' || password.length < 12 || password.length > 128
        || !/\p{Ll}/u.test(password) || !/\p{Lu}/u.test(password) || !/\p{N}/u.test(password)) {
        res.status(400).json({ error: 'La nueva contraseña debe tener entre 12 y 128 caracteres e incluir mayúscula, minúscula y número.' });
        return;
    }
    if (!isFaceDescriptor(faceDescriptor) || privacyNoticeAccepted !== true || termsAccepted !== true || biometricConsent !== true) {
        res.status(400).json({ error: 'Completa el reconocimiento facial y acepta el Aviso de Privacidad, los Términos y el consentimiento biométrico.' });
        return;
    }
    if (profilePhoto !== undefined && profilePhoto !== null
        && (typeof profilePhoto !== 'string' || !profilePhoto.startsWith('data:image/') || profilePhoto.length > 1_500_000)) {
        res.status(400).json({ error: 'La foto de perfil no es válida o supera el tamaño permitido.' });
        return;
    }

    try {
        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `UPDATE admins
             SET nombre = $2,
                 telefono_corporativo = $3,
                 empresa = COALESCE(NULLIF($4, ''), empresa),
                 password = $5,
                 face_template_encrypted = $6,
                 profile_photo = COALESCE($7, profile_photo),
                 mfa_facial_status = TRUE,
                 first_login_required = FALSE,
                 mfa_nonce = NULL,
                 mfa_setup_expires_at = NULL,
                 updated_at = NOW()
             WHERE id = $1 AND first_login_required = TRUE AND account_status = 'active'
               AND totp_enabled = TRUE AND totp_secret_encrypted IS NOT NULL
             RETURNING id, nombre, email, telefono_corporativo, empresa, profile_photo` ,
            [adminId, nombre.trim(), typeof telefono_corporativo === 'string' ? telefono_corporativo.trim() : null,
                typeof empresa === 'string' ? empresa.trim() : '', passwordHash,
                encryptFaceData(JSON.stringify(faceDescriptor)),
                typeof profilePhoto === 'string' ? profilePhoto : null]
        );
        if (result.rowCount !== 1) {
            res.status(403).json({ error: 'La cuenta no está disponible para activación inicial.' });
            return;
        }
        const privacyDocument = await pool.query(
            `SELECT id FROM privacy_documents WHERE document_type = 'privacy_notice' AND version = $1 LIMIT 1`,
            [PRIVACY_NOTICE_VERSION]
        );
        const privacyDocumentId = privacyDocument.rows[0]?.id ?? null;
        await pool.query(
            `INSERT INTO privacy_consents (admin_id, document_id, consent_type, accepted, version, ip_address, user_agent)
             VALUES ($1, $2, 'privacy_notice', TRUE, $3, $4, $5),
                    ($1, $2, 'terms', TRUE, $3, $4, $5),
                    ($1, $2, 'biometric', TRUE, $3, $4, $5),
                    ($1, $2, 'marketing', $6, $3, $4, $5)`,
            [adminId, privacyDocumentId, PRIVACY_NOTICE_VERSION, req.ip ?? null, req.get('user-agent') ?? null, marketingConsent === true]
        );
        await writeAuditLog(req, {
            adminId,
            action: 'ADMIN_ONBOARDING_STARTED',
            resourceType: 'admin',
            resourceId: adminId,
            details: { privacyVersion: PRIVACY_NOTICE_VERSION, termsAccepted: true, marketingConsent: marketingConsent === true },
        });
        await writeAuditLog(req, {
            adminId,
            action: 'PRIVACY_NOTICE_ACCEPTED',
            resourceType: 'privacy_notice',
            resourceId: PRIVACY_NOTICE_VERSION,
            details: { version: PRIVACY_NOTICE_VERSION, stage: 'onboarding' },
        });
        await writeAuditLog(req, {
            adminId,
            action: 'TERMS_ACCEPTED',
            resourceType: 'terms',
            resourceId: PRIVACY_NOTICE_VERSION,
            details: { version: PRIVACY_NOTICE_VERSION, stage: 'onboarding' },
        });
        await writeAuditLog(req, {
            adminId,
            action: 'ADMIN_ONBOARDING_COMPLETED',
            resourceType: 'admin',
            resourceId: adminId,
            details: { mfa: ['password', 'totp', 'face'] },
        });
        const identity: AdminIdentity = {
            id: String(result.rows[0].id),
            email: String(result.rows[0].email),
            nombre: String(result.rows[0].nombre),
        };
        res.json({
            success: true,
            token: signToken(identity, 'access'),
            admin: result.rows[0],
            message: 'Registro completado. Tu identidad fue validada con contraseña, OTP y reconocimiento facial.',
        });
    } catch (error) {
        console.error('Error al completar la activación inicial:', error);
        res.status(500).json({ error: 'No fue posible activar la cuenta.' });
    }
};

export const verifyRegistrationTotp = async (req: AuthRequest, res: Response): Promise<void> => {
    const enrollmentId = req.admin?.enrollmentJti;
    const { otpCode } = req.body ?? {};
    if (!enrollmentId || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
        res.status(400).json({ error: 'Se requiere un código autenticador de seis dígitos.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT id, nombre, email, password, telefono_corporativo, empresa, profile_photo,
                    privacy_notice_version, privacy_notice_accepted, biometric_consent, marketing_consent,
                    face_template_encrypted, totp_secret_encrypted, failed_attempts, locked_until,
                    invitation_id, account_role
             FROM pending_admin_enrollments
             WHERE id = $1 AND expires_at > NOW()`,
            [enrollmentId]
        );
        const pending = result.rows[0];
        if (!pending) {
            res.status(401).json({ error: 'El registro pendiente expiró. Vuelve a crear la cuenta.' });
            return;
        }
        if (sendLockedResponse(res, pending.locked_until)) return;

        const secret = decryptFaceData(pending.totp_secret_encrypted);
        const verification = await verify({ secret, token: otpCode });
        if (!verification.valid || !('timeStep' in verification)) {
            await pool.query(
                `UPDATE pending_admin_enrollments
                 SET failed_attempts = failed_attempts + 1,
                     locked_until = CASE WHEN failed_attempts + 1 >= $2 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END
                 WHERE id = $1`,
                [enrollmentId, MFA_MAX_FAILURES]
            );
            res.status(401).json({ error: 'Código autenticador incorrecto.' });
            return;
        }

        const client = await pool.connect();
        let admin: Record<string, unknown>;
        try {
            await client.query('BEGIN');
            const inserted = await client.query(
                `INSERT INTO admins
                    (nombre, email, password, telefono_corporativo, empresa, profile_photo, account_role, face_template_encrypted,
                     totp_secret_encrypted, totp_enabled, totp_last_used_step, mfa_facial_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, TRUE)
                 RETURNING id, nombre, email, telefono_corporativo, empresa, profile_photo, mfa_facial_status`,
                [
                    pending.nombre,
                    pending.email,
                    pending.password,
                    pending.telefono_corporativo,
                    pending.empresa,
                    pending.profile_photo,
                    pending.account_role ?? 'admin',
                    pending.face_template_encrypted,
                    pending.totp_secret_encrypted,
                    verification.timeStep,
                ]
            );
            admin = inserted.rows[0];
            const invitationUsed = await client.query(
                `UPDATE admin_invitations
                 SET used_at = CURRENT_TIMESTAMP
                 WHERE id = $1 AND used_at IS NULL
                 RETURNING id`,
                [pending.invitation_id]
            );
            if (invitationUsed.rowCount !== 1) {
                throw new Error('La invitación ya fue utilizada o dejó de estar disponible.');
            }
            const privacyDocument = await client.query(
                `SELECT id FROM privacy_documents WHERE document_type = 'privacy_notice' AND version = $1 LIMIT 1`,
                [pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION],
            );
            const privacyDocumentId = privacyDocument.rows[0]?.id ?? null;
            const consentValues = [
                [admin.id, privacyDocumentId, 'privacy_notice', true, pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION],
                [admin.id, privacyDocumentId, 'terms', true, pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION],
                [admin.id, privacyDocumentId, 'biometric', true, pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION],
                [admin.id, privacyDocumentId, 'marketing', pending.marketing_consent === true, pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION],
            ];
            for (const [adminId, documentId, consentType, accepted, version] of consentValues) {
                await client.query(
                    `INSERT INTO privacy_consents (admin_id, document_id, consent_type, accepted, version, ip_address, user_agent)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [adminId, documentId, consentType, accepted, version, req.ip ?? null, req.get('user-agent') ?? null],
                );
            }
            await client.query(
                `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
                 VALUES ($1, 'ADMIN_REGISTERED', 'admin', $2, $3::jsonb, $4, $5)`,
                [admin.id, admin.id, JSON.stringify({ privacyVersion: pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION }), req.ip ?? null, req.get('user-agent') ?? null],
            );
            await client.query(
                `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
                 VALUES ($1, 'LOGIN_SUCCESS', 'admin', $2, $3::jsonb, $4, $5)`,
                [admin.id, admin.id, JSON.stringify({ method: 'totp', registration: true }), req.ip ?? null, req.get('user-agent') ?? null],
            );
            await client.query(
                `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
                 VALUES ($1, 'PRIVACY_NOTICE_ACCEPTED', 'privacy_notice', $2, $3::jsonb, $4, $5)`,
                [admin.id, pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION, JSON.stringify({ version: pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION }), req.ip ?? null, req.get('user-agent') ?? null],
            );
            await client.query(
                `INSERT INTO audit_logs (admin_id, action, resource_type, resource_id, details, ip_address, user_agent)
                 VALUES ($1, 'BIOMETRIC_CONSENT_ACCEPTED', 'privacy_consent', $2, $3::jsonb, $4, $5)`,
                [admin.id, admin.id, JSON.stringify({ version: pending.privacy_notice_version ?? PRIVACY_NOTICE_VERSION }), req.ip ?? null, req.get('user-agent') ?? null],
            );
            await client.query('DELETE FROM pending_admin_enrollments WHERE id = $1', [enrollmentId]);
            await client.query('COMMIT');
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

        const identity: AdminIdentity = {
            id: String(admin.id),
            email: String(admin.email),
            nombre: String(admin.nombre),
        };
        res.status(201).json({
            success: true,
            message: 'Cuenta creada. Inicia sesión con tu contraseña y el rostro o el código autenticador.',
            token: signToken(identity, 'access'),
            admin,
        });
    } catch (error) {
        if (isDuplicateEmail(error)) {
            res.status(409).json({ error: 'Ya existe una cuenta con ese correo.' });
            return;
        }
        console.error('Error al confirmar MFA del registro:', error);
        res.status(500).json({ error: 'Error al confirmar el segundo factor.' });
    }
};

export const loginStepOne = async (req: Request, res: Response): Promise<void> => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
        res.status(400).json({ error: 'El correo y la contraseña son obligatorios.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT id, nombre, email, password, face_template_encrypted, totp_secret_encrypted,
                    totp_enabled, mfa_facial_status, mfa_locked_until, account_status,
                    first_login_required
             FROM admins WHERE email = $1`,
            [email.trim().toLowerCase()]
        );
        const admin = result.rows[0];
        if (admin && ['cancelled', 'blocked'].includes(admin.account_status)) {
            await writeAuditLog(req, {
                adminId: admin.id,
                action: 'LOGIN_BLOCKED_CANCELLED',
                resourceType: 'admin',
                resourceId: admin.id,
                details: { reason: 'account_cancelled' },
                success: false,
                failureReason: 'account_cancelled',
            });
            res.status(403).json({ error: 'Esta cuenta fue dada de baja y no puede iniciar sesión.' });
            return;
        }

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            const recorded = await writeAuditLog(req, {
                action: 'LOGIN_FAILED',
                details: { email: email.trim().toLowerCase() },
                success: false,
                failureReason: 'invalid_credentials',
            });
            if (!recorded) {
                res.status(503).json({ error: 'No fue posible registrar el intento de acceso.' });
                return;
            }
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }
        if (sendLockedResponse(res, admin.mfa_locked_until)) return;

        const identity = identityFromRow(admin);
        const mfaJti = randomUUID();
        const recorded = await writeAuditLog(req, {
            adminId: admin.id,
            action: 'LOGIN_CREDENTIALS_VERIFIED',
            resourceType: 'admin',
            resourceId: admin.id,
        });
        if (!recorded) {
            res.status(503).json({ error: 'No fue posible registrar el intento de acceso.' });
            return;
        }

        if (admin.first_login_required) {
            const totpSecret = generateSecret();
            await pool.query(
                `UPDATE admins
                 SET totp_secret_encrypted = $1, totp_enabled = FALSE,
                     mfa_nonce = $2, mfa_setup_expires_at = NOW() + INTERVAL '15 minutes',
                     totp_last_used_step = NULL, mfa_failed_attempts = 0,
                     mfa_locked_until = NULL
                 WHERE id = $3 AND first_login_required = TRUE`,
                [encryptFaceData(totpSecret), mfaJti, identity.id]
            );
            res.json({
                success: true,
                enrollmentRequired: true,
                onboardingAfterMfa: true,
                message: 'Credenciales verificadas. Escanea el QR con Microsoft Authenticator y confirma tu código OTP para continuar con el registro.',
                setupToken: signToken(identity, 'setup', mfaJti),
                otpAuthUrl: generateURI({ issuer: 'Sigilia', label: admin.email, secret: totpSecret }),
                expiresInSeconds: 900,
                admin: { id: admin.id, nombre: admin.nombre, email: admin.email, empresa: admin.empresa },
            });
            return;
        }

        if (!admin.totp_enabled || !admin.totp_secret_encrypted) {
            const totpSecret = generateSecret();
            await pool.query(
                `UPDATE admins
                 SET totp_secret_encrypted = $1, mfa_nonce = $2,
                     mfa_setup_expires_at = NOW() + INTERVAL '15 minutes',
                     totp_last_used_step = NULL,
                     mfa_failed_attempts = 0, mfa_locked_until = NULL
                 WHERE id = $3`,
                [encryptFaceData(totpSecret), mfaJti, identity.id]
            );
            res.json({
                success: true,
                enrollmentRequired: true,
                message: 'Configura una aplicación autenticadora para activar MFA; puedes enrolar tu rostro ahora o usar TOTP.',
                setupToken: signToken(identity, 'setup', mfaJti),
                otpAuthUrl: generateURI({ issuer: 'Sigil.IA', label: admin.email, secret: totpSecret }),
                expiresInSeconds: 900,
                admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
            });
            return;
        }

        await pool.query(
            `UPDATE admins SET mfa_nonce = $1, mfa_setup_expires_at = NULL,
                    mfa_failed_attempts = 0, mfa_locked_until = NULL
             WHERE id = $2`,
            [mfaJti, identity.id]
        );
        res.json({
            success: true,
            message: 'Credenciales correctas. Completa el segundo factor.',
            adminId: admin.id,
            facialMfaEnabled: Boolean(admin.mfa_facial_status && admin.face_template_encrypted),
            mfaToken: signToken(identity, 'mfa', mfaJti),
            admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
        });
    } catch (error) {
        console.error('Error al iniciar sesión:', error);
        res.status(500).json({ error: 'Error en el servidor al procesar el inicio de sesión.' });
    }
};

export const completeMfaSetup = async (req: AuthRequest, res: Response): Promise<void> => {
    const setupJti = req.admin?.setupJti;
    const { otpCode, faceDescriptor } = req.body ?? {};
    if (!setupJti || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)
        || (faceDescriptor !== undefined && !isFaceDescriptor(faceDescriptor))) {
        res.status(400).json({ error: 'Se requiere un código autenticador válido y, opcionalmente, un descriptor facial válido.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT id, nombre, email, totp_secret_encrypted, mfa_nonce, mfa_setup_expires_at,
                    mfa_locked_until, first_login_required
             FROM admins WHERE id = $1`,
            [req.admin?.id]
        );
        const admin = result.rows[0];
        if (!admin || admin.mfa_nonce !== setupJti
            || !admin.mfa_setup_expires_at || new Date(admin.mfa_setup_expires_at).getTime() <= Date.now()) {
            res.status(401).json({ error: 'La configuración MFA expiró. Inicia sesión de nuevo.' });
            return;
        }
        if (sendLockedResponse(res, admin.mfa_locked_until)) return;
        const onboardingRequired = Boolean(admin.first_login_required);

        const secret = decryptFaceData(admin.totp_secret_encrypted);
        const verification = await verify({ secret, token: otpCode });
        if (!verification.valid || !('timeStep' in verification)) {
            await recordMfaFailure(String(admin.id), setupJti);
            res.status(401).json({ error: 'Código autenticador incorrecto.' });
            return;
        }

        const faceEncrypted = isFaceDescriptor(faceDescriptor)
            ? encryptFaceData(JSON.stringify(faceDescriptor))
            : null;
        const updated = await pool.query(
            `UPDATE admins
             SET totp_enabled = TRUE, mfa_facial_status = $3, face_template_encrypted = $4,
                 totp_last_used_step = $5, mfa_nonce = NULL, mfa_setup_expires_at = NULL,
                 mfa_failed_attempts = 0, mfa_locked_until = NULL,
                 first_login_required = CASE WHEN first_login_required THEN TRUE ELSE FALSE END,
                 temporary_password_expires_at = NULL, updated_at = NOW()
             WHERE id = $1 AND mfa_nonce = $2 AND totp_enabled = FALSE
               AND mfa_setup_expires_at > NOW()
               AND (totp_last_used_step IS NULL OR totp_last_used_step < $5)
             RETURNING id, nombre, email`,
            [admin.id, setupJti, Boolean(faceEncrypted), faceEncrypted, verification.timeStep]
        );
        if (updated.rowCount !== 1) {
            res.status(401).json({ error: 'La configuración MFA ya fue usada o expiró.' });
            return;
        }

        const recorded = await writeAuditLog(req, {
            adminId: admin.id,
            action: 'LOGIN_SUCCESS',
            resourceType: 'admin',
            resourceId: admin.id,
            details: { method: 'totp', initialSetup: true },
        });
        if (!recorded) {
            res.status(503).json({ error: 'No fue posible registrar el inicio de sesión.' });
            return;
        }

        const identity = identityFromRow(updated.rows[0]);
        if (onboardingRequired) {
            res.json({
                success: true,
                onboardingRequired: true,
                onboardingToken: signToken(identity, 'onboarding', randomUUID()),
                admin: updated.rows[0],
                message: 'OTP verificado. Completa ahora tu registro y valida tu identidad con reconocimiento facial.',
            });
            return;
        }

        res.json({
            success: true,
            message: faceEncrypted
                ? 'MFA activado con reconocimiento facial y TOTP alternativo.'
                : 'MFA activado con TOTP. Puedes usar el código autenticador como segundo factor.',
            token: signToken(identity, 'access'),
            admin: updated.rows[0],
        });
    } catch (error) {
        console.error('Error al completar configuración MFA:', error);
        res.status(500).json({ error: 'Error al configurar el segundo factor.' });
    }
};

export const verifyFacialMfa = async (req: AuthRequest, res: Response): Promise<void> => {
    const submittedDescriptor: unknown = req.body?.faceDescriptor;
    const profilePhoto: unknown = req.body?.profilePhoto;
    const admin = req.admin;

    if (!admin?.mfaJti) {
        res.status(401).json({ error: 'Sesión de verificación requerida.' });
        return;
    }
    if (!isFaceDescriptor(submittedDescriptor)) {
        res.status(400).json({ error: 'El descriptor facial debe contener 1024 valores numéricos válidos.' });
        return;
    }
    if (profilePhoto !== undefined && profilePhoto !== null
        && (typeof profilePhoto !== 'string' || !profilePhoto.startsWith('data:image/') || profilePhoto.length > 1_500_000)) {
        res.status(400).json({ error: 'La foto de perfil no es válida o supera el tamaño permitido.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT face_template_encrypted, mfa_nonce, mfa_facial_status, mfa_locked_until
             FROM admins WHERE id = $1`,
            [admin.id]
        );
        const enrolledAdmin = result.rows[0];
        if (!enrolledAdmin || enrolledAdmin.mfa_nonce !== admin.mfaJti) {
            res.status(401).json({ error: 'La sesión MFA ya fue usada o expiró.' });
            return;
        }
        if (sendLockedResponse(res, enrolledAdmin.mfa_locked_until)) return;
        if (!enrolledAdmin.mfa_facial_status || !enrolledAdmin.face_template_encrypted) {
            res.status(403).json({ error: 'Esta cuenta no tiene reconocimiento facial enrolado. Usa el código autenticador.' });
            return;
        }

        const enrolledDescriptor: unknown = JSON.parse(decryptFaceData(enrolledAdmin.face_template_encrypted));
        if (!isFaceDescriptor(enrolledDescriptor)) {
            throw new Error('Stored face descriptor has an invalid format.');
        }
        if (faceSimilarity(enrolledDescriptor, submittedDescriptor) < FACE_MATCH_THRESHOLD) {
            await recordMfaFailure(admin.id, admin.mfaJti);
            res.status(401).json({ error: 'La verificación facial no fue aceptada. Intenta de nuevo o usa TOTP.' });
            return;
        }

        if (!(await consumeMfaSession(admin.id, admin.mfaJti))) {
            res.status(401).json({ error: 'La sesión MFA ya fue usada, expiró o está bloqueada.' });
            return;
        }
        if (typeof profilePhoto === 'string') {
            await pool.query(
                'UPDATE admins SET profile_photo = $1, updated_at = NOW() WHERE id = $2',
                [profilePhoto, admin.id]
            );
        }
        const recorded = await writeAuditLog(req, {
            adminId: admin.id,
            action: 'LOGIN_SUCCESS',
            resourceType: 'admin',
            resourceId: admin.id,
            details: { method: 'facial' },
        });
        if (!recorded) {
            res.status(503).json({ error: 'No fue posible registrar el inicio de sesión.' });
            return;
        }
        res.json({
            success: true,
            message: 'Reconocimiento facial verificado.',
            token: signToken(admin, 'access'),
            admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
        });
    } catch (error) {
        console.error('Error en la verificación facial:', error);
        res.status(500).json({ error: 'Error al verificar el reconocimiento facial.' });
    }
};

export const verifyTotpMfa = async (req: AuthRequest, res: Response): Promise<void> => {
    const admin = req.admin;
    const { otpCode } = req.body ?? {};
    if (!admin?.mfaJti) {
        res.status(401).json({ error: 'Sesión de verificación requerida.' });
        return;
    }
    if (typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
        res.status(400).json({ error: 'El código autenticador debe tener seis dígitos.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT totp_secret_encrypted, mfa_nonce, mfa_locked_until
             FROM admins WHERE id = $1`,
            [admin.id]
        );
        const enrolledAdmin = result.rows[0];
        if (!enrolledAdmin || enrolledAdmin.mfa_nonce !== admin.mfaJti) {
            res.status(401).json({ error: 'La sesión MFA ya fue usada o expiró.' });
            return;
        }
        if (sendLockedResponse(res, enrolledAdmin.mfa_locked_until)) return;
        if (!enrolledAdmin.totp_secret_encrypted) {
            res.status(409).json({ error: 'La cuenta no tiene una aplicación autenticadora enrolada.' });
            return;
        }

        const secret = decryptFaceData(enrolledAdmin.totp_secret_encrypted);
        const verification = await verify({ secret, token: otpCode });
        if (!verification.valid || !('timeStep' in verification)) {
            await recordMfaFailure(admin.id, admin.mfaJti);
            res.status(401).json({ error: 'Código autenticador incorrecto.' });
            return;
        }

        if (!(await consumeMfaSession(admin.id, admin.mfaJti, verification.timeStep))) {
            await recordMfaFailure(admin.id, admin.mfaJti);
            res.status(401).json({ error: 'El código autenticador ya fue utilizado o la sesión MFA expiró.' });
            return;
        }
        const recorded = await writeAuditLog(req, {
            adminId: admin.id,
            action: 'LOGIN_SUCCESS',
            resourceType: 'admin',
            resourceId: admin.id,
            details: { method: 'totp' },
        });
        if (!recorded) {
            res.status(503).json({ error: 'No fue posible registrar el inicio de sesión.' });
            return;
        }
        res.json({
            success: true,
            message: 'Código autenticador verificado.',
            token: signToken(admin, 'access'),
            admin: { id: admin.id, nombre: admin.nombre, email: admin.email },
        });
    } catch (error) {
        console.error('Error al verificar TOTP:', error);
        res.status(500).json({ error: 'Error al verificar el código autenticador.' });
    }
};

const passwordResetHash = (token: string) => createHash('sha256').update(token).digest('hex');
const validPassword = (password: unknown): password is string =>
    typeof password === 'string' && password.length >= 12 && password.length <= 128
    && /\p{Lu}/u.test(password) && /\p{Ll}/u.test(password) && /\p{N}/u.test(password);

async function recordPasswordResetTotpFailure(client: PoolClient, adminId: string | number): Promise<void> {
    await client.query(
        `UPDATE admins
         SET mfa_failed_attempts = mfa_failed_attempts + 1,
             mfa_locked_until = CASE
                 WHEN mfa_failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes'
                 ELSE mfa_locked_until
             END,
             mfa_nonce = CASE WHEN mfa_failed_attempts + 1 >= 5 THEN NULL ELSE mfa_nonce END,
             mfa_setup_expires_at = CASE WHEN mfa_failed_attempts + 1 >= 5 THEN NULL ELSE mfa_setup_expires_at END
         WHERE id = $1`,
        [adminId]
    );
}

export const requestPasswordReset = async (req: Request, res: Response): Promise<void> => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const genericMessage = 'Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.';
    try {
        await ensurePasswordResetSchema();
        const result = await pool.query('SELECT id, nombre, email FROM admins WHERE LOWER(email) = $1 LIMIT 1', [email]);
        const admin = result.rows[0];
        if (admin && process.env.RESEND_API_KEY) {
            const rawToken = randomBytes(32).toString('hex');
            await pool.query('DELETE FROM password_reset_tokens WHERE admin_id = $1 OR expires_at < CURRENT_TIMESTAMP', [admin.id]);
            await pool.query(
                `INSERT INTO password_reset_tokens (token_hash, admin_id, expires_at)
                 VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '15 minutes')`,
                [passwordResetHash(rawToken), admin.id]
            );
            const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
            const resetUrl = `${frontendUrl}/login?reset_token=${rawToken}`;
            const emailResponse = await fetch('https://api.resend.com/emails', {
                method: 'POST',
                headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    from: process.env.RESEND_FROM ?? 'onboarding@resend.dev',
                    to: [admin.email],
                    subject: 'Restablece tu contraseña de Sigil.IA',
                    html: `<p>Hola ${String(admin.nombre).replace(/[&<>"']/g, '')},</p><p>Usa este enlace para crear una nueva contraseña. Expira en 15 minutos.</p><p><a href="${resetUrl}">Restablecer contraseña</a></p>`,
                }),
            });
            if (!emailResponse.ok) console.error('Resend password reset failed:', await emailResponse.text());
        } else if (admin) {
            console.error('Password reset email was not sent: RESEND_API_KEY is not configured in servidor/.env');
        }
        res.json({ success: true, message: genericMessage });
    } catch (error) {
        console.error('Password reset request failed:', error);
        res.json({ success: true, message: genericMessage });
    }
};

export const verifyPasswordResetTotp = async (req: Request, res: Response): Promise<void> => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const otpCode = typeof req.body?.otpCode === 'string' ? req.body.otpCode : '';
    const invalidCodeMessage = 'No fue posible verificar el código. Revisa el correo y el código autenticador.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^\d{6}$/.test(otpCode)) {
        res.status(400).json({ error: invalidCodeMessage });
        return;
    }

    let client: PoolClient | undefined;
    try {
        await ensurePasswordResetSchema();
        client = await pool.connect();
        await client.query('BEGIN');
        const result = await client.query(
            `SELECT id, totp_secret_encrypted, totp_enabled, totp_last_used_step,
                    mfa_failed_attempts, mfa_locked_until
             FROM admins WHERE LOWER(email) = $1 FOR UPDATE`,
            [email]
        );
        const admin = result.rows[0];
        if (!admin || !admin.totp_enabled || !admin.totp_secret_encrypted) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: invalidCodeMessage });
            return;
        }
        if (sendLockedResponse(res, admin.mfa_locked_until)) {
            await client.query('ROLLBACK');
            return;
        }

        const secret = decryptFaceData(admin.totp_secret_encrypted);
        const verification = await verify({ secret, token: otpCode });
        if (!verification.valid || !('timeStep' in verification)) {
            await recordPasswordResetTotpFailure(client, admin.id);
            await client.query('COMMIT');
            res.status(400).json({ error: invalidCodeMessage });
            return;
        }
        const currentStep = BigInt(verification.timeStep);

        const rawToken = randomBytes(32).toString('hex');
        await client.query(
            'DELETE FROM password_reset_tokens WHERE expires_at <= CURRENT_TIMESTAMP'
        );
        await client.query(
            `INSERT INTO password_reset_tokens (token_hash, admin_id, expires_at)
             VALUES ($1, $2, CURRENT_TIMESTAMP + INTERVAL '5 minutes')`,
            [passwordResetHash(rawToken), admin.id]
        );
        await client.query(
            `UPDATE admins
             SET totp_last_used_step = $2, mfa_failed_attempts = 0, mfa_locked_until = NULL
             WHERE id = $1`,
            [admin.id, currentStep.toString()]
        );
        await client.query('COMMIT');
        res.json({
            success: true,
            resetToken: rawToken,
            expiresInSeconds: 300,
            message: 'Código verificado. Ahora puedes crear una nueva contraseña.',
        });
    } catch (error) {
        if (client) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Password reset TOTP rollback failed:', rollbackError);
            }
        }
        console.error('Password reset TOTP verification failed:', error);
        res.status(500).json({ error: 'No fue posible verificar el código autenticador.' });
    } finally {
        client?.release();
    }
};

export const resetPassword = async (req: Request, res: Response): Promise<void> => {
    const token = typeof req.body?.token === 'string' ? req.body.token : '';
    const password = req.body?.password;
    if (!token) {
        res.status(400).json({ error: 'El enlace de restablecimiento no es válido o ya expiró.' });
        return;
    }
    if (!validPassword(password)) {
        res.status(400).json({ error: 'La contraseña debe tener entre 12 y 128 caracteres, con mayúsculas, minúsculas y números.' });
        return;
    }
    let client: PoolClient | undefined;
    try {
        await ensurePasswordResetSchema();
        client = await pool.connect();
        await client.query('BEGIN');
        const tokenResult = await client.query(
            `SELECT admin_id FROM password_reset_tokens
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP FOR UPDATE`,
            [passwordResetHash(token)]
        );
        const reset = tokenResult.rows[0];
        if (!reset) {
            await client.query('ROLLBACK');
            res.status(400).json({ error: 'El enlace no es válido o ya expiró.' });
            return;
        }
        const passwordHash = await bcrypt.hash(password, 12);
        await client.query(
            `UPDATE admins
             SET password = $1, mfa_nonce = NULL, mfa_setup_expires_at = NULL,
                 mfa_failed_attempts = 0, mfa_locked_until = NULL, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [passwordHash, reset.admin_id]
        );
        await insertAuditLog(client, req, {
            adminId: reset.admin_id,
            action: 'PASSWORD_RESET_COMPLETED',
            resourceType: 'admin',
            resourceId: reset.admin_id,
            details: { method: 'totp' },
        });
        await client.query('DELETE FROM password_reset_tokens WHERE admin_id = $1', [reset.admin_id]);
        await client.query('COMMIT');
        res.json({ success: true, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' });
    } catch (error) {
        await client?.query('ROLLBACK');
        console.error('Password reset failed:', error);
        res.status(500).json({ error: 'No fue posible actualizar la contraseña.' });
    } finally {
        client?.release();
    }
};
