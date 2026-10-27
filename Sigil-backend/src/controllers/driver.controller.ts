
import { Request, Response } from 'express';
import { pool } from '../config/db';

// CREATE: Registrar un nuevo conductor
export const createDriver = async (req: Request, res: Response): Promise<void> => {
    try {
        const { nombre, email, telefono, estatus_operativo, vehicle_id } = req.body;
        const query = `
            INSERT INTO drivers (nombre, email, telefono, estatus_operativo, vehicle_id)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *;
        `;
        const values = [nombre, email, telefono, estatus_operativo || 'En ruta', vehicle_id];
        const newDriver = await pool.query(query, values);
        
        res.status(201).json(newDriver.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el conductor' });
    }
};

// READ: Obtener todos los conductores con sus vehículos asignados
export const getDrivers = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT d.*, v.numero_flota, v.modelo, v.placas, v.hardware_id 
            FROM drivers d
            LEFT JOIN vehicles v ON d.vehicle_id = v.id;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los conductores' });
    }
};

// UPDATE: Actualizar información del conductor
export const updateDriver = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { nombre, email, telefono, estatus_operativo, vehicle_id } = req.body;
        
        const query = `
            UPDATE drivers 
            SET nombre = COALESCE($1, nombre),
                email = COALESCE($2, email),
                telefono = COALESCE($3, telefono),
                estatus_operativo = COALESCE($4, estatus_operativo),
                vehicle_id = COALESCE($5, vehicle_id)
            WHERE id = $6
            RETURNING *;
        `;
        const values = [nombre, email, telefono, estatus_operativo, vehicle_id, id];
        const updated = await pool.query(query, values);

        if (updated.rows.length === 0) {
            res.status(404).json({ error: 'Conductor no encontrado' });
            return;
        }

        res.json(updated.rows[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el conductor' });
    }
};

// DELETE: Eliminar un conductor
export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *;', [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Conductor no encontrado' });
            return;
        }

        res.json({ message: 'Conductor eliminado correctamente' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el conductor' });
    }
};