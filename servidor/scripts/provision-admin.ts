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
    const password = argument('password');
    if (password.length < 12) throw new Error('La contrasena debe tener al menos 12 caracteres.');
    const passwordHash = await bcrypt.hash(password, 12);
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
                 NULL, FALSE, FALSE)
         ON CONFLICT (email) DO UPDATE SET
            nombre = EXCLUDED.nombre,
            empresa = EXCLUDED.empresa,
            password = EXCLUDED.password,
            account_role = 'admin',
            account_status = 'active',
            first_login_required = TRUE,
            temporary_password_expires_at = NULL,
            totp_enabled = FALSE,
            mfa_facial_status = FALSE,
            mfa_nonce = NULL,
            mfa_setup_expires_at = NULL,
            updated_at = NOW()
         RETURNING id, email, empresa, first_login_required`,
        [nombre, email, passwordHash, empresa]
    );

    console.table(result.rows);
    console.log('Cuenta administrativa creada. Entrega las credenciales únicamente por el canal corporativo autorizado.');
}

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => void pool.end());
