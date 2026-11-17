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
ON CONFLICT (email) DO NOTHING;

INSERT INTO vehicles (id, numero_flota, modelo, placas, hardware_id)
VALUES
    (1, 'MX-001', 'Mercedes Sprinter', 'ABC-12-34', 'ESP32-001'),
    (2, 'MX-002', 'Ford Transit', 'DEF-56-78', 'ESP32-002')
ON CONFLICT DO NOTHING;

INSERT INTO drivers (id, nombre, email, telefono, estatus_operativo, vehicle_id)
VALUES
    (1, 'Ana García', 'ana.garcia@sigil.local', '+52 555 100 1001', 'En ruta', 1),
    (2, 'Luis Ramírez', 'luis.ramirez@sigil.local', '+52 555 100 1002', 'Atención', 2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO events (id, driver_id, created_at)
VALUES
    (1, 1, NOW() - INTERVAL '2 days'),
    (2, 1, NOW() - INTERVAL '1 day'),
    (3, 2, NOW() - INTERVAL '6 hours')
ON CONFLICT (id) DO NOTHING;

INSERT INTO gps_tracks (id, vehicle_id, "timestamp", latitude, longitude)
VALUES
    (1, 1, NOW() - INTERVAL '15 minutes', 19.4326, -99.1332),
    (2, 2, NOW() - INTERVAL '12 minutes', 19.4355, -99.1257)
ON CONFLICT (id) DO NOTHING;

WITH demo_vehicles(numero_flota, modelo, placas, hardware_id) AS (
    VALUES
        ('MX-003', 'Nissan Urvan', 'GHI-90-12', 'ESP32-003'),
        ('MX-004', 'Volkswagen Crafter', 'JKL-34-56', 'ESP32-004'),
        ('MX-005', 'Toyota Hiace', 'MNO-78-90', 'ESP32-005'),
        ('MX-006', 'RAM ProMaster', 'PQR-12-34', 'ESP32-006')
)
INSERT INTO vehicles (numero_flota, modelo, placas, hardware_id)
SELECT dv.numero_flota, dv.modelo, dv.placas, dv.hardware_id
FROM demo_vehicles dv
WHERE NOT EXISTS (
    SELECT 1
    FROM vehicles v
    WHERE v.numero_flota = dv.numero_flota
       OR v.placas = dv.placas
       OR v.hardware_id = dv.hardware_id
);

WITH demo_drivers(nombre, email, telefono, estatus_operativo, numero_flota) AS (
    VALUES
        ('Sofía Herrera', 'sofia.herrera@sigil.local', '+52 555 200 3001', 'En ruta', 'MX-003'),
        ('Diego Navarro', 'diego.navarro@sigil.local', '+52 555 200 3002', 'Atención', 'MX-004'),
        ('Valeria Torres', 'valeria.torres@sigil.local', '+52 555 200 3003', 'En ruta', 'MX-005'),
        ('Mateo Castillo', 'mateo.castillo@sigil.local', '+52 555 200 3004', 'Sin conexión', 'MX-006')
)
INSERT INTO drivers (nombre, email, telefono, estatus_operativo, vehicle_id)
SELECT dd.nombre, dd.email, dd.telefono, dd.estatus_operativo, v.id
FROM demo_drivers dd
JOIN vehicles v ON v.numero_flota = dd.numero_flota
WHERE NOT EXISTS (
    SELECT 1 FROM drivers d WHERE lower(d.email) = lower(dd.email)
);

WITH demo_events(email, event_time) AS (
    VALUES
        ('sofia.herrera@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '10 hours'),
        ('sofia.herrera@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '16 hours'),
        ('diego.navarro@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '11 hours'),
        ('diego.navarro@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '17 hours'),
        ('valeria.torres@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '9 hours'),
        ('valeria.torres@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '15 hours'),
        ('mateo.castillo@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '12 hours'),
        ('mateo.castillo@sigil.local', date_trunc('day', NOW()) - INTERVAL '1 day' + INTERVAL '18 hours')
)
INSERT INTO events (driver_id, created_at)
SELECT d.id, de.event_time
FROM demo_events de
JOIN drivers d ON lower(d.email) = lower(de.email)
WHERE NOT EXISTS (
    SELECT 1 FROM events e WHERE e.driver_id = d.id AND e.created_at = de.event_time
);

WITH demo_positions(numero_flota, latitude, longitude) AS (
    VALUES
        ('MX-003', 19.4271::DOUBLE PRECISION, -99.1677::DOUBLE PRECISION),
        ('MX-004', 19.4412::DOUBLE PRECISION, -99.1543::DOUBLE PRECISION),
        ('MX-005', 19.4198::DOUBLE PRECISION, -99.1426::DOUBLE PRECISION),
        ('MX-006', 19.4504::DOUBLE PRECISION, -99.1211::DOUBLE PRECISION)
)
INSERT INTO gps_tracks (vehicle_id, "timestamp", latitude, longitude)
SELECT v.id, NOW() - INTERVAL '10 minutes', dp.latitude, dp.longitude
FROM demo_positions dp
JOIN vehicles v ON v.numero_flota = dp.numero_flota
WHERE NOT EXISTS (SELECT 1 FROM gps_tracks gt WHERE gt.vehicle_id = v.id);

SELECT setval(pg_get_serial_sequence('admins', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM admins), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('vehicles', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM vehicles), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('drivers', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM drivers), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('events', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM events), 1), 1), TRUE);
SELECT setval(pg_get_serial_sequence('gps_tracks', 'id'), GREATEST(COALESCE((SELECT MAX(id) FROM gps_tracks), 1), 1), TRUE);
