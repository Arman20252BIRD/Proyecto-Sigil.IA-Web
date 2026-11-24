-- Migración para cerrar el registro y habilitar altas por invitación.
-- Ejecutar una vez sobre la base de datos de SIGILIA.

CREATE TABLE IF NOT EXISTS admin_invitations (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    empresa TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
    token_hash TEXT NOT NULL UNIQUE,
    payment_reference TEXT,
    created_by TEXT NOT NULL DEFAULT 'SIGILIA_SUPPORT',
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS admin_invitations_email_idx
    ON admin_invitations(email, expires_at DESC);
CREATE INDEX IF NOT EXISTS admin_invitations_active_idx
    ON admin_invitations(token_hash, used_at, expires_at);

ALTER TABLE pending_admin_enrollments
    ADD COLUMN IF NOT EXISTS invitation_id UUID REFERENCES admin_invitations(id) ON DELETE RESTRICT;
ALTER TABLE pending_admin_enrollments
    ADD COLUMN IF NOT EXISTS account_role TEXT NOT NULL DEFAULT 'admin';
