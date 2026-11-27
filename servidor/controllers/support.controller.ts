import type { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.middleware';
import { pool } from '../models/db';

const SUPPORT_EMAIL = 'soporte@sigilia.com.mx';

export const sendSupportRequest = async (req: AuthRequest, res: Response): Promise<void> => {
    const subject = typeof req.body?.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (subject.length < 3 || subject.length > 120 || /[\r\n]/.test(subject)
        || message.length < 10 || message.length > 5000) {
        res.status(400).json({ error: 'Escribe un asunto de 3 a 120 caracteres y un mensaje de 10 a 5000 caracteres.' });
        return;
    }
    const apiKey = process.env.RESEND_SUPPORT_API_KEY?.trim() || process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_SUPPORT_FROM?.trim() || process.env.RESEND_FROM?.trim();
    if (!apiKey || !from) {
        res.status(503).json({ error: 'El servicio de correo de soporte no está configurado. Escribe a soporte@sigilia.com.mx.' });
        return;
    }

    try {
        const result = await pool.query<{ nombre: string; email: string; empresa: string | null }>(
            "SELECT nombre, email, empresa FROM admins WHERE id = $1 AND account_status = 'active'",
            [req.admin?.id]
        );
        const admin = result.rows[0];
        if (!admin) {
            res.status(401).json({ error: 'La cuenta no está disponible. Inicia sesión nuevamente.' });
            return;
        }
        const text = `Solicitud de soporte desde Sigilia\n\nNombre: ${admin.nombre}\nCorreo: ${admin.email}\nEmpresa: ${admin.empresa || 'No registrada'}\n\nAsunto: ${subject}\n\nMensaje:\n${message}`;
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ from, to: [SUPPORT_EMAIL], reply_to: admin.email, subject: `Soporte Sigilia: ${subject}`, text }),
            signal: AbortSignal.timeout(15000),
        });
        if (!response.ok) {
            console.error('Support email provider returned status', response.status);
            res.status(502).json({ error: 'No fue posible enviar el mensaje. Intenta nuevamente o escribe a soporte@sigilia.com.mx.' });
            return;
        }
        res.status(201).json({ ok: true, message: 'Tu mensaje fue enviado a soporte.' });
    } catch (error) {
        console.error('Error sending support request:', error instanceof Error ? error.message : 'unknown error');
        res.status(502).json({ error: 'No fue posible enviar el mensaje. Intenta nuevamente o escribe a soporte@sigilia.com.mx.' });
    }
};
