INSERT INTO admins (
    id, nombre, email, password, telefono_corporativo, empresa,
    face_template_encrypted, totp_secret_encrypted,
    totp_enabled, mfa_nonce, mfa_facial_status, updated_at
)
VALUES (
    1,
    'Administrador Sigil',
    'admin@sigil.local',
    '$2b$10$HZT3sgfqPWhH6RJeuVQoOun3ysDRAo4NbWOCUb9a1FLRTMCQQC.Nu',
    '+52 555 010 2024',
    'Sigil.IA Demo',
    NULL,
    NULL,
    FALSE,
    NULL,
    FALSE,
    CURRENT_TIMESTAMP
)
ON CONFLICT (email) DO UPDATE
SET nombre = EXCLUDED.nombre,
    password = EXCLUDED.password,
    telefono_corporativo = EXCLUDED.telefono_corporativo,
    empresa = EXCLUDED.empresa,
    face_template_encrypted = EXCLUDED.face_template_encrypted,
    totp_secret_encrypted = EXCLUDED.totp_secret_encrypted,
    totp_enabled = EXCLUDED.totp_enabled,
    totp_last_used_step = NULL,
    mfa_nonce = EXCLUDED.mfa_nonce,
    mfa_facial_status = EXCLUDED.mfa_facial_status,
    mfa_failed_attempts = 0,
    mfa_locked_until = NULL,
    mfa_setup_expires_at = NULL,
    updated_at = CURRENT_TIMESTAMP;

INSERT INTO vehicles (id, numero_flota, modelo, placas, hardware_id)
VALUES
    (1, 'MX-001', 'Mercedes Sprinter', 'ABC-12-34', 'ESP32-001'),
    (2, 'MX-002', 'Ford Transit', 'DEF-56-78', 'ESP32-002')
ON CONFLICT (hardware_id) DO UPDATE
SET numero_flota = EXCLUDED.numero_flota,
    modelo = EXCLUDED.modelo,
    placas = EXCLUDED.placas;

INSERT INTO drivers (id, nombre, email, telefono, estatus_operativo, vehicle_id)
VALUES
    (1, 'Ana García', 'ana.garcia@sigil.local', '+52 555 100 1001', 'En ruta', 1),
    (2, 'Luis Ramírez', 'luis.ramirez@sigil.local', '+52 555 100 1002', 'Atención', 2)
ON CONFLICT (id) DO UPDATE
SET nombre = EXCLUDED.nombre,
    email = EXCLUDED.email,
    telefono = EXCLUDED.telefono,
    estatus_operativo = EXCLUDED.estatus_operativo,
    vehicle_id = EXCLUDED.vehicle_id;

INSERT INTO events (id, driver_id, created_at)
VALUES
    (1, 1, NOW() - INTERVAL '2 days'),
    (2, 1, NOW() - INTERVAL '1 day'),
    (3, 2, NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO UPDATE
SET driver_id = EXCLUDED.driver_id,
    created_at = EXCLUDED.created_at;

INSERT INTO gps_tracks (id, vehicle_id, "timestamp", latitude, longitude)
VALUES
    (1, 1, NOW() - INTERVAL '15 minutes', 19.4326, -99.1332),
    (2, 2, NOW() - INTERVAL '12 minutes', 19.4355, -99.1257)
ON CONFLICT (id) DO UPDATE
SET vehicle_id = EXCLUDED.vehicle_id,
    "timestamp" = EXCLUDED."timestamp",
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude;

SELECT setval(pg_get_serial_sequence('admins', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM admins), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('vehicles', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM vehicles), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('drivers', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM drivers), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('events', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM events), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('gps_tracks', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM gps_tracks), 1), 1), TRUE);
