
import { Request, Response } from 'express';
import { pool } from '../config/db';

const operationalStatuses = new Set(['Activo', 'Inactivo']);
const driverFields = new Set(['nombre', 'email', 'telefono', 'estatus_operativo', 'vehicle_id']);

type DriverInput = {
    nombre?: string;
    email?: string | null;
    telefono?: string | null;
    estatus_operativo?: string;
    vehicle_id?: number | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasOwn(value: Record<string, unknown>, key: string): boolean {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function parseDriverInput(value: unknown, partial = false): { input?: DriverInput; error?: string } {
    if (!isRecord(value)) return { error: 'El cuerpo de la solicitud debe ser un objeto JSON.' };
    if (Object.keys(value).some((key) => !driverFields.has(key))) {
        return { error: 'La solicitud contiene campos no permitidos.' };
    }

    const input: DriverInput = {};
    if (!partial || hasOwn(value, 'nombre')) {
        if (typeof value.nombre !== 'string' || value.nombre.trim().length < 2 || value.nombre.trim().length > 120) {
            return { error: 'El nombre debe tener entre 2 y 120 caracteres.' };
        }
        input.nombre = value.nombre.trim();
    }

    if (!partial || hasOwn(value, 'email')) {
        if (value.email === null || value.email === undefined
            || (typeof value.email === 'string' && value.email.trim() === '')) {
            input.email = null;
        } else if (typeof value.email !== 'string' || value.email.trim().length > 254
            || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email.trim())) {
            return { error: 'Proporciona un correo electrónico válido.' };
        } else {
            input.email = value.email.trim().toLowerCase();
        }
    }

    if (!partial || hasOwn(value, 'telefono')) {
        if (value.telefono === null || value.telefono === undefined
            || (typeof value.telefono === 'string' && value.telefono.trim() === '')) {
            input.telefono = null;
        } else if (typeof value.telefono !== 'string' || value.telefono.trim().length > 30) {
            return { error: 'El teléfono debe tener como máximo 30 caracteres.' };
        } else {
            input.telefono = value.telefono.trim();
        }
    }

    if (!partial || hasOwn(value, 'estatus_operativo')) {
        if (!partial && value.estatus_operativo === undefined) {
            input.estatus_operativo = 'Activo';
        } else if (typeof value.estatus_operativo !== 'string' || !operationalStatuses.has(value.estatus_operativo)) {
            return { error: 'El estado debe ser Activo o Inactivo.' };
        } else {
            input.estatus_operativo = value.estatus_operativo;
        }
    }

    if (hasOwn(value, 'vehicle_id')) {
        if (value.vehicle_id === null) {
            input.vehicle_id = null;
        } else if ((typeof value.vehicle_id !== 'number' && typeof value.vehicle_id !== 'string')
            || !/^\d+$/.test(String(value.vehicle_id))
            || !Number.isSafeInteger(Number(value.vehicle_id))
            || Number(value.vehicle_id) < 1) {
            return { error: 'vehicle_id debe ser un identificador entero positivo o null.' };
        } else {
            input.vehicle_id = Number(value.vehicle_id);
        }
    }

    if (partial && Object.keys(value).length === 0) {
        return { error: 'Indica al menos un campo para actualizar.' };
    }
    return { input };
}

function parseDriverId(value: unknown): number | null {
    if (typeof value !== 'string') return null;
    if (!/^\d+$/.test(value)) return null;
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function sendDatabaseError(error: unknown, res: Response, action: string): void {
    if (typeof error === 'object' && error !== null && 'code' in error) {
        const code = error.code;
        if (code === '23503') {
            res.status(400).json({ error: 'El vehículo indicado no existe.' });
            return;
        }
        if (code === '23505') {
            res.status(409).json({ error: 'Ya existe un registro con esos datos.' });
            return;
        }
    }
    console.error(`Error al ${action} conductor:`, error);
    res.status(500).json({ error: `No se pudo ${action} el conductor. Intenta de nuevo más tarde.` });
}

export const createDriver = async (req: Request, res: Response): Promise<void> => {
    const parsed = parseDriverInput(req.body);
    if (!parsed.input) {
        res.status(400).json({ error: parsed.error });
        return;
    }

    const { nombre, email, telefono, estatus_operativo } = parsed.input;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const newDriver = await client.query(
            `WITH inserted AS (
                INSERT INTO drivers (nombre, email, telefono, estatus_operativo, vehicle_id)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING *
            )
            SELECT i.*, v.numero_flota, v.modelo, v.placas, v.hardware_id
            FROM inserted i
            LEFT JOIN vehicles v ON v.id = i.vehicle_id`,
            [nombre, email, telefono, estatus_operativo, parsed.input.vehicle_id ?? null]
        );
        const demoAlertCreated = Math.random() < 0.5;
        if (demoAlertCreated) {
            await client.query(
                `INSERT INTO events (driver_id, created_at, event_type, severity, message, source, hardware_id)
                 VALUES ($1, NOW(), 'demo_alert', 'warning', $2, 'demo', $3)`,
                [newDriver.rows[0].id, `Alerta de demostración generada al registrar a ${nombre}.`, newDriver.rows[0].hardware_id ?? null]
            );
        }
        await client.query('COMMIT');
        res.status(201).json({ ...newDriver.rows[0], demo_alert_created: demoAlertCreated });
    } catch (error) {
        await client.query('ROLLBACK');
        sendDatabaseError(error, res, 'crear');
    } finally {
        client.release();
    }
};

export const getDrivers = async (req: Request, res: Response): Promise<void> => {
    try {
        const query = `
            SELECT d.*, v.numero_flota, v.modelo, v.placas, v.hardware_id
            FROM drivers d
            LEFT JOIN vehicles v ON d.vehicle_id = v.id
            ORDER BY d.id;
        `;
        const result = await pool.query(query);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener conductores:', error);
        res.status(500).json({ error: 'No se pudieron obtener los conductores. Intenta de nuevo más tarde.' });
    }
};

export const updateDriver = async (req: Request, res: Response): Promise<void> => {
    const id = parseDriverId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'El identificador del conductor no es válido.' });
        return;
    }
    const parsed = parseDriverInput(req.body, true);
    if (!parsed.input) {
        res.status(400).json({ error: parsed.error });
        return;
    }

    const columnNames: Record<keyof DriverInput, string> = {
        nombre: 'nombre',
        email: 'email',
        telefono: 'telefono',
        estatus_operativo: 'estatus_operativo',
        vehicle_id: 'vehicle_id',
    };
    const assignments: string[] = [];
    const values: unknown[] = [];
    for (const [field, value] of Object.entries(parsed.input) as [keyof DriverInput, DriverInput[keyof DriverInput]][]) {
        values.push(value);
        assignments.push(`${columnNames[field]} = $${values.length}`);
    }
    values.push(id);

    try {
        const updated = await pool.query(
            `WITH changed AS (
                UPDATE drivers SET ${assignments.join(', ')}
                WHERE id = $${values.length}
                RETURNING *
            )
            SELECT c.*, v.numero_flota, v.modelo, v.placas, v.hardware_id
            FROM changed c
            LEFT JOIN vehicles v ON v.id = c.vehicle_id`,
            values
        );

        if (updated.rows.length === 0) {
            res.status(404).json({ error: 'Conductor no encontrado' });
            return;
        }

        res.json(updated.rows[0]);
    } catch (error) {
        sendDatabaseError(error, res, 'actualizar');
    }
};

export const deleteDriver = async (req: Request, res: Response): Promise<void> => {
    const id = parseDriverId(req.params.id);
    if (id === null) {
        res.status(400).json({ error: 'El identificador del conductor no es válido.' });
        return;
    }

    try {
        const result = await pool.query('DELETE FROM drivers WHERE id = $1 RETURNING *;', [id]);

        if (result.rows.length === 0) {
            res.status(404).json({ error: 'Conductor no encontrado' });
            return;
        }

        res.json({ message: 'Conductor eliminado correctamente' });
    } catch (error) {
        sendDatabaseError(error, res, 'eliminar');
    }
};
