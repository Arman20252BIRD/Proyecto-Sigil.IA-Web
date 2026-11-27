-- Invalida las sesiones anteriores cuando se reinicia el perfil de un administrador.
ALTER TABLE admins ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
