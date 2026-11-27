import crypto from 'node:crypto';
import type { Request, Response } from 'express';

const CONTACT_EMAIL = 'sigil.ia.soporte@gmail.com';
const STATE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTACHMENT_SIZE = 5 * 1024 * 1024;
const MAX_TOTAL_ATTACHMENTS = 10 * 1024 * 1024;
const ARCO_RIGHTS = new Set(['acceso', 'rectificacion', 'cancelacion']);
const ALLOWED_ATTACHMENT_TYPES = new Set([
    'application/pdf',
    'image/png',
    'image/jpeg',
]);

type ArcoAttachment = { filename: string; mimeType: string; dataBase64: string };
type ArcoRequest = {
    nombre: string;
    contacto: string;
    derechos: string[];
    solicitudHtml: string;
    solicitudText: string;
    attachments: ArcoAttachment[];
    createdAt: number;
    nonce: string;
};

const pendingArcoRequests = new Map<string, ArcoRequest>();

function getConfig(): { clientId: string; clientSecret: string; redirectUri: string; stateSecret: string; frontendUrl: string } | null {
    const clientId = process.env.GMAIL_CLIENT_ID;
    const clientSecret = process.env.GMAIL_CLIENT_SECRET;
    const redirectUri = process.env.GMAIL_REDIRECT_URI ?? 'http://localhost:4000/api/privacy/arco/gmail/callback';
    const stateSecret = process.env.GMAIL_OAUTH_STATE_SECRET ?? process.env.JWT_SECRET;
    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    if (!clientId || !clientSecret || !stateSecret) return null;
    return { clientId, clientSecret, redirectUri, stateSecret, frontendUrl };
}

function isEmail(value: unknown): value is string {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function parseArcoRights(value: unknown): string[] {
    const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
    return [...new Set(values
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim().toLowerCase())
        .filter((item) => ARCO_RIGHTS.has(item)))];
}

function rightLabel(value: string): string {
    return ({ acceso: 'Acceso', rectificacion: 'Rectificación', cancelacion: 'Cancelación' }[value] ?? value);
}

function safeMimeHeaderValue(value: string): string {
    return value.replace(/[\r\n\x00-\x1f\x7f]/g, '').replace(/["]/g, '').trim().slice(0, 160);
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
    })[character] ?? character);
}

function encodeState(payload: Pick<ArcoRequest, 'contacto' | 'createdAt' | 'nonce'>, secret: string): string {
    const key = crypto.createHash('sha256').update(secret).digest();
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decodeState(value: string, secret: string): Pick<ArcoRequest, 'contacto' | 'createdAt' | 'nonce'> | null {
    const [ivEncoded, tagEncoded, encryptedEncoded] = value.split('.');
    if (!ivEncoded || !tagEncoded || !encryptedEncoded) return null;
    try {
        const key = crypto.createHash('sha256').update(secret).digest();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivEncoded, 'base64url'));
        decipher.setAuthTag(Buffer.from(tagEncoded, 'base64url'));
        const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedEncoded, 'base64url')), decipher.final()]);
        const payload = JSON.parse(decrypted.toString('utf8')) as Pick<ArcoRequest, 'contacto' | 'createdAt' | 'nonce'>;
        if (!payload.createdAt || Date.now() - payload.createdAt > STATE_TTL_MS || !isEmail(payload.contacto) || !payload.nonce) return null;
        return payload;
    } catch {
        return null;
    }
}

function cleanHtml(value: string): string {
    return value
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/\son\w+=("[^"]*"|'[^']*')/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/<(?!\/?(?:b|strong|i|em|u|br|ul|ol|li|p|a)(?:\s[^>]*)?>)[^>]*>/gi, '')
        .replace(/<a\s+([^>]*?)href=["']([^"']+)["']([^>]*)>/gi, (_match, before: string, href: string, after: string) => {
            const safeHref = /^(https?:|mailto:)/i.test(href) ? href : '#';
            return `<a ${before}href="${safeHref}"${after}>`;
        });
}

