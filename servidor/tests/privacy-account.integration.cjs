// Run from servidor: node --import tsx tests/privacy-account.integration.cjs
// The outer transaction is rolled back, including the test accounts and records.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { pool } = require('../models/db.ts');
const { jwtSecret } = require('../controllers/auth.config.ts');
const { rectifyPrivacyData, cancelPrivacyAccount } = require('../controllers/admin.controller.ts');
const { requireAuth } = require('../middleware/auth.middleware.ts');
const { loginStepOne, completeMfaSetup, completeAdminOnboarding } = require('../controllers/auth.controller.ts');
const { generate } = require('otplib');

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function run() {
  const client = await pool.connect();
  const originalConnect = pool.connect.bind(pool);
  const originalQuery = pool.query.bind(pool);
  await client.query('BEGIN');
  try {
    const suffix = randomUUID();
    const created = await client.query(
      'INSERT INTO admins (nombre, email, password) VALUES ($1, $2, $3) RETURNING id',
      ['Cuenta de prueba', `test-${suffix}@example.invalid`, await bcrypt.hash('PruebaSegura123!', 12)]
    );
    const id = String(created.rows[0].id);
    const testClient = {
      query(sql, params) {
        if (sql === 'BEGIN') return client.query('SAVEPOINT privacy_test');
        if (sql === 'COMMIT') return client.query('RELEASE SAVEPOINT privacy_test');
        if (sql === 'ROLLBACK') return client.query('ROLLBACK TO SAVEPOINT privacy_test');
        return client.query(sql, params);
      },
      release() {},
    };
    pool.connect = async () => testClient;
    pool.query = (...args) => client.query(...args);
    const req = {
      admin: { id, email: `test-${suffix}@example.invalid`, nombre: 'Cuenta de prueba' },
      body: {}, headers: {}, header: () => undefined, get: () => undefined,
    };

    req.body = { nombre: 'Nombre actualizado', email: `updated-${suffix}@example.invalid`, telefono: '9991234567' };
    const updated = response();
    await rectifyPrivacyData(req, updated);
    assert.equal(updated.statusCode, 200);
    const account = await client.query('SELECT nombre, email, telefono_corporativo FROM admins WHERE id = $1', [id]);
    assert.deepEqual(account.rows[0], { nombre: 'Nombre actualizado', email: `updated-${suffix}@example.invalid`, telefono_corporativo: '9991234567' });

    const other = await client.query('INSERT INTO admins (nombre, email, password) VALUES ($1, $2, $3) RETURNING id', ['Otra cuenta de prueba', `other-${suffix}@example.invalid`, 'not-a-login-password']);
    const ownVehicle = await client.query('INSERT INTO vehicles DEFAULT VALUES RETURNING id');
    const sharedVehicle = await client.query('INSERT INTO vehicles DEFAULT VALUES RETURNING id');
    const ownDriver = await client.query('INSERT INTO drivers (nombre, admin_id, vehicle_id) VALUES ($1, $2, $3) RETURNING id', ['Conductor de prueba', id, ownVehicle.rows[0].id]);
    const ownSharedDriver = await client.query('INSERT INTO drivers (nombre, admin_id, vehicle_id) VALUES ($1, $2, $3) RETURNING id', ['Conductor compartido', id, sharedVehicle.rows[0].id]);
    const otherDriver = await client.query('INSERT INTO drivers (nombre, admin_id, vehicle_id) VALUES ($1, $2, $3) RETURNING id', ['Otro conductor', other.rows[0].id, sharedVehicle.rows[0].id]);
    const ownEvent = await client.query('INSERT INTO events (driver_id) VALUES ($1) RETURNING id', [ownDriver.rows[0].id]);
    const otherEvent = await client.query('INSERT INTO events (driver_id) VALUES ($1) RETURNING id', [otherDriver.rows[0].id]);
    const ownGps = await client.query('INSERT INTO gps_tracks (vehicle_id, latitude, longitude) VALUES ($1, $2, $3) RETURNING id', [ownVehicle.rows[0].id, 20.9, -89.6]);
    const sharedGps = await client.query('INSERT INTO gps_tracks (vehicle_id, latitude, longitude) VALUES ($1, $2, $3) RETURNING id', [sharedVehicle.rows[0].id, 20.9, -89.6]);

    req.body = { confirmation: 'NO' };
    const unconfirmed = response();
    await cancelPrivacyAccount(req, unconfirmed);
    assert.equal(unconfirmed.statusCode, 400);
    assert.equal((await client.query('SELECT 1 FROM admins WHERE id = $1', [id])).rowCount, 1);

    req.body = { confirmation: 'CONFIRMAR' };
    const deleted = response();
    await cancelPrivacyAccount(req, deleted);
    assert.equal(deleted.statusCode, 200);
    const resetAccount = await client.query('SELECT email, password, first_login_required, totp_enabled, face_template_encrypted, profile_photo, session_version FROM admins WHERE id = $1', [id]);
    assert.equal(resetAccount.rowCount, 1);
    assert.equal(resetAccount.rows[0].email, `updated-${suffix}@example.invalid`);
    assert.equal(await bcrypt.compare('PruebaSegura123!', resetAccount.rows[0].password), true);
    assert.equal(resetAccount.rows[0].first_login_required, true);
    assert.equal(resetAccount.rows[0].totp_enabled, false);
    assert.equal(resetAccount.rows[0].face_template_encrypted, null);
    assert.equal(resetAccount.rows[0].profile_photo, null);
    assert.equal(resetAccount.rows[0].session_version, 1);
    assert.equal((await client.query('SELECT 1 FROM drivers WHERE id IN ($1, $2)', [ownDriver.rows[0].id, ownSharedDriver.rows[0].id])).rowCount, 0);
    assert.equal((await client.query('SELECT 1 FROM events WHERE id = $1', [ownEvent.rows[0].id])).rowCount, 0);
    assert.equal((await client.query('SELECT 1 FROM vehicles WHERE id = $1', [ownVehicle.rows[0].id])).rowCount, 0);
    assert.equal((await client.query('SELECT 1 FROM gps_tracks WHERE id = $1', [ownGps.rows[0].id])).rowCount, 0);
    assert.equal((await client.query('SELECT 1 FROM admins WHERE id = $1', [other.rows[0].id])).rowCount, 1);
    assert.equal((await client.query('SELECT 1 FROM drivers WHERE id = $1', [otherDriver.rows[0].id])).rowCount, 1);
    assert.equal((await client.query('SELECT 1 FROM events WHERE id = $1', [otherEvent.rows[0].id])).rowCount, 1);
    assert.equal((await client.query('SELECT 1 FROM vehicles WHERE id = $1', [sharedVehicle.rows[0].id])).rowCount, 1);
    assert.equal((await client.query('SELECT 1 FROM gps_tracks WHERE id = $1', [sharedGps.rows[0].id])).rowCount, 1);
    const audit = await client.query('SELECT admin_id FROM audit_logs WHERE resource_id = $1 AND action = $2', [id, 'PROFILE_RESET']);
    assert.equal(audit.rowCount, 1);
    assert.equal(String(audit.rows[0].admin_id), id);

    const token = jwt.sign({ sub: id, email: req.admin.email, nombre: req.admin.nombre, purpose: 'access' }, jwtSecret);
    const authResponse = response();
    let nextCalled = false;
    await requireAuth({ headers: { authorization: `Bearer ${token}` } }, authResponse, () => { nextCalled = true; });
    assert.equal(authResponse.statusCode, 401);
    assert.equal(nextCalled, false);
    const loginResponse = response();
    await loginStepOne({ body: { email: `updated-${suffix}@example.invalid`, password: 'PruebaSegura123!' }, headers: {}, header: () => undefined, get: () => undefined }, loginResponse);
    assert.equal(loginResponse.statusCode, 200);
    assert.equal(loginResponse.body.enrollmentRequired, true);
    assert.equal(loginResponse.body.onboardingAfterMfa, true);
    assert.match(loginResponse.body.otpAuthUrl, /^otpauth:\/\/totp\//);
    const setup = jwt.verify(loginResponse.body.setupToken, jwtSecret);
    assert.equal(setup.sessionVersion, 1);
    const secret = new URL(loginResponse.body.otpAuthUrl).searchParams.get('secret');
    const setupResponse = response();
    await completeMfaSetup({ admin: { id, setupJti: setup.jti }, body: { otpCode: await generate({ secret }) }, headers: {}, header: () => undefined, get: () => undefined }, setupResponse);
    assert.equal(setupResponse.statusCode, 200);
    assert.equal(setupResponse.body.onboardingRequired, true);
    const onboarding = jwt.verify(setupResponse.body.onboardingToken, jwtSecret);
    assert.equal(onboarding.sessionVersion, 1);
    const onboardingResponse = response();
    await completeAdminOnboarding({ admin: { id, sessionVersion: onboarding.sessionVersion }, body: {
      nombre: 'Perfil renovado', empresa: 'Empresa de prueba', telefono_corporativo: '9991234567',
      password: 'NuevaSegura123!', faceDescriptor: Array(1024).fill(0.1),
      privacyNoticeAccepted: true, termsAccepted: true, biometricConsent: true,
    }, headers: {}, header: () => undefined, get: () => undefined }, onboardingResponse);
    assert.equal(onboardingResponse.statusCode, 200);
    const renewed = await client.query('SELECT first_login_required, password FROM admins WHERE id = $1', [id]);
    assert.equal(renewed.rows[0].first_login_required, false);
    assert.equal(await bcrypt.compare('NuevaSegura123!', renewed.rows[0].password), true);
    const oldSession = response();
    await requireAuth({ headers: { authorization: `Bearer ${token}` } }, oldSession, () => { throw new Error('Sesión anterior aceptada'); });
    assert.equal(oldSession.statusCode, 401);
    const newToken = onboardingResponse.body.token;
    let newSessionAccepted = false;
    await requireAuth({ headers: { authorization: `Bearer ${newToken}` } }, response(), () => { newSessionAccepted = true; });
    assert.equal(newSessionAccepted, true);
    console.log('Perfil reiniciado, datos compartidos protegidos, sesiones anteriores revocadas y nuevo QR verificados.');
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
