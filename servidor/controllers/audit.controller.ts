import type { Response } from 'express';
import { pool } from '../models/db';
import type { AuthRequest } from '../middleware/auth.middleware';

type AuditLogRow = {
    id: string;
    action: string;
    resource_type: string | null;
    resource_id: string | null;
    details: Record<string, unknown>;
    ip_address: string | null;
    user_agent: string | null;
    success: boolean;
    failure_reason: string | null;
    created_at: Date;
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

export async function getAuditHistory(req: AuthRequest, res: Response): Promise<void> {
    const adminId = req.admin?.id;
    const adminEmail = req.admin?.email.toLowerCase();
    if (!adminId || !adminEmail) {
        res.status(401).json({ error: 'La sesión de administrador no es válida.' });
        return;
    }

    const rawLimit = req.query.limit;
    const pageSize = rawLimit === undefined
        ? DEFAULT_PAGE_SIZE
        : typeof rawLimit === 'string' && /^\d+$/.test(rawLimit)
            ? Number(rawLimit)
            : Number.NaN;
    if (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > MAX_PAGE_SIZE) {
        res.status(400).json({ error: `El límite debe ser un entero entre 1 y ${MAX_PAGE_SIZE}.` });
        return;
    }

    const rawBeforeId = req.query.beforeId;
    if (rawBeforeId !== undefined
        && (typeof rawBeforeId !== 'string'
            || !/^[1-9]\d*$/.test(rawBeforeId)
            || rawBeforeId.length > 19
            || (rawBeforeId.length === 19 && rawBeforeId > '9223372036854775807'))) {
        res.status(400).json({ error: 'El cursor del historial no es válido.' });
        return;
    }

    try {
        const result = await pool.query<AuditLogRow>(
            `SELECT audit_logs.id::text AS id, action, resource_type, resource_id, details,
                    host(ip_address) AS ip_address, user_agent, success, failure_reason, created_at
             FROM audit_logs
             WHERE (
                 audit_logs.admin_id = $1
                 OR (
                     audit_logs.admin_id IS NULL
                     AND audit_logs.action = 'LOGIN_FAILED'
                     AND details->>'email' = $2
                 )
             )
               AND ($3::bigint IS NULL OR audit_logs.id < $3::bigint)
             ORDER BY audit_logs.id DESC
             LIMIT $4`,
            [adminId, adminEmail, rawBeforeId ?? null, pageSize + 1]
        );

        const hasMore = result.rows.length > pageSize;
        const items = result.rows.slice(0, pageSize);
        res.json({
            items,
            nextBeforeId: hasMore ? items[items.length - 1].id : null,
        });
    } catch (error) {
        console.error('Error al consultar el historial de auditoría:', error);
        res.status(500).json({ error: 'No se pudo consultar el historial de seguridad.' });
    }
}
