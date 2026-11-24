import bcrypt from 'bcryptjs';
import { pool } from '../models/db';

function argument(name: string): string {
    const index = process.argv.indexOf(`--${name}`);
    const value = index >= 0 ? process.argv[index + 1] : undefined;
    if (!value) throw new Error(`Falta el argumento --${name}`);
    return value;
}

async function main(): Promise<void> {
    const nombre = argument('nombre');
    const email = argument('email').trim().toLowerCase();
    const empresa = argument('empresa');
    const temporaryPassword = argument('temporary-password');
    const expiryIndex = process.argv.indexOf('--expires-hours');
    const hours = Number(expiryIndex >= 0 ? process.argv[expiryIndex + 1] : '24');

    if (temporaryPassword.length < 12) throw new Error('La contraseña temporal debe tener al menos 12 caracteres.');
    if (!Number.isFinite(hours) || hours <= 0) throw new Error('Las horas de expiración no son válidas.');

    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    await pool.query(`
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS empresa TEXT;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS account_role TEXT NOT NULL DEFAULT 'admin';
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active';
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_login_required BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_facial_status BOOLEAN NOT NULL DEFAULT FALSE;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_nonce TEXT;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS mfa_setup_expires_at TIMESTAMPTZ;
        ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);
    const result = await pool.query(
        `INSERT INTO admins
            (nombre, email, password, empresa, account_role, account_status,
             first_login_required, temporary_password_expires_at, totp_enabled, mfa_facial_status)
         VALUES ($1, $2, $3, $4, 'admin', 'active', TRUE,
                 NOW() + ($5::text || ' hours')::interval, FALSE, FALSE)
         ON CONFLICT (email) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            empresa = EXCLUDED.empresa,
            password = EXCLUDED.password,
            account_role = 'admin',
            account_status = 'active',
            first_login_required = TRUE,
            temporary_password_expires_at = EXCLUDED.temporary_password_expires_at,
            totp_enabled = FALSE,
            mfa_facial_status = FALSE,
            mfa_nonce = NULL,
            mfa_setup_expires_at = NULL,
            updated_at = NOW()
         RETURNING id, email, empresa, temporary_password_expires_at`,
        [nombre, email, passwordHash, empresa, hours]
    );

    console.table(result.rows);
    console.log('Cuenta provisional creada. Entrega las credenciales únicamente por el canal corporativo autorizado.');
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => void pool.end());
