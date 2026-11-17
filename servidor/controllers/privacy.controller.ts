import type { Request, Response } from 'express';
import { writeAuditLog } from '../models/audit-log.model';

const PRIVACY_NOTICE_VERSION = '1.0';

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