function parseAttachments(value: unknown): { attachments?: ArcoAttachment[]; error?: string } {
    if (value === undefined) return { attachments: [] };
    if (!Array.isArray(value) || value.length > 5) return { error: 'Puedes adjuntar hasta cinco archivos.' };
    let total = 0;
    const attachments: ArcoAttachment[] = [];
    for (const item of value) {
        if (typeof item !== 'object' || item === null) return { error: 'Uno de los archivos no es válido.' };
        const file = item as Record<string, unknown>;
        const filename = typeof file.filename === 'string'
            ? file.filename.replace(/[\\/\r\n"]/g, '').replace(/[^\w.\s-]/g, '').trim().slice(0, 120)
            : '';
        const rawMimeType = typeof file.mimeType === 'string' ? file.mimeType.trim().toLowerCase() : '';
        if (!ALLOWED_ATTACHMENT_TYPES.has(rawMimeType)) {
            return { error: 'Solo se permiten archivos PDF, PNG o JPG.' };
        }
        const mimeType = rawMimeType;
        const dataBase64 = typeof file.dataBase64 === 'string' ? file.dataBase64 : '';
        if (dataBase64.length > Math.ceil(MAX_ATTACHMENT_SIZE / 3) * 4 || dataBase64.length % 4 !== 0
            || /[^A-Za-z0-9+/=]/.test(dataBase64) || /=/.test(dataBase64.slice(0, -2))
            || !/^[^=]*(?:={0,2})$/.test(dataBase64.slice(-4))) {
            return { error: 'El contenido adjunto no es válido.' };
        }
        const bytes = Buffer.byteLength(dataBase64, 'base64');
        if (!filename || !dataBase64 || bytes > MAX_ATTACHMENT_SIZE) return { error: 'Cada archivo debe pesar como máximo 5 MB.' };
        total += bytes;
        if (total > MAX_TOTAL_ATTACHMENTS) return { error: 'El tamaño total de los archivos no puede superar 10 MB.' };
        attachments.push({ filename, mimeType, dataBase64 });
    }
    return { attachments };
}

export async function sendArcoRequest(req: Request, res: Response): Promise<void> {
    const { nombre, contacto, solicitudText, solicitudHtml } = req.body ?? {};
    const derechos = parseArcoRights(req.body?.derechos);
    const parsedAttachments = parseAttachments(req.body?.attachments);
    if (typeof nombre !== 'string' || nombre.trim().length < 2 || nombre.trim().length > 160
        || !isEmail(contacto) || contacto.trim().length > 254 || derechos.length === 0
        || typeof solicitudText !== 'string' || !solicitudText.trim() || solicitudText.length > 5000
        || typeof solicitudHtml !== 'string' || solicitudHtml.length > 12000 || parsedAttachments.error) {
        res.status(400).json({ error: parsedAttachments.error ?? 'Completa los datos de la solicitud ARCO.' });
        return;
    }

    const apiKey = process.env.RESEND_SUPPORT_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_SUPPORT_FROM?.trim() || process.env.RESEND_FROM?.trim();
    if (!apiKey || !from) {
        res.status(503).json({ error: 'El servicio de correo no está configurado. Contacta a soporte@sigilia.com.mx.' });
        return;
    }

    const rights = derechos.map(rightLabel).join(', ');
    const text = `Nombre completo: ${nombre.trim()}\nCorreo de contacto: ${contacto.trim()}\nDerechos solicitados: ${rights}\n\nDescripción de la solicitud:\n${solicitudText.trim()}`;
    // Solo se conserva el formato del editor; no se aceptan atributos ni enlaces arbitrarios.
    const formatted = solicitudHtml
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, '')
        .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag: string, name: string) => {
            const normalized = name.toLowerCase();
            if (normalized === 'div') return tag.startsWith('</') ? '</p>' : '<p>';
            if (!['b', 'strong', 'i', 'em', 'u', 'br', 'ul', 'ol', 'li', 'p'].includes(normalized)) return '';
            return `<${tag.startsWith('</') ? '/' : ''}${normalized}>`;
        });
    const html = `<p><strong>Nombre completo:</strong> ${escapeHtml(nombre.trim())}</p>`
        + `<p><strong>Correo de contacto:</strong> ${escapeHtml(contacto.trim())}</p>`
        + `<p><strong>Derechos solicitados:</strong> ${escapeHtml(rights)}</p>`
        + `<p><strong>Descripción de la solicitud:</strong></p>${formatted}`;

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                from, to: ['soporte@sigilia.com.mx'], reply_to: contacto.trim(),
                subject: `Solicitud de derechos ARCO - ${rights}`, text, html,
                attachments: (parsedAttachments.attachments ?? []).map((file) => ({ filename: file.filename, content: file.dataBase64, content_type: file.mimeType })),
            }),
        });
        if (!response.ok) {
            console.error('El proveedor rechazó la solicitud ARCO:', response.status);
            res.status(502).json({ error: 'No fue posible enviar la solicitud. Inténtalo nuevamente.' });
            return;
        }
        res.status(201).json({ ok: true });
    } catch {
        res.status(502).json({ error: 'No fue posible conectar con el servicio de correo.' });
    }
}

