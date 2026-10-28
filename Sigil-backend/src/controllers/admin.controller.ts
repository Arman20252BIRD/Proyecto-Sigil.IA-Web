
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { pool } from '../config/db';
import type { AuthRequest } from '../middleware/auth.middleware';

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
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Administrador no encontrado' });
            return;
        }

        res.json({ message: 'Perfil actualizado correctamente', admin: result.rows[0] });
    } catch (error) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
            res.status(409).json({ error: 'Ese correo ya está asociado a otra cuenta.' });
            return;
        }
        console.error('Error al actualizar el perfil del administrador:', error);
        res.status(500).json({ error: 'No se pudo actualizar el perfil.' });
    }
};
