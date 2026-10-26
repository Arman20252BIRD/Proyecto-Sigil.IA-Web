# Acceso corporativo

## Ruta

`/login`

## Flujos de frontend

- **Iniciar sesión**: correo corporativo y contraseña; después presenta el reto MFA facial.
- **Crear cuenta**: nombre, empresa, correo corporativo, teléfono, contraseña y confirmación.
- **Enrolamiento facial**: solicita permiso de cámara y muestra el encuadre de captura.
- **MFA facial**: vuelve a solicitar la cámara como segundo factor antes del dashboard.

## Integración pendiente

La interfaz no afirma una coincidencia facial real. Para producción se requiere backend para validar el correo empresarial, gestionar sesiones, obtener consentimiento biométrico, ejecutar prueba de vida, comparar un template cifrado y registrar auditoría MFA.

El componente `auth-panel.tsx` deja preparados los estados y puntos de conexión para esa API. La cámara solo se solicita después de una acción explícita del usuario.
