import { Request, Response } from 'express';
import { pool } from '../models/db';

const salesEmail = process.env.SALES_EMAIL?.trim() || 'ventas@sigilia.com.mx';

function clean(value: unknown, maxLength = 300): string {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (character) => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
    })[character] ?? character);
}

export const sendQuoteRequest = async (req: Request, res: Response): Promise<void> => {
    const plan = clean(req.body?.plan, 100);
    const contact = clean(req.body?.contact, 160);
    const email = clean(req.body?.email, 254).toLowerCase();
    const phone = clean(req.body?.phone, 60);
    const company = clean(req.body?.company, 160);
    const fleet = clean(req.body?.fleet, 80);
    const message = clean(req.body?.message, 2000) || 'Sin mensaje adicional.';
    const privacyAccepted = req.body?.privacyAccepted === true || req.body?.privacyAccepted === 'on';
    const quoteConsentId = typeof req.body?.quoteConsentId === 'string' ? req.body.quoteConsentId : '';

    if (!plan || !contact || !phone || !company || !fleet || !privacyAccepted || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        res.status(400).json({ error: 'Completa todos los campos requeridos con información válida.' });
        return;
    }
    if (!/^[0-9a-f-]{36}$/i.test(quoteConsentId)) {
        res.status(400).json({ error: 'Marca la casilla y espera a que se registre tu aceptación.' });
        return;
    }
    try {
        const consent = await pool.query(
            `SELECT 1 FROM audit_logs a WHERE a.resource_id = $1 AND a.action = 'QUOTE_LEGAL_CHECKED'
             AND NOT EXISTS (SELECT 1 FROM audit_logs b WHERE b.resource_id = a.resource_id AND b.action = 'QUOTE_LEGAL_UNCHECKED') LIMIT 1`,
            [quoteConsentId]
        );
        if (!consent.rowCount) {
            res.status(400).json({ error: 'La aceptación no está registrada o fue retirada. Marca nuevamente la casilla.' });
            return;
        }
    } catch {
        res.status(503).json({ error: 'No fue posible verificar la aceptación. Intenta nuevamente.' });
        return;
    }

    const apiKey = process.env.RESEND_QUOTE_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim();
    const isVerifiedSigiliaSender = Boolean(from && /<[^>]+@sigilia\.com\.mx>|^[^\s@]+@sigilia\.com\.mx$/i.test(from));
    if (!apiKey || !from || !isVerifiedSigiliaSender) {
        console.error('Quote email was not sent: RESEND_API_KEY or RESEND_FROM is missing.');
        res.status(503).json({ error: 'El servicio de cotizaciones no está configurado.' });
        return;
    }

    const subject = `Solicitud de cotización Sigilia - ${plan}`;
    const details = [
        ['Plan de interés', plan],
        ['Nombre y cargo', contact],
        ['Correo de contacto', email],
        ['Teléfono', phone],
        ['Empresa', company],
        ['Vehículos aproximados', fleet],
        ['Mensaje', message],
    ] as const;
    const html = `<h2>Solicitud de cotización Sigilia</h2><p>Una empresa solicitó información comercial desde el sitio web.</p><table>${details.map(([label, value]) => `<tr><td style="padding:6px 12px 6px 0"><strong>${escapeHtml(label)}</strong></td><td style="padding:6px 0">${escapeHtml(value).replace(/\n/g, '<br>')}</td></tr>`).join('')}</table>`;
    const text = details.map(([label, value]) => `${label}: ${value}`).join('\n');

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [salesEmail], reply_to: email, subject, html, text }),
        });
        if (!response.ok) {
            console.error('Resend quote request failed:', await response.text());
            res.status(502).json({ error: 'No fue posible enviar la solicitud. Intenta nuevamente.' });
            return;
        }
        res.status(201).json({ ok: true, message: 'Solicitud enviada correctamente.' });
    } catch (error) {
        console.error('Quote request email failed:', error);
        res.status(502).json({ error: 'No fue posible conectar con el servicio de correo.' });
    }
};
