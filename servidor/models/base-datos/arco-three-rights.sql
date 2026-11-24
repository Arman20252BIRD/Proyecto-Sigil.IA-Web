-- Alcance funcional de SIGILIA: Acceso, Rectificación y Cancelación.
-- Ejecutar una sola vez en una base existente después de schema.sql.
-- No elimina solicitudes ni bitácoras; solo evita nuevas acciones OPOSITION.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM privacy_audit_logs
        WHERE action = 'OPPOSITION'
    ) THEN
        RAISE EXCEPTION 'Existen registros OPOSITION. Revísalos antes de aplicar este catálogo de tres derechos.';
    END IF;
END $$;

ALTER TABLE privacy_audit_logs
    DROP CONSTRAINT IF EXISTS privacy_audit_logs_action_check;

ALTER TABLE privacy_audit_logs
    ADD CONSTRAINT privacy_audit_logs_action_check
    CHECK (action IN ('ACCESS', 'RECTIFICATION', 'CANCELLATION', 'CONSENT'));
