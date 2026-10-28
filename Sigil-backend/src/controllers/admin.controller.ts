
import { Response } from 'express';
import { pool } from '../config/db';
import type { AuthRequest } from '../middleware/auth.middleware';

// Obtener Perfil del Administrador
export const getAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        if (id !== req.admin?.id) {
            res.status(403).json({ error: 'No puedes consultar otro perfil de administrador.' });
            return;
        }
        const query = 'SELECT id, nombre, email, telefono_corporativo, empresa, mfa_facial_status, updated_at FROM admins WHERE id = $1';
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Administrador no encontrado' });
            return;
        }

        res.json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el perfil del administrador' });
    }
};

// Actualizar Credenciales y Perfil del Administrador
export const updateAdminProfile = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, email, telefono_corporativo } = req.body;

        if (id !== req.admin?.id) {
            res.status(403).json({ error: 'No puedes modificar otro perfil de administrador.' });
            return;
        }

        const query = `
            UPDATE admins
            SET nombre = COALESCE($1, nombre),
                email = COALESCE($2, email),
                telefono_corporativo = COALESCE($3, telefono_corporativo),
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $4
            RETURNING id, nombre, email, telefono_corporativo, mfa_facial_status, updated_at;
        `;

        const values = [nombre, email, telefono_corporativo, id];
        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Administrador no encontrado' });
            return;
        }

        res.json({ message: 'Perfil actualizado correctamente', admin: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el perfil' });
    }
};