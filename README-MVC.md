# Código fuente del backend

Esta carpeta concentra la implementación de la API Express. Su organización
principal sigue MVC:

- `controllers/`: recibe peticiones HTTP y devuelve respuestas.
- `models/`: conexión PostgreSQL, esquema SQL y persistencia.
- `README-frontend.md`: documenta la frontera visual, que se implementa en Next.js.

La configuración de autenticación que necesita el flujo HTTP se concentra en
`controllers/auth.config.ts`; los datos sensibles y su cifrado se concentran
en `models/face-data.ts`. `middleware/` permanece separado porque es una capa
transversal que valida tokens y dispositivos antes de ejecutar un controlador.
Las pruebas Postman se encuentran en `controllers/pruebas-api/` y los scripts
de preparación de PostgreSQL en `models/scripts/`; son archivos de apoyo
agrupados junto a la capa que prueban o preparan, no nuevos modelos ni
controladores.
