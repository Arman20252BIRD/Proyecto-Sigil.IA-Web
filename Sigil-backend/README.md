# Sigil.IA backend

## Requisitos

- Node.js 20 o posterior
- PostgreSQL 18 (o compatible) en `localhost:5432`

## Configuración local

1. Instala PostgreSQL y verifica que el servicio `postgresql-x64-18` esté iniciado.
2. Si no conoces la contraseña local, abre PowerShell como administrador y ejecuta desde la raíz del proyecto:

   ```powershell
   .\Sigil-backend\scripts\setup-local-postgres.ps1
   ```

   El script configura PostgreSQL localmente, aplica el esquema/seed y genera secretos aleatorios para PostgreSQL, JWT y cifrado MFA en `Sigil-backend\.env` (ignorado por Git). No muestra esos secretos.
3. Si configuras el entorno manualmente, copia `.env.example` a `.env` y establece `DB_PASSWORD`, `JWT_SECRET` aleatorio de al menos 32 caracteres y `FACE_DATA_KEY` de 64 caracteres hexadecimales (32 bytes). No reutilices esa clave en otros entornos ni la guardes en el repositorio. Aplica la base:

   ```powershell
   createdb -U postgres sigil_db
   psql -U postgres -d sigil_db -f .\Sigil-backend\database\schema.sql
   psql -U postgres -d sigil_db -f .\Sigil-backend\database\seed.sql
   ```

   `admin@sigil.local` / `Admin123!` es una cuenta local de prueba. En el primer acceso exige configurar TOTP y permite enrolar una plantilla facial real. El seed no contiene un rostro de demostración. También agrega cuatro conductores ficticios con vehículos, eventos y posiciones GPS para el dashboard; es seguro volver a ejecutarlo y no restablece la contraseña ni el MFA del administrador existente.
4. Instala e inicia el backend:

   ```powershell
   npm ci --prefix .\Sigil-backend
   npm --prefix .\Sigil-backend run dev
   ```

5. En otra terminal, inicia el frontend desde la raíz con `npm ci` y `npm run dev`. Abre `http://localhost:3000/login`.

## MFA y privacidad

- El frontend calcula descriptores faciales reales con `@vladmandic/human` usando archivos locales en `public/models/`. No se envían fotografías a la API ni a servicios externos.
- Para completar el registro hay que capturar una plantilla facial con un reto de parpadeo y confirmar un secreto TOTP con una aplicación autenticadora RFC 6238.
- `face_template_encrypted` y `totp_secret_encrypted` se cifran en backend con AES-256-GCM. La clave hex de 32 bytes se toma de `FACE_DATA_KEY` y nunca se almacena en PostgreSQL.
- Los fallos MFA bloquean temporalmente la cuenta tras cinco intentos; las rutas de autenticación también tienen rate limit y los tokens MFA son temporales y de un solo uso.
- Los modelos de liveness y anti-spoof son indicadores ligeros, no certificación contra ataques de presentación. No uses el reconocimiento facial como único control para operaciones de alto riesgo. TOTP es alternativa de segundo factor.
- En producción: deshabilita el alta pública (ya se rechaza con `NODE_ENV=production`), usa HTTPS, protege los secretos y backups, aplica revisión legal/consentimiento/retención, y cambia la persistencia del access token a cookies `HttpOnly`, `Secure`, `SameSite`.

## API

`GET http://localhost:4000/api/health` valida API y PostgreSQL.

| Método | Ruta | Uso |
| --- | --- | --- |
| POST | `/api/auth/register` | Crear un enrolamiento temporal con descriptor real y generar QR TOTP |
| POST | `/api/auth/register/verify-totp` | Confirmar TOTP y crear la cuenta |
| POST | `/api/auth/login-step1` | Validar correo/contraseña y solicitar MFA o configuración inicial TOTP |
| POST | `/api/auth/setup-mfa` | Activar TOTP de una cuenta existente y, opcionalmente, enrolar rostro |
| POST | `/api/auth/verify-facial` | Comparar descriptor facial con la plantilla cifrada |
| POST | `/api/auth/verify-totp` | Alternativa de autenticación RFC 6238 |
| GET / PUT | `/api/admin/:id` | Consultar/actualizar el perfil del administrador |
| GET / POST | `/api/drivers` | Listar/registrar conductores |
| PUT / DELETE | `/api/drivers/:id` | Actualizar/eliminar conductores |
| GET | `/api/dashboard/events` | Consultar eventos |
| GET | `/api/dashboard/gps` | Consultar posición GPS |

El descriptor facial nunca se retorna desde el backend. Las respuestas no contienen el secreto TOTP excepto en la URI de configuración entregada inmediatamente después de validar la contraseña. Los endpoints de setup/MFA requieren tokens temporales específicos.

Las rutas de conductores validan los campos y estados operativos, rechazan identificadores inválidos y permiten asignar/desasignar un vehículo existente. Los errores de validación y referencias inexistentes se reportan como respuestas `4xx`.

## Postman

Importa `postman/Sigil-API.postman_collection.json`. La colección prueba health, login, rate/auth y rutas protegidas. La configuración TOTP se confirma ingresando manualmente el código mostrado en tu autenticador. Postman no puede generar una muestra biométrica genuina ni verificar el reto de cámara; prueba el enrolamiento/reconocimiento facial desde `/login`.
