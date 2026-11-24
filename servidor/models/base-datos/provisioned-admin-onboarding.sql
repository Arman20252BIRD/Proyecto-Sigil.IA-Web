-- Campos para cuentas creadas previamente por soporte.
-- El soporte debe insertar el administrador usando una contraseña bcrypt,
-- nunca una contraseña en texto plano.

ALTER TABLE admins ADD COLUMN IF NOT EXISTS first_login_required BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS temporary_password_expires_at TIMESTAMPTZ;
