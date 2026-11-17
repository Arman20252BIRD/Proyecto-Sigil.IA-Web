import 'dotenv/config';
import { randomBytes } from 'node:crypto';

const configuredSecret = process.env.JWT_SECRET;

if (process.env.NODE_ENV === 'production' && (!configuredSecret || configuredSecret.length < 32)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

export const jwtSecret = configuredSecret ?? randomBytes(32).toString('hex');
