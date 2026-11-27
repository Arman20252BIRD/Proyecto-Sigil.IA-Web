import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../controllers/auth.config';
import { pool } from '../models/db';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    nombre: string;
    sessionVersion: number;
    mfaJti?: string;
    enrollmentJti?: string;
    setupJti?: string;
  };
}

type TokenPurpose = 'mfa' | 'access' | 'enroll' | 'setup' | 'onboarding';

function authenticate(purpose: TokenPurpose, req: AuthRequest, res: Response): boolean {
  const authorization = req.headers.authorization;
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: 'No autorizado: falta token de sesión.' });
    return false;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    if (typeof payload === 'string'
      || payload.purpose !== purpose
      || typeof payload.sub !== 'string'
      || (purpose !== 'enroll' && !/^\d+$/.test(payload.sub))
      || typeof payload.email !== 'string'
      || typeof payload.nombre !== 'string'
      || (purpose !== 'access' && typeof payload.jti !== 'string')) {
      res.status(401).json({ error: 'Token inválido o expirado.' });
      return false;
    }

    req.admin = {
      id: payload.sub,
      email: payload.email,
      nombre: payload.nombre,
      sessionVersion: typeof payload.sessionVersion === 'number' ? payload.sessionVersion : 0,
      ...(purpose === 'mfa' ? { mfaJti: payload.jti as string } : {}),
      ...(purpose === 'enroll' ? { enrollmentJti: payload.jti as string } : {}),
      ...(purpose === 'setup' ? { setupJti: payload.jti as string } : {}),
    };
    return true;
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado.' });
    return false;
  }
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!authenticate('access', req, res)) return;
  try {
    const result = await pool.query<{ account_status: string; first_login_required: boolean; session_version: number }>(
      'SELECT account_status, first_login_required, session_version FROM admins WHERE id = $1',
      [req.admin?.id]
    );
    if (!result.rows[0]) {
      res.status(401).json({ error: 'La cuenta ya no existe.' });
      return;
    }
    if (['cancelled', 'blocked'].includes(result.rows[0].account_status)) {
      res.status(403).json({ error: 'Esta cuenta está bloqueada o fue dada de baja.' });
      return;
    }
    if (result.rows[0].first_login_required || result.rows[0].session_version !== req.admin?.sessionVersion) {
      res.status(401).json({ error: 'La sesión expiró. Inicia sesión nuevamente.' });
      return;
    }
  } catch {
    res.status(503).json({ error: 'No fue posible validar el estado de la cuenta.' });
    return;
  }
  next();
};

export const requireMfaSession = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (authenticate('mfa', req, res)) next();
};

export const requireEnrollmentSession = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (authenticate('enroll', req, res)) next();
};

export const requireMfaSetup = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (authenticate('setup', req, res)) next();
};

export const requireOnboardingSession = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  if (!authenticate('onboarding', req, res)) return;
  try {
    const result = await pool.query<{ session_version: number; first_login_required: boolean; account_status: string }>(
      'SELECT session_version, first_login_required, account_status FROM admins WHERE id = $1', [req.admin?.id]
    );
    const account = result.rows[0];
    if (!account || account.account_status !== 'active' || !account.first_login_required || account.session_version !== req.admin?.sessionVersion) {
      res.status(401).json({ error: 'La activación expiró. Inicia sesión nuevamente.' });
      return;
    }
    next();
  } catch {
    res.status(503).json({ error: 'No fue posible validar la activación.' });
  }
};
