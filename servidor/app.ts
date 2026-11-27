import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { pool } from './models/db';

// Importación directa de tus controladores
import {
    completeMfaSetup,
    loginStepOne,
    requestPasswordReset,
    resetPassword,
    validateAdminInvitation,
    completeAdminOnboarding,
    registerAdmin,
    verifyFacialMfa,
    verifyPasswordResetTotp,
    verifyRegistrationTotp,
    verifyTotpMfa,
} from './controllers/auth.controller';
import {
    getAdminProfile,
    updateAdminProfile,
    getPrivacyAccess,
    rectifyPrivacyData,
    getMyRectificationStatus,
    reviewRectificationByEmail,
    cancelPrivacyAccount,
    getPrivacyAudit,
} from './controllers/admin.controller';
import { getAuditHistory } from './controllers/audit.controller';
import { createDriver, getDrivers, updateDriver, deleteDriver } from './controllers/driver.controller';
import { getBestRoute, getEventsDashboard, getGpsTracking, ingestDeviceEvent } from './controllers/dashboard.controller';
import { requireDeviceKey } from './middleware/device-auth.middleware';
import { authorizeArcoWithGmail, gmailArcoCallback } from './controllers/gmail.controller';
import { recordCookieDecision, recordPrivacyNoticeAcceptance, recordQuoteLegalSelection, recordOnboardingLegalSelection, getLegalConsentHistory } from './controllers/privacy.controller';
import { sendQuoteRequest } from './controllers/quote.controller';
import { sendSupportRequest } from './controllers/support.controller';
import {
    requireAuth,
    requireEnrollmentSession,
    requireMfaSession,
    requireMfaSetup,
    requireOnboardingSession,
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
const supportRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados mensajes de soporte. Intenta de nuevo más tarde.' },
});
const legalSelectionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' },
});

const isDashboardRead = (req: Request): boolean =>
    req.method === 'GET' && req.originalUrl.split('?')[0].startsWith('/api/dashboard/');
const dashboardReadRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 600,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Demasiadas lecturas del dashboard.' },
});

app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json({ limit: '16mb' }));
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    skip: isDashboardRead,
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
app.post('/api/auth/invitation/validate', authRateLimit, validateAdminInvitation);
app.post('/api/auth/onboarding/complete', authRateLimit, requireOnboardingSession, completeAdminOnboarding);
app.post('/api/auth/register/verify-totp', authRateLimit, requireEnrollmentSession, verifyRegistrationTotp);
app.post('/api/auth/login-step1', authRateLimit, loginStepOne);
app.post('/api/auth/password-reset/request', authRateLimit, requestPasswordReset);
app.post('/api/auth/password-reset/verify-totp', authRateLimit, verifyPasswordResetTotp);
app.post('/api/auth/password-reset/confirm', authRateLimit, resetPassword);
app.post('/api/auth/setup-mfa', authRateLimit, requireMfaSetup, completeMfaSetup);
app.post('/api/auth/verify-facial', authRateLimit, requireMfaSession, verifyFacialMfa);
app.post('/api/auth/verify-totp', authRateLimit, requireMfaSession, verifyTotpMfa);
app.post('/api/privacy/notice/accept', authRateLimit, recordPrivacyNoticeAcceptance);
app.post('/api/privacy/quote-legal', legalSelectionRateLimit, recordQuoteLegalSelection);
app.post('/api/privacy/onboarding-legal', legalSelectionRateLimit, requireOnboardingSession, recordOnboardingLegalSelection);
app.post('/api/privacy/cookies/decision', recordCookieDecision);
app.post('/api/cotizacion', sendQuoteRequest);

// --- RUTAS DE ADMINISTRADOR ---
app.get('/api/admin', requireAuth, getAdminProfile);
app.put('/api/admin', requireAuth, updateAdminProfile);
app.get('/api/admin/me', requireAuth, getAdminProfile);
app.put('/api/admin/me', requireAuth, updateAdminProfile);
app.get('/api/admin/audit-logs', requireAuth, getAuditHistory);
app.post('/api/support', requireAuth, supportRateLimit, sendSupportRequest);
app.get('/api/privacy/access', requireAuth, getPrivacyAccess);
app.patch('/api/privacy/rectification', requireAuth, rectifyPrivacyData);
app.get('/api/privacy/rectification/status', requireAuth, getMyRectificationStatus);
app.post('/api/privacy/rectification/review-by-email', reviewRectificationByEmail);
app.post('/api/privacy/cancellation', requireAuth, cancelPrivacyAccount);
app.get('/api/privacy/audit', requireAuth, getPrivacyAudit);
app.get('/api/privacy/legal-history', requireAuth, getLegalConsentHistory);
app.get('/api/admin/:id', requireAuth, getAdminProfile);
app.put('/api/admin/:id', requireAuth, updateAdminProfile);

// --- RUTAS CRUD DE CONDUCTORES Y ESP32 ---
app.post('/api/drivers', requireAuth, createDriver);
app.get('/api/drivers', requireAuth, getDrivers);
app.put('/api/drivers/:id', requireAuth, updateDriver);
app.delete('/api/drivers/:id', requireAuth, deleteDriver);

// --- RUTAS DE DASHBOARD Y TELEMETRÍA ---
app.use('/api/dashboard', dashboardReadRateLimit);
app.get('/api/dashboard/events', requireAuth, getEventsDashboard);
app.get('/api/dashboard/gps', requireAuth, getGpsTracking);
app.post('/api/dashboard/route', requireAuth, getBestRoute);
app.post('/api/telemetry/events', requireDeviceKey, ingestDeviceEvent);
app.post('/api/privacy/arco/gmail/authorize', authorizeArcoWithGmail);
app.get('/api/privacy/arco/gmail/callback', gmailArcoCallback);

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