function redirectWithMessage(config: { frontendUrl: string }, res: Response, message: string): void {
    const url = new URL('/legal/arco', config.frontendUrl);
    url.searchParams.set('gmail', message);
    res.redirect(url.toString());
}

export function authorizeArcoWithGmail(req: Request, res: Response): void {
    const config = getConfig();
    if (!config) {
        res.status(503).json({ error: 'La integración de Gmail no está configurada en el backend.' });
        return;
    }
    const { nombre, contacto, solicitudHtml, solicitudText } = req.body ?? {};
    const derechos = parseArcoRights(req.body?.derechos ?? req.body?.derecho);
    const parsedAttachments = parseAttachments(req.body?.attachments);
    if (typeof nombre !== 'string' || nombre.trim().length < 2 || !isEmail(contacto)
        || derechos.length === 0 || typeof solicitudHtml !== 'string' || typeof solicitudText !== 'string'
        || !solicitudText.trim() || parsedAttachments.error) {
        res.status(400).json({ error: parsedAttachments.error ?? 'Completa los datos de la solicitud ARCO antes de continuar con Gmail.' });
        return;
    }

    const nonce = crypto.randomUUID();
    const draft: ArcoRequest = {
        nombre: nombre.trim().slice(0, 160),
        contacto: contacto.trim().toLowerCase(),
        derechos: derechos.map((right) => safeMimeHeaderValue(right).slice(0, 40)),
        solicitudHtml: cleanHtml(solicitudHtml).slice(0, 12000),
        solicitudText: solicitudText.trim().slice(0, 5000),
        attachments: parsedAttachments.attachments ?? [],
        createdAt: Date.now(),
        nonce,
    };
    pendingArcoRequests.set(nonce, draft);

    const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authorizationUrl.searchParams.set('client_id', config.clientId);
    authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('scope', 'openid email profile https://www.googleapis.com/auth/gmail.send');
    authorizationUrl.searchParams.set('access_type', 'online');
    authorizationUrl.searchParams.set('prompt', 'consent');
    authorizationUrl.searchParams.set('login_hint', draft.contacto);
    authorizationUrl.searchParams.set('state', encodeState({ contacto: draft.contacto, createdAt: draft.createdAt, nonce }, config.stateSecret));
    res.json({ authorizationUrl: authorizationUrl.toString() });
}

