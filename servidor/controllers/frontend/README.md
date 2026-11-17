# Controllers del frontend

Los controladores del servidor no se duplican dentro de esta carpeta. Su
ubicaciÃ³n correcta es `servidor/controllers/`, porque ejecutan en Node.js
con Express y PostgreSQL. Esta carpeta contiene Ãºnicamente controladores del
frontend que llaman a esa API.

Esta carpeta identifica la responsabilidad Controller dentro del frontend, pero
no duplica los controladores del servidor. Next.js renderiza la interfaz y
envía solicitudes a la API; el procesamiento HTTP se realiza en
`servidor/controllers/`.

La separación evita mezclar componentes visuales con reglas de autenticación,
conductores, dashboard, Gmail y privacidad.

`dashboard.controller.ts` agrega el token de sesión, ejecuta la petición y
reacciona ante una sesión vencida. La lógica HTTP principal y las reglas de
autorización permanecen en el backend.
