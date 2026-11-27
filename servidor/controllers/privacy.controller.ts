import type { Request, Response } from 'express';
import { writeAuditLog } from '../models/audit-log.model';

const PRIVACY_NOTICE_VERSION = '1.0';
const COOKIE_POLICY_VERSION = '1.0';

type CookieDecision = 'essential' | 'all';

function isCookieDecision(value: unknown): value is CookieDecision {
    return value === 'essential' || value === 'all';
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

