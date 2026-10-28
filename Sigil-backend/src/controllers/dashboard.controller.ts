
import { Request, Response } from 'express';
import { pool } from '../config/db';

type DeviceEventInput = {
    hardware_id?: string;
    numero_flota?: string;
    event_type?: string;
    severity?: string;
    message?: string;
    occurred_at?: string;
};

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

export const ingestDeviceEvent = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as DeviceEventInput;
    const hardwareId = typeof body?.hardware_id === 'string' ? body.hardware_id.trim() : '';
    const fleetNumber = typeof body?.numero_flota === 'string' ? body.numero_flota.trim() : '';
    const eventType = typeof body?.event_type === 'string' && body.event_type.trim() ? body.event_type.trim().slice(0, 80) : 'alert';
    const severity = typeof body?.severity === 'string' && body.severity.trim() ? body.severity.trim().slice(0, 20) : 'warning';
    const message = typeof body?.message === 'string' ? body.message.trim().slice(0, 500) : null;
    const occurredAt = typeof body?.occurred_at === 'string' && !Number.isNaN(Date.parse(body.occurred_at))
        ? body.occurred_at
        : null;

    if (!hardwareId && !fleetNumber) {
        res.status(400).json({ error: 'Indica hardware_id o numero_flota.' });
        return;
    }

    try {
        const driver = await pool.query(
            `SELECT d.id, v.hardware_id, v.numero_flota
             FROM drivers d
             JOIN vehicles v ON v.id = d.vehicle_id
             WHERE ($1 <> '' AND v.hardware_id = $1) OR ($2 <> '' AND v.numero_flota = $2)
             ORDER BY d.id LIMIT 1`,
            [hardwareId, fleetNumber],
        );
        if (driver.rows.length === 0) {
            res.status(404).json({ error: 'No hay un conductor asociado a ese dispositivo.' });
            return;
        }
        const inserted = await pool.query(
            `INSERT INTO events (driver_id, created_at, event_type, severity, message, source, hardware_id)
             VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, 'esp32', $6)
             RETURNING *`,
            [driver.rows[0].id, occurredAt, eventType, severity, message, driver.rows[0].hardware_id],
        );
        res.status(201).json({ success: true, event: inserted.rows[0] });
    } catch (error) {
        console.error('Error al ingerir evento del dispositivo:', error);
        res.status(500).json({ error: 'No se pudo registrar el evento del dispositivo.' });
    }
};
