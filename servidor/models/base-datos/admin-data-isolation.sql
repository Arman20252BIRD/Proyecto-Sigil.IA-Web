ALTER TABLE drivers ADD COLUMN IF NOT EXISTS admin_id BIGINT REFERENCES admins(id) ON DELETE CASCADE;
ALTER TABLE drivers ALTER COLUMN admin_id SET DEFAULT 1;
UPDATE drivers SET admin_id = (SELECT id FROM admins ORDER BY id LIMIT 1) WHERE admin_id IS NULL;
ALTER TABLE drivers ALTER COLUMN admin_id SET NOT NULL;
CREATE INDEX IF NOT EXISTS drivers_admin_id_idx ON drivers(admin_id);
