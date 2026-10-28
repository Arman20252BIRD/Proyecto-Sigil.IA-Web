import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './config/db';

// Importación directa de tus controladores
import {
    completeMfaSetup,
    loginStepOne,
    registerAdmin,
    verifyFacialMfa,
    verifyRegistrationTotp,
    verifyTotpMfa,
} from './controllers/auth.controller';
import { getAdminProfile, updateAdminProfile } from './controllers/admin.controller';
import { createDriver, getDrivers, updateDriver, deleteDriver } from './controllers/driver.controller';
import { getEventsDashboard, getGpsTracking } from './controllers/dashboard.controller';
import {
    requireAuth,
    requireEnrollmentSession,
    requireMfaSession,
    requireMfaSetup,
} from './middleware/auth.middleware';

const app = express();

// Middlewares base de seguridad
const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos de autenticación. Intenta de nuevo más tarde.' },
});

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '64kb' }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones, intenta de nuevo más tarde.' },
}));

// --- RUTA DE VERIFICACIÓN DE ESTADO ---
app.get('/api/health', async (req: Request, res: Response) => {
    try {
        await pool.query('SELECT 1');
        res.json({ status: 'OK', system: 'SIGIL.IA Backend Active', database: 'connected' });
    } catch (error) {
        console.error('PostgreSQL health check failed:', error);
        res.status(503).json({ status: 'ERROR', system: 'SIGIL.IA Backend Active', database: 'disconnected' });
    }
});

// --- RUTAS DE AUTENTICACIÓN (LOGIN SIGIL.IA) ---
app.post('/api/auth/register', authRateLimit, registerAdmin);
app.post('/api/auth/register/verify-totp', authRateLimit, requireEnrollmentSession, verifyRegistrationTotp);
app.post('/api/auth/login-step1', authRateLimit, loginStepOne);
app.post('/api/auth/setup-mfa', authRateLimit, requireMfaSetup, completeMfaSetup);
app.post('/api/auth/verify-facial', authRateLimit, requireMfaSession, verifyFacialMfa);
app.post('/api/auth/verify-totp', authRateLimit, requireMfaSession, verifyTotpMfa);

// --- RUTAS DE ADMINISTRADOR ---
app.get('/api/admin/:id', requireAuth, getAdminProfile);
app.put('/api/admin/:id', requireAuth, updateAdminProfile);

// --- RUTAS CRUD DE CONDUCTORES Y ESP32 ---
app.post('/api/drivers', requireAuth, createDriver);
app.get('/api/drivers', requireAuth, getDrivers);
app.put('/api/drivers/:id', requireAuth, updateDriver);
app.delete('/api/drivers/:id', requireAuth, deleteDriver);

// --- RUTAS DE DASHBOARD Y TELEMETRÍA ---
app.get('/api/dashboard/events', requireAuth, getEventsDashboard);
app.get('/api/dashboard/gps', requireAuth, getGpsTracking);

async function purgeExpiredMfaEnrollments(): Promise<void> {
    try {
        await pool.query('DELETE FROM pending_admin_enrollments WHERE expires_at <= NOW()');
        await pool.query(
            `UPDATE admins
             SET totp_secret_encrypted = NULL, mfa_nonce = NULL, mfa_setup_expires_at = NULL
             WHERE totp_enabled = FALSE AND mfa_setup_expires_at <= NOW()`
        );
    } catch (error) {
        console.error('Failed to purge expired MFA enrollment data:', error);
    }
}

void purgeExpiredMfaEnrollments();
const mfaEnrollmentCleanup = setInterval(() => void purgeExpiredMfaEnrollments(), 60_000);
mfaEnrollmentCleanup.unref();

export default app;