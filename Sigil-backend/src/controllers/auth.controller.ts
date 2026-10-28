import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { generateSecret, generateURI, verify } from 'otplib';
import { pool } from '../config/db';
import { jwtSecret } from '../config/auth';
import { decryptFaceData, encryptFaceData } from '../security/face-data';
import type { AuthRequest } from '../middleware/auth.middleware';
import jwt from 'jsonwebtoken';

const FACE_DESCRIPTOR_LENGTH = 1024;
const FACE_MATCH_THRESHOLD = 0.5;
const MFA_MAX_FAILURES = 5;

type FaceDescriptor = number[];
type AdminIdentity = { id: string; email: string; nombre: string };
type TokenPurpose = 'access' | 'mfa' | 'enroll' | 'setup';

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
               AND (mfa_locked_until IS NULL OR mfa_locked_until <= NOW())
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
           AND (mfa_locked_until IS NULL OR mfa_locked_until <= NOW())
         RETURNING id`,
        [adminId, jti]
    );
    return result.rowCount === 1;
}

function sendLockedResponse(res: Response, lockedUntil: Date | string | null): boolean {
    if (!lockedUntil || new Date(lockedUntil).getTime() <= Date.now()) return false;
    res.status(429).json({ error: 'Demasiados intentos de MFA. Inicia sesión de nuevo más tarde.' });
    return true;
}

function isDuplicateEmail(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

export const registerAdmin = async (req: Request, res: Response): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
        res.status(403).json({ error: 'El registro público está deshabilitado en producción.' });
        return;
    }

    const { nombre, email, password, telefono_corporativo, empresa, faceDescriptor } = req.body ?? {};
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 120
        || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
        || typeof password !== 'string' || password.length < 12 || password.length > 128
        || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)
        || !isFaceDescriptor(faceDescriptor)) {
        res.status(400).json({
            error: 'Revisa nombre, correo, contraseña (12 caracteres con mayúscula, minúscula y número) y el descriptor facial.',
        });
        return;
    }

    try {
        await pool.query('DELETE FROM pending_admin_enrollments WHERE expires_at <= NOW()');
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
                (id, nombre, email, password, telefono_corporativo, empresa,
                 face_template_encrypted, totp_secret_encrypted, expires_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '15 minutes')
             RETURNING email`,
            [
                enrollmentId,
                nombre.trim(),
                normalizedEmail,
                passwordHash,
                typeof telefono_corporativo === 'string' ? telefono_corporativo.trim() : null,
                typeof empresa === 'string' ? empresa.trim() : null,
                encryptFaceData(JSON.stringify(faceDescriptor)),
                encryptFaceData(totpSecret),
            ]
        );

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

export const verifyRegistrationTotp = async (req: AuthRequest, res: Response): Promise<void> => {
    const enrollmentId = req.admin?.enrollmentJti;
    const { otpCode } = req.body ?? {};
    if (!enrollmentId || typeof otpCode !== 'string' || !/^\d{6}$/.test(otpCode)) {
        res.status(400).json({ error: 'Se requiere un código autenticador de seis dígitos.' });
        return;
    }

    try {
        const result = await pool.query(
            `SELECT id, nombre, email, password, telefono_corporativo, empresa,
                    face_template_encrypted, totp_secret_encrypted, failed_attempts, locked_until
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
                    (nombre, email, password, telefono_corporativo, empresa, face_template_encrypted,
                     totp_secret_encrypted, totp_enabled, totp_last_used_step, mfa_facial_status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, TRUE)
                 RETURNING id, nombre, email, telefono_corporativo, empresa, mfa_facial_status`,
                [
                    pending.nombre,
                    pending.email,
                    pending.password,
                    pending.telefono_corporativo,
                    pending.empresa,
                    pending.face_template_encrypted,
                    pending.totp_secret_encrypted,
                    verification.timeStep,
                ]
            );
            await client.query('DELETE FROM pending_admin_enrollments WHERE id = $1', [enrollmentId]);
            await client.query('COMMIT');
            admin = inserted.rows[0];
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
                    totp_enabled, mfa_facial_status, mfa_locked_until
             FROM admins WHERE email = $1`,
            [email.trim().toLowerCase()]
        );
        const admin = result.rows[0];

        if (!admin || !(await bcrypt.compare(password, admin.password))) {
            res.status(401).json({ error: 'Credenciales inválidas.' });
            return;
        }
        if (sendLockedResponse(res, admin.mfa_locked_until)) return;

        const identity = identityFromRow(admin);
        const mfaJti = randomUUID();

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
                    mfa_locked_until
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
                 mfa_failed_attempts = 0, mfa_locked_until = NULL, updated_at = NOW()
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

        const identity = identityFromRow(updated.rows[0]);
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
    const admin = req.admin;

    if (!admin?.mfaJti) {
        res.status(401).json({ error: 'Sesión de verificación requerida.' });
        return;
    }
    if (!isFaceDescriptor(submittedDescriptor)) {
        res.status(400).json({ error: 'El descriptor facial debe contener 1024 valores numéricos válidos.' });
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
