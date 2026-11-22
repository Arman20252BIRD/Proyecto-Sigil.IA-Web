# Chequeo de APIs con Postman

Importa `Sigil-API.postman_collection.json` en Postman. Incluye pruebas negativas
de validación/autorización y un flujo positivo para iniciar sesión, obtener un
token y consultar las rutas protegidas. También incluye un CRUD de conductor
opcional para QA que crea, actualiza y elimina un registro temporal.

## Ejecutar

1. Inicia PostgreSQL y el backend local.
2. Crea y selecciona un entorno **local** de Postman con estas variables:
   - `baseUrl`: `http://localhost:4000`
   - `qaAdminEmail`: `admin@sigil.local` (cuenta local incluida en el seed)
   - `qaAdminPassword`: `Admin123!` si no se cambió la contraseña del seed
   - `otpCode`: déjalo vacío y escribe aquí el código TOTP vigente al usarlo
   - `allowLocalTestWrites`: `yes` solo para habilitar las pruebas de escritura local
   - `accessToken`, `mfaToken`, `adminId`, `qaDriverId`: se guardan durante el flujo
3. Si la cuenta todavía no tiene TOTP configurado, completa el enrolamiento inicial
   desde `http://localhost:3000/login` y tu aplicación autenticadora.
4. Envía **QA login - paso 1**. Copia el código actual de la app autenticadora a
   `otpCode` y envía **QA MFA - verificar TOTP y obtener sesión**. La segunda
   solicitud guarda el token de acceso en `accessToken`. Hazlo manualmente, no
   con Runner, porque el código cambia cada 30 segundos.
5. Envía las solicitudes de lectura protegidas. Con `accessToken` válido deben
   responder `200`; la carpeta **Negativas QA - rutas privadas sin token** verifica
   que las mismas lecturas sigan respondiendo `401` sin encabezado Authorization.
   La colección también guarda `adminId` al iniciar sesión.
6. Para ejecutar **Operaciones positivas QA**, conserva `baseUrl` en localhost y
   establece `allowLocalTestWrites=yes`. El perfil se actualiza con sus valores
   actuales (sin cambiar sus datos) y se agregan entradas de auditoría. El ciclo
   de conductor genera un correo `example.test`, crea el registro, lo actualiza,
   lo elimina y comprueba que ya no aparezca. Ejecuta esta carpeta con una sesión
   válida; si se interrumpe antes de eliminar, revisa y limpia el conductor QA.
7. La carpeta **Privacidad positiva QA** también requiere el opt-in y localhost.
   Cada aceptación confirmada agrega una entrada permanente al historial; no
   ejecutes estas solicitudes repetidamente si no necesitas probarlas.
8. Google OpenID se comprueba con su documento público. Resend se consulta solo
   cuando `resendApiKey` está en el entorno local de Postman. La prueba de Gmail
   indica `503` si faltan las credenciales de esa integración.

## Importante

- Una prueba de `400` o `401` puede ser **positiva**: significa que la API rechazó
  correctamente datos inválidos o una solicitud sin autorización. Por ejemplo,
  **Registro - rechaza cuerpo vacío** debe recibir `400`; no cambies esa solicitud
  para intentar obtener `201`.
- El login positivo requiere cuenta de QA y TOTP. El primer paso devuelve un token
  temporal MFA; el segundo, con el código vigente, genera el `accessToken`.
- El registro exitoso requiere un descriptor facial real de 1024 valores y
  consentimientos válidos. Haz ese flujo desde la aplicación; no inventes ni
  compartas un descriptor biométrico en Postman.
- El login positivo prueba la emisión del token de segundo factor y, después de
  verificar el TOTP, guarda un token de acceso para las lecturas y cambios QA.
- Para comprobar una actualización de perfil, primero envía **Perfil admin me -
  lectura** para guardar sus valores actuales. Las tres actualizaciones QA
  conservan esos campos, pero añaden registros de auditoría y cambian la fecha
  de actualización.
- No se automatizan restablecimiento exitoso (envía correo y cambia contraseña),
  envío Gmail/Resend ni telemetría válida (inserta eventos). Pruébalos de forma
  manual en QA cuando estés listo para sus efectos.
- Mantén contraseña, códigos TOTP, tokens y claves en el entorno local marcado
  como secreto. No los exportes ni los agregues a la colección.
