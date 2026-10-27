# Backend y API

## Estado actual

El frontend consume una API REST versionada en `/api/v1`. Los contratos están en [`openapi.yaml`](./openapi.yaml) y los tipos y clientes del frontend están en [`../lib/api/contracts.ts`](../lib/api/contracts.ts) y [`../lib/api/client.ts`](../lib/api/client.ts).

La aplicación expone `GET /api/v1/health`. Las rutas locales de `POST /api/v1/auth/login`, `POST /api/v1/auth/register`, `POST /api/v1/auth/face`, `GET /api/v1/auth/session` y `POST /api/v1/auth/logout` responden `501 AUTH_BACKEND_NOT_CONFIGURED` mientras el backend real no esté conectado. No crean usuarios, sesiones ni registros ficticios.

## Conectar un backend existente

1. Implementa los contratos de `openapi.yaml` en el backend. Conserva el prefijo `/api/v1`, los cuerpos JSON, los códigos HTTP y el formato de errores.
2. Desde la raíz del proyecto, copia `.env.example` a `.env.local` y define `SIGIL_BACKEND_URL` como el origen HTTP(S) del backend; por ejemplo, `http://localhost:8000`. No incluyas `/api/v1`, rutas, parámetros ni credenciales en esa URL.
3. Reinicia `npm run dev`. Next.js reescribe `/api/v1/*` al backend, conservando el mismo origen que usa el navegador. El frontend no requiere cambiar su URL ni configurar CORS para desarrollo local.
4. Comprueba `GET /api/v1/health` y después los flujos de login y registro. El indicador `backendConfigured` solo confirma que se definió una URL; no confirma que la API o PostgreSQL estén saludables.

Sin `SIGIL_BACKEND_URL`, las rutas locales de autenticación permanecen activas y devuelven un error claro. No se debe definir una URL ficticia para ocultarlo.

## Seguridad y responsabilidades

- Los encabezados HTTP, la política de contenido de producción, la ocultación de `X-Powered-By` y las comprobaciones estrictas de `Origin`/Fetch Metadata y `Content-Type` de JSON están implementados en Next.js para las rutas locales de escritura. Sin `Origin` válido, JSON o ante una solicitud de otro sitio, estas rutas responden `403` o `415`.
- La documentación detallada y lo que sigue pendiente están en [`SECURITY.md`](./SECURITY.md).
- Cuando configuras `SIGIL_BACKEND_URL`, los rewrites envían las solicitudes directamente al backend y omiten las rutas locales y sus comprobaciones. El backend debe volver a aplicar todas las validaciones de origen, CSRF y contenido por sí mismo; no hereda ni debe asumir las validaciones de Next.js.
- El backend debe validar los cuerpos de las solicitudes; la validación del navegador no es una barrera de seguridad.
- Login debe validar credenciales y responder con un reto MFA de corta duración. El reto no es una sesión ni concede acceso.
- MFA debe validar el reto y la prueba de un proveedor biométrico confiable. No aceptes imágenes de rostro ni un `challengeId` como prueba de identidad. Emite una cookie `__Host-sigil_session` con atributos `HttpOnly`, `Secure`, `SameSite=Lax` y `Path=/`, sin atributo `Domain`.
- La consulta de sesión debe validar esa cookie en el servidor. El cierre de sesión debe revocar la sesión y expirar la misma cookie.
- Registro solo puede crear una cuenta pendiente. No cree una sesión hasta completar el enrolamiento y la verificación requeridos.
- La cámara actual solo muestra una vista previa local: no captura, transmite ni valida biometría. No trates `enrollmentId` ni una vista previa como consentimiento o prueba biométrica.
- La verificación MFA, la emisión y revocación de sesiones, la cookie segura, CSRF, límites de intentos y la autorización por rol deben implementarse en el backend antes de habilitar acceso real.
- PostgreSQL y sus credenciales permanecen en el servidor. El frontend nunca debe conectarse directamente a la base de datos.
- No registres contraseñas, tokens, cookies ni datos biométricos en logs o respuestas. Usa HTTPS en entornos no locales y almacena secretos solo en el gestor de variables del entorno.

## PostgreSQL

Todavía no se eligió un cliente ni un esquema de datos. Cuando se defina el modelo, instala la herramienta de migraciones elegida en el backend, guarda las credenciales fuera de Git y protege cada consulta con validación de sesión y permisos. Proxy puede redirigir solicitudes, pero no sustituye la autorización del backend ni debe consultar PostgreSQL.

## Extender la API

1. Añade el endpoint y los esquemas de solicitud/respuesta en `openapi.yaml`.
2. Implementa el endpoint en el backend y conserva la envoltura `{ "error": { "code": "...", "message": "..." } }` para errores.
3. Añade los tipos y validadores de respuesta en `lib/api/contracts.ts`.
4. Añade una función de consumo en `lib/api/client.ts` y conecta la interfaz. Trata `401`, `403`, `409`, `422` y `429` sin asumir que una solicitud tuvo éxito.
5. Si un endpoint tiene una ruta local `app/api/v1/**/route.ts`, retírala al conectar el backend: el rewrite se evalúa antes de las rutas y evita que ese placeholder oculte el servicio real.

## Verificación local

```powershell
Invoke-RestMethod http://localhost:3000/api/v1/health
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/login -ContentType "application/json" -Body '{"email":"admin@example.com","password":"no-usar","rememberDevice":false}'
```

Sin backend configurado, la primera solicitud responde con el estado del servicio web y `backendConfigured: false`; los endpoints de autenticación responden HTTP 501. No uses credenciales reales en pruebas de ejemplo.
