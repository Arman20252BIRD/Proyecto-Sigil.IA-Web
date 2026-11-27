import { pool } from './db';

let schemaReady: Promise<void> | null = null;

/** Ensures password recovery works against existing PostgreSQL databases. */
export function ensurePasswordResetSchema(): Promise<void> {
    if (schemaReady) return schemaReady;

    schemaReady = (async () => {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS password_reset_tokens (
                token_hash TEXT PRIMARY KEY,
                admin_id BIGINT NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
                expires_at TIMESTAMPTZ NOT NULL,
                used_at TIMESTAMPTZ,
                created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
        `);
        await pool.query(
            'CREATE INDEX IF NOT EXISTS password_reset_tokens_admin_idx ON password_reset_tokens(admin_id)'
        );
        await pool.query(
            'CREATE INDEX IF NOT EXISTS password_reset_tokens_expiry_idx ON password_reset_tokens(expires_at)'
        );
    })().catch((error) => {
        schemaReady = null;
        throw error;
    });

    return schemaReady;
}
