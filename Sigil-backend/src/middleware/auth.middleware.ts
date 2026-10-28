import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../config/auth';

export interface AuthRequest extends Request {
  admin?: {
    id: string;
    email: string;
    nombre: string;
    mfaJti?: string;
    enrollmentJti?: string;
    setupJti?: string;
  };
}

type TokenPurpose = 'mfa' | 'access' | 'enroll' | 'setup';

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

export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (authenticate('access', req, res)) next();
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
