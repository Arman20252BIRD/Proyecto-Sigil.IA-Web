import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import type { AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../models/db';
import { writeAuditLog } from '../models/audit-log.model';

const PRIVACY_NOTICE_VERSION = '1.0';
const COOKIE_POLICY_VERSION = '1.0';

type CookieDecision = 'essential' | 'all';

function isCookieDecision(value: unknown): value is CookieDecision {
    return value === 'essential' || value === 'all';
}

export async function recordQuoteLegalSelection(req: Request, res: Response): Promise<void> {
    const { checked, receiptId } = req.body ?? {};
    if (checked !== true && checked !== false) {
        res.status(400).json({ error: 'La decisión no es válida.' });
        return;
    }
    if (checked === false && (typeof receiptId !== 'string' || !/^[0-9a-f-]{36}$/i.test(receiptId))) {
        res.status(400).json({ error: 'El identificador del registro no es válido.' });
        return;
    }
    const id = checked ? randomUUID() : receiptId;
    if (!checked) {
        try {
            const original = await pool.query("SELECT 1 FROM audit_logs WHERE action = 'QUOTE_LEGAL_CHECKED' AND resource_id = $1 LIMIT 1", [id]);
            if (!original.rowCount) {
                res.status(400).json({ error: 'No se encontró el registro de aceptación.' });
                return;
            }
        } catch {
            res.status(503).json({ error: 'No fue posible consultar el registro.' });
            return;
        }
    }
    const recorded = await writeAuditLog(req, {
        action: checked ? 'QUOTE_LEGAL_CHECKED' : 'QUOTE_LEGAL_UNCHECKED',
        resourceType: 'quote_consent',
        resourceId: id,
        details: { checked, privacyVersion: PRIVACY_NOTICE_VERSION, termsVersion: '1.0', stage: 'quote_form' },
    });
    if (!recorded) {
        res.status(503).json({ error: 'No fue posible registrar la decisión.' });
        return;
    }
    try {
        const result = await pool.query(
            'SELECT created_at FROM audit_logs WHERE resource_type = $1 AND resource_id = $2 AND action = $3 ORDER BY id DESC LIMIT 1',
            ['quote_consent', id, checked ? 'QUOTE_LEGAL_CHECKED' : 'QUOTE_LEGAL_UNCHECKED']
        );
        if (!result.rowCount) throw new Error('Missing consent record');
        res.status(201).json({ success: true, receiptId: id, checked, recordedAt: result.rows[0].created_at });
    } catch {
        res.status(503).json({ error: 'No fue posible consultar el registro de la decisión.' });
    }
}

export async function recordOnboardingLegalSelection(req: AuthRequest, res: Response): Promise<void> {
    const { checked } = req.body ?? {};
    if (!req.admin?.id || (checked !== true && checked !== false)) {
        res.status(400).json({ error: 'La decisión no es válida.' });
        return;
    }
    const recorded = await writeAuditLog(req, {
        adminId: req.admin.id,
        action: checked ? 'ONBOARDING_LEGAL_CHECKED' : 'ONBOARDING_LEGAL_UNCHECKED',
        resourceType: 'admin',
        resourceId: req.admin.id,
        details: { checked, privacyVersion: PRIVACY_NOTICE_VERSION, termsVersion: '1.0', stage: 'onboarding_checkbox' },
    });
    if (!recorded) {
        res.status(503).json({ error: 'No fue posible registrar la decisión.' });
        return;
    }
    res.status(201).json({ success: true, checked });
}

export async function getLegalConsentHistory(req: AuthRequest, res: Response): Promise<void> {
    try {
        const result = await pool.query(
            `SELECT * FROM (
               SELECT 'audit-' || id::text AS id, action, NULL::boolean AS accepted,
                      details->>'version' AS version, created_at
               FROM audit_logs WHERE admin_id = $1 AND action IN
                 ('ONBOARDING_LEGAL_CHECKED', 'ONBOARDING_LEGAL_UNCHECKED', 'PRIVACY_NOTICE_ACCEPTED', 'TERMS_ACCEPTED')
               UNION ALL
               SELECT 'consent-' || id::text AS id, 'CONSENT_' || UPPER(consent_type) AS action,
                      accepted, version, accepted_at AS created_at
               FROM privacy_consents WHERE admin_id = $1 AND consent_type IN ('privacy_notice', 'terms')
             ) history ORDER BY created_at DESC, id DESC LIMIT 100`,
            [req.admin?.id]
        );
        res.json({ items: result.rows });
    } catch {
        res.status(500).json({ error: 'No fue posible consultar las aceptaciones.' });
    }
}

export async function recordPrivacyNoticeAcceptance(req: Request, res: Response): Promise<void> {
    const { accepted, version } = req.body ?? {};
    const consentVersion = typeof version === 'string' && version.trim() ? version.trim() : PRIVACY_NOTICE_VERSION;

    if (accepted !== true || consentVersion !== PRIVACY_NOTICE_VERSION) {
        res.status(400).json({ error: 'La aceptación del aviso de privacidad no es válida.' });
        return;
    }

    const recorded = await writeAuditLog(req, {
        action: 'PRIVACY_NOTICE_ACCEPTED',
        resourceType: 'privacy_notice',
        resourceId: consentVersion,
        details: {
            version: consentVersion,
            stage: 'login_modal',
            accepted: true,
        },
    });

    if (!recorded) {
        res.status(503).json({ error: 'No fue posible registrar la aceptación en la base de datos.' });
        return;
    }

    res.status(201).json({ success: true, version: consentVersion });
}

export async function recordCookieDecision(req: Request, res: Response): Promise<void> {
    const { decision, analytics, preferences, version, source } = req.body ?? {};
    const consentVersion = typeof version === 'string' && version.trim() ? version.trim() : COOKIE_POLICY_VERSION;
    // `preferences` se conserva como compatibilidad con clientes anteriores.
    const categoryAnalytics = analytics === true || preferences === true;

    if (!isCookieDecision(decision) || consentVersion !== COOKIE_POLICY_VERSION) {
        res.status(400).json({ error: 'La decisión de cookies no es válida.' });
        return;
    }

    const action = source === 'updated'
        ? 'COOKIE_PREFERENCES_UPDATED'
        : decision === 'all'
            ? 'COOKIE_CONSENT_ACCEPTED'
            : 'COOKIE_CONSENT_REJECTED';
    const recorded = await writeAuditLog(req, {
        action,
        resourceType: 'cookie_consent',
        resourceId: consentVersion,
        details: {
            version: consentVersion,
            decision,
            categories: {
                necessary: true,
                services: 'on_demand',
                analytics: categoryAnalytics,
                advertising: false,
                thirdPartyTracking: false,
            },
            source: source === 'updated' ? 'updated' : 'initial',
        },
    });

    if (!recorded) {
        res.status(503).json({ error: 'No fue posible registrar la decisión de cookies.' });
        return;
    }

    res.status(201).json({ success: true, action, version: consentVersion });
}

