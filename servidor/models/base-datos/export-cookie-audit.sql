-- Exportación interna de TI: auditoría de decisiones de cookies.
--
-- Ejecución desde PowerShell, ubicado en la raíz del proyecto:
--   psql -U postgres -d NOMBRE_DE_LA_BASE -f servidor/models/base-datos/export-cookie-audit.sql
--
-- El archivo se crea en la carpeta desde la que se ejecuta psql.
-- Esta operación es solo de consulta/exportación y no modifica audit_logs.

\copy (
    SELECT format(
        E'ID: %s\nFecha y hora UTC: %s\nAcción: %s\nTipo de recurso: %s\nVersión o recurso: %s\nAdministrador asociado: %s\nResultado: %s\nIP: %s\nNavegador: %s\nDetalles: %s\nMotivo de fallo: %s\n------------------------------------------------------------\n',
        id,
        to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS.MS UTC'),
        action,
        COALESCE(resource_type, 'N/D'),
        COALESCE(resource_id, 'N/D'),
        COALESCE(admin_id::text, 'Visitante no autenticado'),
        CASE WHEN success THEN 'Correcto' ELSE 'Fallido' END,
        COALESCE(host(ip_address), 'N/D'),
        COALESCE(user_agent, 'N/D'),
        jsonb_pretty(details),
        COALESCE(failure_reason, 'N/D')
    )
    FROM audit_logs
    WHERE resource_type = 'cookie_consent'
       OR action IN ('COOKIE_CONSENT_ACCEPTED', 'COOKIE_CONSENT_REJECTED', 'COOKIE_PREFERENCES_UPDATED')
    ORDER BY created_at ASC
) TO 'sigilia-cookie-audit.txt' WITH (FORMAT text, ENCODING 'UTF8');
