
import { Request, Response } from 'express';
import { pool } from '../models/db';
import type { AuthRequest } from '../middleware/auth.middleware';

type DeviceEventInput = {
    hardware_id?: string;
    numero_flota?: string;
    event_type?: string;
    severity?: string;
    message?: string;
    occurred_at?: string;
};

type Coordinate = { latitude: number; longitude: number };

function parseCoordinates(value: unknown): Coordinate | null {
    if (typeof value === 'string') {
        const [latitude, longitude] = value.split(',').map(Number);
        return Number.isFinite(latitude) && Number.isFinite(longitude)
            ? { latitude, longitude }
            : null;
    }
    if (typeof value !== 'object' || value === null) return null;
    const record = value as Record<string, unknown>;
    const latitude = Number(record.latitude ?? record.lat);
    const longitude = Number(record.longitude ?? record.lng ?? record.lon);
    return Number.isFinite(latitude) && Number.isFinite(longitude)
        ? { latitude, longitude }
        : null;
}

async function geocodeDestination(destination: string): Promise<{ coordinates: Coordinate; address: string }> {
    const coordinates = parseCoordinates(destination);
    if (coordinates) return { coordinates, address: destination };

    const query = new URLSearchParams({
        format: 'jsonv2',
        limit: '1',
        addressdetails: '1',
        'accept-language': 'es-MX',
        countrycodes: 'mx',
        viewbox: '-89.75,21.10,-89.45,20.75',
        q: destination,
    });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${query.toString()}`, {
        headers: {
            Accept: 'application/json',
            'User-Agent': process.env.OSM_USER_AGENT?.trim() || 'Sigilia/1.0 (vehicle monitoring dashboard)',
        },
    });
    if (!response.ok) {
        throw new Error('El buscador de OpenStreetMap no está disponible en este momento.');
    }
    const result = await response.json() as Array<{ lat?: string; lon?: string; display_name?: string }>;
    const location = result[0];
    const latitude = Number(location?.lat);
    const longitude = Number(location?.lon);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        throw new Error('No se pudo localizar el destino en OpenStreetMap.');
    }
    return {
        coordinates: { latitude, longitude },
        address: location?.display_name || destination,
    };
}

export const getBestRoute = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.admin?.id) {
        res.status(401).json({ error: 'La sesión de administrador no es válida.' });
        return;
    }
    const body = req.body as { origin?: unknown; destination?: unknown };
    const origin = parseCoordinates(body?.origin);
    const destination = typeof body?.destination === 'string' ? body.destination.trim() : '';
    if (!origin || !destination) {
        res.status(400).json({ error: 'Indica el origen y un destino válido.' });
        return;
    }

    try {
        const target = await geocodeDestination(destination);
        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${target.coordinates.longitude},${target.coordinates.latitude}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const response = await fetch(routeUrl, {
            headers: {
                Accept: 'application/json',
                'User-Agent': process.env.OSM_USER_AGENT?.trim() || 'Sigilia/1.0 (vehicle monitoring dashboard)',
            },
        });
        const result = await response.json() as {
            code?: string;
            message?: string;
            routes?: Array<{
                distance?: number;
                duration?: number;
                geometry?: { coordinates?: Array<[number, number]> };
                legs?: Array<{ summary?: string }>;
            }>;
        };
        if (!response.ok || result.code !== 'Ok' || !result.routes?.length) {
            res.status(502).json({ error: result.message || 'OpenStreetMap no devolvió una ruta disponible.' });
            return;
        }
        const [bestRoute, ...alternatives] = result.routes;
        const seconds = Math.max(0, Math.round(bestRoute.duration ?? 0));
        const geometry = (bestRoute.geometry?.coordinates ?? [])
            .filter((point): point is [number, number] => Array.isArray(point) && point.length === 2)
            .map(([longitude, latitude]) => [latitude, longitude] as [number, number]);
        res.json({
            provider: 'OpenStreetMap + OSRM',
            optimization: 'shortest-time driving route',
            origin,
            destination: { ...target.coordinates, address: target.address },
            route: {
                distance_km: Number(((bestRoute.distance ?? 0) / 1000).toFixed(2)),
                duration_seconds: seconds,
                duration_text: `${Math.max(1, Math.ceil(seconds / 60))} min`,
                description: bestRoute.legs?.[0]?.summary || 'Ruta recomendada para vehículo',
                geometry,
            },
            alternatives: alternatives.map((route) => ({
                distance_km: Number(((route.distance ?? 0) / 1000).toFixed(2)),
                duration_seconds: Math.max(0, Math.round(route.duration ?? 0)),
            })),
        });
    } catch (error) {
        console.error('Error al calcular la ruta con OpenStreetMap:', error);
        res.status(502).json({ error: error instanceof Error ? error.message : 'No se pudo calcular la ruta.' });
    }
};

// Obtener Dashboard de Eventos e Incidentes
export const getEventsDashboard = async (req: AuthRequest, res: Response): Promise<void> => {
    const adminId = req.admin?.id;
    if (!adminId) { res.status(401).json({ error: 'La sesión de administrador no es válida.' }); return; }
    try {
        const query = `
            SELECT e.*, d.nombre AS conductor_nombre, v.numero_flota 
            FROM events e
            JOIN drivers d ON e.driver_id = d.id
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
            WHERE d.admin_id = $1
            ORDER BY e.created_at DESC;
        `;
        const result = await pool.query(query, [adminId]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de eventos' });
    }
};

// Obtener Rastreo GPS en Tiempo Real de las Unidades
export const getGpsTracking = async (req: AuthRequest, res: Response): Promise<void> => {
    const adminId = req.admin?.id;
    if (!adminId) { res.status(401).json({ error: 'La sesión de administrador no es válida.' }); return; }
    try {
        const query = `
            SELECT DISTINCT ON (gt.vehicle_id) gt.*, v.numero_flota, v.placas, d.nombre AS conductor_nombre
            FROM gps_tracks gt
            JOIN vehicles v ON gt.vehicle_id = v.id
            JOIN drivers d ON v.id = d.vehicle_id AND d.admin_id = $1
            ORDER BY gt.vehicle_id, gt.timestamp DESC;
        `;
        const result = await pool.query(query, [adminId]);
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
            `INSERT INTO events (driver_id, created_at, event_type, severity, message, source, hardware_id, status)
             VALUES ($1, COALESCE($2::timestamptz, NOW()), $3, $4, $5, 'esp32', $6, 'active')
             RETURNING *`,
            [driver.rows[0].id, occurredAt, eventType, severity, message, driver.rows[0].hardware_id],
        );
        res.status(201).json({ success: true, event: inserted.rows[0] });
    } catch (error) {
        console.error('Error al ingerir evento del dispositivo:', error);
        res.status(500).json({ error: 'No se pudo registrar el evento del dispositivo.' });
    }
};
