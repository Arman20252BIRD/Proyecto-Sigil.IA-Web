# Acceso y MFA facial

## Requisitos

- Backend y PostgreSQL configurados según [Sigil-backend/README.md](../../Sigil-backend/README.md).
- Node.js y dependencias del frontend instaladas con `npm ci`.
- Navegador compatible con cámara; `getUserMedia` requiere `localhost` o HTTPS.
- Aplicación TOTP (por ejemplo, Aegis, FreeOTP o cualquier autenticador compatible con RFC 6238).

## Prueba local

1. Inicia el backend en una terminal:

   ```powershell
   npm --prefix .\Sigil-backend run dev
   ```

2. En otra terminal, inicia Next.js:

   ```powershell
   npm run dev
   ```

3. Abre `http://localhost:3000/login`. En el primer inicio de sesión de una cuenta existente, escanea el QR con la aplicación autenticadora y confirma el código. Puedes enrolar el rostro o continuar solo con TOTP.
4. Para crear una cuenta nueva, abre **Crear cuenta**, acepta el consentimiento biométrico, activa la cámara, centra el rostro, completa el reto de parpadeo y registra la cuenta.
5. Escanea el QR de TOTP y confirma el código de seis dígitos. Al finalizar, se inicia la sesión.
6. En próximos accesos, elige reconocimiento facial o **Usar código autenticador en su lugar**.

Los modelos necesarios ya están en `public/models/`; el navegador no descarga modelos desde un CDN. En el primer uso se descargan desde el mismo servidor y quedan en caché local del navegador.

## Datos y limitaciones

- El modelo produce un descriptor de 1024 valores en el navegador; nunca se envía ni almacena una fotografía.
- El backend cifra con AES-256-GCM tanto el descriptor como el secreto TOTP antes de persistirlos en PostgreSQL.
- El reto de parpadeo y los modelos ligeros anti-spoof/liveness son señales de conveniencia, no prueba de vida certificada. Pueden ser engañados; para operaciones de alto riesgo, exige TOTP o una solución con detección de vida evaluada independientemente.
- La plantilla facial sigue siendo un dato biométrico sensible. Se solicita consentimiento, se transmite solo al backend configurado y no se devuelve en las respuestas de la API. Para producción, usa HTTPS, restringe el acceso al `.env`, establece una política legal de consentimiento/retención/borrado y protege las copias de seguridad de PostgreSQL.
- Si falla la cámara o la comparación, la alternativa es el código TOTP configurado al enrolar la cuenta. Protege la semilla TOTP igual que una contraseña y conserva el dispositivo autenticador.
