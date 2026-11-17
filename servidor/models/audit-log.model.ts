import type { Request } from 'express';
import { pool } from '../models/db';

type AuditInput = {
  adminId?: string | number | null;
  action: string;
  resourceType?: string;
  resourceId?: string | number | null;
  details?: Record<string, unknown>;
  success?: boolean;
  failureReason?: string | null;
};

function getIpAddress(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.header('x-forwarded-for')?.split(',')[0]?.trim();
  return forwarded || req.ip || null;
}

export async function writeAuditLog(req: Request | undefined, input: AuditInput): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO audit_logs
        (admin_id, action, resource_type, resource_id, details, ip_address, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9)`,
      [
        input.adminId ?? null,
        input.action,
        input.resourceType ?? null,
        input.resourceId == null ? null : String(input.resourceId),
        JSON.stringify(input.details ?? {}),
        getIpAddress(req),
        req?.get('user-agent') ?? null,
        input.success ?? true,
        input.failureReason ?? null,
      ],
    );
    return true;
  } catch (error) {
    console.error('No fue posible registrar la auditoría:', error);
    return false;
  }
}
