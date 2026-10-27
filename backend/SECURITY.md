# Seguridad de SIGIL.IA

## Alcance

Los controles del frontend reducen algunos riesgos, pero no convierten una interfaz de demostración en una aplicación autenticada. Actualmente no existen una sesión real, base de datos, autorización por roles ni verificación MFA. El dashboard permanece accesible como demostración.

Las rutas de autenticación locales siempre responden `501` tras validar el origen y el tipo de contenido. Al definir `SIGIL_BACKEND_URL`, Next.js envía `/api/v1/*` directamente al servicio configurado; los controles de las rutas locales no se ejecutan. El servicio de destino debe volver a validar todas las solicitudes.

## Controles implementados

- **A05 — Security Misconfiguration:** se oculta `X-Powered-By` y se agregan `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` y `Cross-Origin-Opener-Policy`. En producción también se agrega HSTS y una política CSP. La CSP permite `unsafe-inline` para scripts por la compatibilidad con el HTML actual de Next.js; no es una política estricta contra todo XSS.
- **A01 — Broken Access Control / CSRF:** las escrituras locales de login, registro, MFA y logout requieren `Origin` igual al origen solicitado, rechazan `Sec-Fetch-Site` cross-site y no aceptan tipos de contenido diferentes a `application/json`.
- **A03 — Injection / A04 — Insecure Design:** el cliente valida el formato de respuestas; un formulario o respuesta de éxito visual nunca equivale a autenticar a un usuario. Las rutas locales no almacenan datos ni aceptan credenciales.
- **A02 — Cryptographic Failures:** no se manejan secretos ni credenciales PostgreSQL en el cliente. La futura sesión documentada es una cookie `HttpOnly`, `Secure`, `SameSite=Lax` con prefijo `__Host-`.
- **A10 — SSRF:** el destino de rewrite proviene de configuración confiable del operador, no de una URL enviada por el usuario. En producción, configura únicamente el origen HTTPS legítimo del backend. La validación de configuración no sustituye los controles de egreso de red.

## Requisitos para el backend

Antes de conectar datos reales o habilitar el dashboard, implementa en el servidor:

1. Validación de tipo, formato, longitud, tamaño máximo y propiedades permitidas de cada cuerpo JSON. Rechaza propiedades inesperadas; no confíes en la validación del navegador.
2. Protección CSRF en las operaciones con sesión: compara `Origin` con una lista permitida, verifica Fetch Metadata y usa una estrategia CSRF apropiada para cookies. No habilites CORS con credenciales para cualquier origen.
3. Autenticación resistente: hash de contraseñas con algoritmo y parámetros actuales, mensajes de error que no revelen si una cuenta existe, límites de intentos distribuidos por cuenta y origen, MFA verificado en servidor, retos de un solo uso y caducidad breve.
4. Sesiones opacas revocables; rotación tras autenticación y cambios de privilegio, duración acotada y cookie `__Host-sigil_session` con `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/` y sin `Domain`. El frontend nunca debe poder emitir una sesión.
5. Autorización en cada API, acción de servidor y acceso a datos. Deniega por defecto; no uses Proxy como única barrera ni confíes en roles enviados por el cliente.
6. PostgreSQL sólo desde el servidor; consultas parametrizadas o ORM, transacciones cuando correspondan y el menor privilegio necesario para la cuenta de conexión. No construyas SQL concatenando entradas.
7. Límites de tamaño del cuerpo, rate limits compartidos entre instancias, timeouts, límites de conexión y controles de egreso al llamar servicios externos.
8. Secretos sólo en un gestor de secretos o variables del entorno protegido. No los incluyas en Git, bundles del navegador, respuestas ni logs.
9. Logs de auditoría con eventos y códigos de resultado, sin contraseñas, tokens, cookies, aserciones biométricas ni datos personales innecesarios. Configura alertas y retención.
10. Versiones mantenidas de dependencias, revisión periódica de vulnerabilidades, lockfile, migraciones revisadas y pruebas de acceso/autorización para cada endpoint.
11. Respuestas de error genéricas al cliente y detalles técnicos únicamente en logs protegidos; limita intentos y devuelve `429` sin indicar la existencia de cuentas.
12. Biometría: proveedor y requisitos legales aún por definir. Obtén consentimiento explícito, minimiza y cifra cualquier dato aprobado y permite su eliminación. No almacenes imágenes ni afirmes prueba de vida sin implementarla.

## Matriz de referencia OWASP Top 10

| Riesgo | Medida presente o pendiente |
|---|---|
| A01 Broken Access Control | Validación de origen en rutas locales. La autorización por usuario y rol sigue pendiente en el backend. |
| A02 Cryptographic Failures | La interfaz no persiste credenciales; HTTPS, hashes, cifrado y gestión de llaves corresponden al backend y despliegue. |
| A03 Injection | No se ejecutan consultas ni comandos con entradas del usuario; usar consultas parametrizadas cuando exista persistencia. |
| A04 Insecure Design | Contratos de API y flujos MFA diferenciados; aún no existe autenticación real. |
| A05 Security Misconfiguration | Encabezados y CSP de producción implementados; configurar HTTPS, proxy TLS, secretos y políticas del entorno. |
| A06 Vulnerable and Outdated Components | El lockfile fija dependencias; establecer actualizaciones y análisis de dependencias en CI antes de producción. |
| A07 Identification and Authentication Failures | Login/MFA documentados, pero no funcionales hasta implementar sesiones, hash, rate limits y MFA en servidor. |
| A08 Software and Data Integrity Failures | Validadores de respuesta y dependencias con lockfile; falta CI con builds, análisis y política de cadena de suministro. |
| A09 Security Logging and Monitoring Failures | Aún no hay auditoría, alertas ni retención centralizadas; deben implementarse en backend/infraestructura. |
| A10 Server-Side Request Forgery | URL upstream sólo por configuración del operador; restringir destinos y egreso de red en despliegue. |

Esta matriz no es una certificación ni una garantía de cobertura de OWASP; registra controles concretos y tareas pendientes para el equipo.
