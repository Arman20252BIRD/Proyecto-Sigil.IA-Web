// Run from servidor: node --import tsx tests/arco-request.test.cjs
// Resend is simulated; no email or personal documents are sent.
const assert = require('node:assert/strict');
const { sendArcoRequest } = require('../controllers/gmail.controller.ts');

function response() {
  return { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

async function run() {
  const previousFetch = global.fetch;
  const previousKey = process.env.RESEND_SUPPORT_API_KEY;
  const previousFrom = process.env.RESEND_SUPPORT_FROM;
  try {
    process.env.RESEND_SUPPORT_API_KEY = 'test-key';
    process.env.RESEND_SUPPORT_FROM = 'Sigilia <soporte@example.invalid>';
    let sent;
    global.fetch = async (_url, options) => { sent = JSON.parse(options.body); return { ok: true, status: 200 }; };
    const req = { body: {
      nombre: 'Persona de prueba', contacto: 'persona@example.invalid', derechos: ['acceso', 'cancelacion'],
      solicitudText: 'Solicito mis datos', solicitudHtml: '<b onclick="alert(1)">Solicito mis datos</b><script>alert(1)</script>',
      attachments: [{ filename: 'identidad.pdf', mimeType: 'application/pdf', dataBase64: Buffer.from('test').toString('base64') }],
    } };
    const success = response();
    await sendArcoRequest(req, success);
    assert.equal(success.statusCode, 201);
    assert.deepEqual(sent.to, ['soporte@sigilia.com.mx']);
    assert.equal(sent.reply_to, 'persona@example.invalid');
    assert.equal(sent.attachments[0].filename, 'identidad.pdf');
    assert.match(sent.subject, /Acceso, Cancelación/);
    assert.match(sent.html, /<b>Solicito mis datos<\/b>/);
    assert.doesNotMatch(sent.html, /onclick|script|alert/);
    const invalid = response();
    sent = undefined;
    await sendArcoRequest({ body: { ...req.body, derechos: [] } }, invalid);
    assert.equal(invalid.statusCode, 400);
    assert.equal(sent, undefined);
    const invalidFile = response();
    await sendArcoRequest({ body: { ...req.body, attachments: [{ filename: 'x.pdf', mimeType: 'application/pdf', dataBase64: 'ab=c' }] } }, invalidFile);
    assert.equal(invalidFile.statusCode, 400);
    global.fetch = async () => ({ ok: false, status: 403 });
    const failed = response();
    await sendArcoRequest(req, failed);
    assert.equal(failed.statusCode, 502);
    assert.notEqual(failed.body.ok, true);
    console.log('Solicitud ARCO, adjuntos, destinatario y errores verificados sin enviar correos.');
  } finally {
    global.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_SUPPORT_API_KEY; else process.env.RESEND_SUPPORT_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.RESEND_SUPPORT_FROM; else process.env.RESEND_SUPPORT_FROM = previousFrom;
  }
}
run().catch((error) => { console.error(error); process.exitCode = 1; });