function encodeMimeMessage(payload: ArcoRequest): string {
    const mixedBoundary = `sigil-mixed-${crypto.randomUUID()}`;
    const alternativeBoundary = `sigil-alt-${crypto.randomUUID()}`;
    const safeNombre = escapeHtml(safeMimeHeaderValue(payload.nombre));
    const safeContacto = escapeHtml(safeMimeHeaderValue(payload.contacto));
    const safeDerechos = payload.derechos.map(rightLabel).map(safeMimeHeaderValue);
    const rightsText = safeDerechos.join(', ');
    const lines = [
        `To: ${CONTACT_EMAIL}`,
        `Subject: Solicitud de derechos ARCO - ${rightsText}`,
        `Content-Type: multipart/mixed; boundary="${mixedBoundary}"`,
        'MIME-Version: 1.0', '',
        `--${mixedBoundary}`,
        `Content-Type: multipart/alternative; boundary="${alternativeBoundary}"`, '',
        `--${alternativeBoundary}`,
        'Content-Type: text/plain; charset="UTF-8"', '',
        `Nombre completo: ${safeNombre}`,
        `Correo de contacto: ${safeContacto}`,
        `Derechos solicitados: ${rightsText}`, '',
        'Descripción de la solicitud:', payload.solicitudText, '',
        `--${alternativeBoundary}`,
        'Content-Type: text/html; charset="UTF-8"', '',
        `<p><strong>Nombre completo:</strong> ${safeNombre}</p><p><strong>Correo de contacto:</strong> <a href="mailto:${safeContacto}">${safeContacto}</a></p><p><strong>Derechos solicitados:</strong> ${rightsText}</p><p><strong>Descripción de la solicitud:</strong></p>${payload.solicitudHtml}`,
        `--${alternativeBoundary}--`,
    ];
    for (const attachment of payload.attachments) {
        const wrappedBase64 = attachment.dataBase64.match(/.{1,76}/g)?.join('\r\n') ?? '';
        const safeFilename = safeMimeHeaderValue(attachment.filename);
        lines.push(`--${mixedBoundary}`, `Content-Type: ${attachment.mimeType}; name="${safeFilename}"`, 'Content-Transfer-Encoding: base64', `Content-Disposition: attachment; filename="${safeFilename}"`, '', wrappedBase64);
    }
    lines.push(`--${mixedBoundary}--`);
    return Buffer.from(lines.join('\r\n'), 'utf8').toString('base64url');
}

export async function gmailArcoCallback(req: Request, res: Response): Promise<void> {
    const config = getConfig();
    if (!config) {
        res.status(503).json({ error: 'La integración de Gmail no está configurada en el backend.' });
        return;
    }
    const state = typeof req.query.state === 'string' ? decodeState(req.query.state, config.stateSecret) : null;
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const draft = state ? pendingArcoRequests.get(state.nonce) : null;
    if (!state || !draft || !code) {
        redirectWithMessage(config, res, 'error=autorizacion_invalida');
        return;
    }

    try {
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code' }),
        });
        const token = await tokenResponse.json() as { access_token?: string };
        if (!tokenResponse.ok || !token.access_token) throw new Error('No se pudo obtener el token de Gmail.');

        const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` } });
        const profile = await profileResponse.json() as { email?: string; email_verified?: boolean };
        if (!profileResponse.ok || !profile.email_verified || profile.email?.toLowerCase() !== draft.contacto.toLowerCase()) {
            pendingArcoRequests.delete(state.nonce);
            redirectWithMessage(config, res, 'error=cuenta_no_coincide');
            return;
        }

        const sendResponse = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ raw: encodeMimeMessage(draft) }),
        });
        if (!sendResponse.ok) throw new Error('Gmail rechazó el envío de la solicitud.');
        pendingArcoRequests.delete(state.nonce);
        redirectWithMessage(config, res, 'sent');
    } catch (error) {
        pendingArcoRequests.delete(state.nonce);
        console.error('Error al enviar solicitud ARCO mediante Gmail:', error);
        redirectWithMessage(config, res, 'error=envio_fallido');
    }
}
