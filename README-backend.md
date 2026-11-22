# Sigil.IA backend

## Requisitos

- Node.js 20 o posterior
- PostgreSQL 18 (o compatible) en `localhost:5432`

## Configuración local

1. Instala PostgreSQL y verifica que el servicio `postgresql-x64-18` esté iniciado.
2. Si no conoces la contraseña local, abre PowerShell como administrador y ejecuta desde la raíz del proyecto:

   ```powershell
   .\servidor\models\scripts\setup-local-postgres.ps1
   ```

   El script configura PostgreSQL localmente, aplica el esquema/seed y genera secretos aleatorios para PostgreSQL, JWT y cifrado MFA en `servidor\.env` (ignorado por Git). No muestra esos secretos.
3. Si configuras el entorno manualmente, copia `.env.example` a `.env` y establece `DB_PASSWORD`, `JWT_SECRET` aleatorio de al menos 32 caracteres y `FACE_DATA_KEY` de 64 caracteres hexadecimales (32 bytes). No reutilices esa clave en otros entornos ni la guardes en el repositorio. Aplica la base:

   ```powershell
   createdb -U postgres sigil_db
   psql -U postgres -d sigil_db -f .\servidor\models\base-datos\schema.sql
   psql -U postgres -d sigil_db -v ON_ERROR_STOP=1 -f .\servidor\models\base-datos\audit-log-append-only.sql
   psql -U postgres -d sigil_db -v ON_ERROR_STOP=1 -v allow_demo_seed=on -f .\servidor\models\base-datos\seed.sql
   ```

   La migración `audit-log-append-only.sql` es necesaria también para bases
   existentes: bloquea cambios y borrados de auditoría desde PostgreSQL.
   El seed contiene la cuenta y datos ficticios de demostración. Es solo para
   desarrollo/QA y se bloquea por defecto; no lo ejecutes contra producción.
   La opción `allow_demo_seed=on` es una confirmación explícita para la base local.

   Si ya tenías una base de datos antes de agregar la separación de conductores por administrador, aplica también la migración:

   ```powershell
   psql -U postgres -d sigil_db -f .\servidor\models\base-datos\admin-data-isolation.sql
   ```

   Esta migración agrega `admin_id` a los conductores existentes y los asigna al primer administrador.

   `admin@sigil.local` / `Admin123!` es una cuenta local de prueba. En el primer acceso exige configurar TOTP y permite enrolar una plantilla facial real. El seed no contiene un rostro de demostración. También agrega cuatro conductores ficticios con vehículos, eventos y posiciones GPS para el dashboard; es seguro volver a ejecutarlo y no restablece la contraseña ni el MFA del administrador existente.
4. Instala e inicia el backend:

   ```powershell
   npm ci --prefix .\servidor
   npm --prefix .\servidor run dev
   ```

5. En otra terminal, inicia el frontend desde la raíz con `npm ci` y `npm run dev`. Abre `http://localhost:3000/login`.

## MFA y privacidad

- El frontend calcula descriptores faciales reales con `@vladmandic/human` usando archivos locales en `public/modelos/`. No se envían fotografías a la API ni a servicios externos.
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
| POST | `/api/auth/password-reset/verify-totp` | Verificar el correo y el código TOTP vigente; devuelve un token de restablecimiento de un solo uso, válido durante 5 minutos |
| POST | `/api/auth/password-reset/confirm` | Cambiar la contraseña con el token de restablecimiento y guardar el hash en PostgreSQL |
| POST | `/api/auth/setup-mfa` | Activar TOTP de una cuenta existente y, opcionalmente, enrolar rostro |
| POST | `/api/auth/verify-facial` | Comparar descriptor facial con la plantilla cifrada |
| POST | `/api/auth/verify-totp` | Alternativa de autenticación RFC 6238 |
| GET / PUT | `/api/admin/:id` | Consultar/actualizar el perfil del administrador |
| GET | `/api/admin/audit-logs` | Consultar el historial inmutable del administrador autenticado |
| GET / POST | `/api/drivers` | Listar/registrar conductores |
| PUT / DELETE | `/api/drivers/:id` | Actualizar/eliminar conductores |
| GET | `/api/dashboard/events` | Consultar eventos |
| GET | `/api/dashboard/gps` | Consultar posición GPS |

El historial registra los inicios de sesión completados y los cambios de
conductores y perfil; la consulta se limita al administrador autenticado. La
migración bloquea `UPDATE`, `DELETE` y `TRUNCATE`, pero un propietario o
superusuario de PostgreSQL puede desactivar los triggers. En producción, el
usuario de la aplicación debe ser un rol restringido, sin propiedad de la tabla
ni privilegios de superusuario.

El descriptor facial nunca se retorna desde el backend. Las respuestas no contienen el secreto TOTP excepto en la URI de configuración entregada inmediatamente después de validar la contraseña. Los endpoints de setup/MFA requieren tokens temporales específicos.

En **¿Olvidaste tu contraseña?**, el administrador ingresa el correo de su cuenta y el código de seis dígitos de su aplicación autenticadora. El código TOTP no puede reutilizarse; después de verificarlo, el token temporal permite establecer una contraseña nueva durante cinco minutos. Se aplican el rate limit de autenticación y el bloqueo por intentos fallidos MFA.

Las rutas de conductores validan los campos y estados operativos, rechazan identificadores inválidos y permiten asignar/desasignar un vehículo existente. Los errores de validación y referencias inexistentes se reportan como respuestas `4xx`.

## Postman

Importa `servidor/controllers/pruebas-api/Sigil-API.postman_collection.json` para
ejecutar pruebas negativas y positivas. El flujo QA obtiene una sesión con
credenciales locales y TOTP; después, las lecturas protegidas esperan `200`.
La carpeta de operaciones QA actualiza el perfil sin cambiar sus valores y hace
un ciclo crear/actualizar/eliminar para un conductor temporal, solo en localhost
y con `allowLocalTestWrites=yes`. Consulta
`servidor/controllers/pruebas-api/README.md` para configurar el entorno y ejecutar
las solicitudes paso a paso. El registro con descriptor facial, restablecimientos,
telemetría y envíos de correo requieren pruebas manuales en QA; el enrolamiento
biométrico se realiza desde `/login`.
