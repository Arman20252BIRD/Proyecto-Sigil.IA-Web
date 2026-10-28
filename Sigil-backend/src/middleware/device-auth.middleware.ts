import { NextFunction, Request, Response } from 'express';

export function requireDeviceKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env.ESP32_INGEST_KEY;
  const providedKey = req.header('x-device-key');
  if (!configuredKey || !providedKey || providedKey !== configuredKey) {
    res.status(401).json({ error: 'Dispositivo no autorizado.' });
    return;
  }
  next();
}
