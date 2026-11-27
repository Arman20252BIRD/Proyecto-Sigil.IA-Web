// Run from servidor: node --import tsx tests/support-request.test.cjs
// The mail provider and database are simulated; no email is sent.
const assert = require('node:assert/strict');
const { pool } = require('../models/db.ts');
const { sendSupportRequest } = require('../controllers/support.controller.ts');

function response() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

async function run() {
  const originalQuery = pool.query;
  const originalFetch = global.fetch;
  const envKeys = ['RESEND_SUPPORT_API_KEY', 'RESEND_SUPPORT_FROM', 'RESEND_API_KEY', 'RESEND_FROM'];
  const originalEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));
  try {
    process.env.RESEND_SUPPORT_API_KEY = 'test-key';
    process.env.RESEND_SUPPORT_FROM = 'Sigilia <support@example.invalid>';
    pool.query = async (_sql, params) => {
      assert.equal(params[0], '42');
      return { rows: [{ nombre: 'Administrador', email: 'admin@example.invalid', empresa: 'Empresa' }] };
    };
    let sent;
    global.fetch = async (_url, options) => {
      sent = JSON.parse(options.body);
      return { ok: true, status: 200 };
    };
    const req = { admin: { id: '42' }, body: { subject: 'Consulta', message: 'Necesito ayuda con mi cuenta.' } };
    const success = response();
    await sendSupportRequest(req, success);
    assert.equal(success.statusCode, 201);
    assert.deepEqual(sent.to, ['soporte@sigilia.com.mx']);
    assert.equal(sent.reply_to, 'admin@example.invalid');
    assert.match(sent.text, /Necesito ayuda con mi cuenta/);

    const invalid = response();
    sent = undefined;
    await sendSupportRequest({ ...req, body: { subject: 'x', message: 'breve' } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(sent, undefined);

    global.fetch = async () => ({ ok: false, status: 403 });
    const failed = response();
    await sendSupportRequest(req, failed);
    assert.equal(failed.statusCode, 502);
    assert.equal(failed.body.ok, undefined);
    console.log('Envío, destinatario, validación y errores verificados sin enviar correos.');
  } finally {
    pool.query = originalQuery;
    global.fetch = originalFetch;
    for (const key of envKeys) {
      if (originalEnv[key] === undefined) delete process.env[key];
      else process.env[key] = originalEnv[key];
    }
    await pool.end();
  }
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
