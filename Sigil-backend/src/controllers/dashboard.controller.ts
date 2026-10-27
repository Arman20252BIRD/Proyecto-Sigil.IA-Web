
import { Request, Response } from 'express';
import { pool } from '../config/db';

// Obtener Dashboard de Eventos e Incidentes
export const getEventsDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT e.*, d.nombre AS conductor_nombre, v.numero_flota 
            FROM events e
            JOIN drivers d ON e.driver_id = d.id
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
            ORDER BY e.created_at DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de eventos' });
    }
};

// Obtener Rastreo GPS en Tiempo Real de las Unidades
export const getGpsTracking = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT DISTINCT ON (gt.vehicle_id) gt.*, v.numero_flota, v.placas, d.nombre AS conductor_nombre
            FROM gps_tracks gt
            JOIN vehicles v ON gt.vehicle_id = v.id
            LEFT JOIN drivers d ON v.id = d.vehicle_id
            ORDER BY gt.vehicle_id, gt.timestamp DESC;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la geolocalización satelital' });
    }
};