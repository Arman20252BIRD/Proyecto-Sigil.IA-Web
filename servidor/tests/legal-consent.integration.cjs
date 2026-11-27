// Run from servidor: node --import tsx tests/legal-consent.integration.cjs
// All database fixtures are rolled back and the mail provider is simulated.
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { pool } = require('../models/db.ts');
const { recordQuoteLegalSelection, recordOnboardingLegalSelection, getLegalConsentHistory } = require('../controllers/privacy.controller.ts');
const { sendQuoteRequest } = require('../controllers/quote.controller.ts');
const { completeAdminOnboarding } = require('../controllers/auth.controller.ts');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function run() {
  const client = await pool.connect();
  const originalConnect = pool.connect.bind(pool);
  const originalQuery = pool.query.bind(pool);
  const originalFetch = global.fetch;
  const originalKey = process.env.RESEND_API_KEY;
  const originalQuoteKey = process.env.RESEND_QUOTE_API_KEY;
  const originalFrom = process.env.RESEND_FROM;
  const originalError = console.error;
  await client.query('BEGIN');
  try {
    let failConsentInsert = false;
    const proxy = {
      query(sql, params) {
        if (failConsentInsert && typeof sql === 'string' && sql.includes('INSERT INTO privacy_consents')) return Promise.reject(new Error('simulated audit failure'));
        if (sql === 'BEGIN') return client.query('SAVEPOINT legal_test');
        if (sql === 'COMMIT') return client.query('RELEASE SAVEPOINT legal_test');
        if (sql === 'ROLLBACK') return client.query('ROLLBACK TO SAVEPOINT legal_test');
        return client.query(sql, params);
      },
      release() {},
    };
    pool.connect = async () => proxy;
    pool.query = (...args) => client.query(...args);
    const suffix = randomUUID();
    const account = await client.query('INSERT INTO admins (nombre,email,password,first_login_required,totp_enabled,totp_secret_encrypted) VALUES ($1,$2,$3,TRUE,TRUE,$4) RETURNING id', ['Prueba', `legal-${suffix}@example.invalid`, 'test', 'test-secret']);
    const id = String(account.rows[0].id);
    const req = { admin: { id }, headers: {}, body: {}, header: () => undefined, get: () => undefined };

    req.body = { checked: true };
    const checked = response();
    await recordOnboardingLegalSelection(req, checked);
    assert.equal(checked.statusCode, 201);
    const history = response();
    await getLegalConsentHistory(req, history);
    assert.ok(history.body.items.some((item) => item.action === 'ONBOARDING_LEGAL_CHECKED'));

    req.body = { checked: true };
    const receipt = response();
    await recordQuoteLegalSelection(req, receipt);
    assert.equal(receipt.statusCode, 201);
    assert.ok(receipt.body.receiptId);
    const quote = { plan: 'Plan PyME', contact: 'Prueba', email: 'test@example.invalid', phone: '1234567890', company: 'Prueba', fleet: '1 a 5', privacyAccepted: true, quoteConsentId: receipt.body.receiptId };
    process.env.RESEND_API_KEY = 'test-key';
    delete process.env.RESEND_QUOTE_API_KEY;
    process.env.RESEND_FROM = 'Sigilia <ventas@sigilia.com.mx>';
    let sent = 0;
    global.fetch = async () => { sent += 1; return { ok: true }; };
    const sentResponse = response();
    await sendQuoteRequest({ ...req, body: quote }, sentResponse);
    assert.equal(sentResponse.statusCode, 201);
    assert.equal(sent, 1);
    const unchecked = response();
    await recordQuoteLegalSelection({ ...req, body: { checked: false, receiptId: receipt.body.receiptId } }, unchecked);
    assert.equal(unchecked.statusCode, 201);
    const rejected = response();
    await sendQuoteRequest({ ...req, body: quote }, rejected);
    assert.equal(rejected.statusCode, 400);
    assert.equal(sent, 1);

    const onboardingRequest = { ...req, body: { nombre: 'Prueba legal', password: 'TestPassword1234', faceDescriptor: Array.from({ length: 1024 }, (_, index) => index === 0 ? 1 : 0), privacyNoticeAccepted: true, termsAccepted: true, biometricConsent: true, marketingConsent: false } };
    failConsentInsert = true;
    console.error = () => {};
    const failedOnboarding = response();
    await completeAdminOnboarding(onboardingRequest, failedOnboarding);
    console.error = originalError;
    failConsentInsert = false;
    assert.equal(failedOnboarding.statusCode, 500);
    assert.equal((await client.query('SELECT first_login_required FROM admins WHERE id = $1', [id])).rows[0].first_login_required, true);
    assert.equal((await client.query('SELECT 1 FROM privacy_consents WHERE admin_id = $1', [id])).rowCount, 0);

    const onboarding = response();
    await completeAdminOnboarding(onboardingRequest, onboarding);
    assert.equal(onboarding.statusCode, 200);
    const consents = await client.query("SELECT consent_type, accepted FROM privacy_consents WHERE admin_id=$1 AND consent_type IN ('privacy_notice','terms') ORDER BY consent_type", [id]);
    assert.deepEqual(consents.rows.map((item) => [item.consent_type, item.accepted]), [['privacy_notice', true], ['terms', true]]);
    const completedHistory = response();
    await getLegalConsentHistory(req, completedHistory);
    assert.ok(completedHistory.body.items.some((item) => item.action === 'CONSENT_TERMS' && item.accepted));
    assert.ok(completedHistory.body.items.some((item) => item.action === 'CONSENT_PRIVACY_NOTICE' && item.accepted));
    console.log('Casillas, historial por cuenta, aceptación de cotización y activación verificadas.');
  } finally {
    pool.connect = originalConnect;
    pool.query = originalQuery;
    global.fetch = originalFetch;
    console.error = originalError;
    for (const [key, value] of [['RESEND_API_KEY', originalKey], ['RESEND_QUOTE_API_KEY', originalQuoteKey], ['RESEND_FROM', originalFrom]]) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    await client.query('ROLLBACK');
    client.release();
    await pool.end();
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
