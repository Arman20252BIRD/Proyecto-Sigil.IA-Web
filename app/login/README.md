# Acceso corporativo

## Ruta

`/login`

## Flujos de frontend y API

- **Iniciar sesión**: correo corporativo y contraseña; después presenta el reto MFA facial.
- El formulario envía `POST /api/v1/auth/login`. Solo avanza si la API devuelve un `challengeId` válido.
- **Crear cuenta**: nombre, empresa, correo corporativo, teléfono, contraseña y confirmación; envía `POST /api/v1/auth/register`.
- Los contratos para comprobar el reto MFA, consultar la sesión y cerrar sesión están definidos en `backend/openapi.yaml`.
- **Enrolamiento facial**: la cámara solo muestra una vista previa local; no captura ni transmite datos biométricos.
- **MFA facial**: muestra que la verificación sigue pendiente; una vista previa no autentica ni da acceso al dashboard.

## Integración pendiente

Los endpoints locales de login y registro responden HTTP 501 hasta conectar el backend. La interfaz no afirma que las credenciales sean válidas ni que exista una coincidencia facial.

Los contratos OpenAPI están en [`../../backend/openapi.yaml`](../../backend/openapi.yaml). Para conectar el backend, define `SIGIL_BACKEND_URL` en `.env.local` y reinicia Next.js. Los detalles están en [`../../backend/README.md`](../../backend/README.md).

Antes de habilitar acceso real, el backend debe validar credenciales, realizar MFA y enrolamiento con consentimiento y prueba de vida, emitir y revocar sesiones seguras, y autorizar cada operación. El dashboard permanece en modo demostración.
