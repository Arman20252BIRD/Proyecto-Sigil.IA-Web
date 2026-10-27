import express, { Request, Response } from 'express';
import cors from 'cors';

// Importación directa de tus controladores
import { loginStepOne, verifyFacialMfa } from './controllers/auth.controller';
import { getAdminProfile, updateAdminProfile } from './controllers/admin.controller';
import { createDriver, getDrivers, updateDriver, deleteDriver } from './controllers/driver.controller';
import { getEventsDashboard, getGpsTracking } from './controllers/dashboard.controller';

const app = express();

// Middlewares globales
app.use(cors());
app.use(express.json());

// --- RUTA DE VERIFICACIÓN DE ESTADO ---
app.get('/api/health', (req: Request, res: Response) => {
    res.json({ status: 'OK', system: 'SIGIL.IA Backend Active' });
});

// --- RUTAS DE AUTENTICACIÓN (LOGIN SIGIL.IA) ---
app.post('/api/auth/login-step1', loginStepOne);
app.post('/api/auth/verify-facial', verifyFacialMfa);

// --- RUTAS DE ADMINISTRADOR ---
app.get('/api/admin/:id', getAdminProfile);
app.put('/api/admin/:id', updateAdminProfile);

// --- RUTAS CRUD DE CONDUCTORES Y ESP32 ---
app.post('/api/drivers', createDriver);
app.get('/api/drivers', getDrivers);
app.put('/api/drivers/:id', updateDriver);
app.delete('/api/drivers/:id', deleteDriver);

// --- RUTAS DE DASHBOARD Y TELEMETRÍA ---
app.get('/api/dashboard/events', getEventsDashboard);
app.get('/api/dashboard/gps', getGpsTracking);

export default app;