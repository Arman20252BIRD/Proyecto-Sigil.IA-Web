# Controllers — controladores HTTP

Estos son los controladores MVC del backend. Los controladores de interfaz se
encuentran en `controllers/frontend/` y consumen los endpoints definidos aquí.

Los controladores reciben las peticiones de Express, validan sus datos,
consultan los modelos o servicios y devuelven respuestas JSON al frontend.

Aquí se encuentran autenticación, administradores, conductores, dashboard,
Gmail y privacidad. Las rutas se registran en `../app.ts`; los middlewares de
autenticación y dispositivo se ejecutan antes de llegar a estos controladores.

Dependencias principales: Express, `pg`, `jsonwebtoken`, `bcryptjs`, `otplib` y
las utilidades internas de auditoría y cifrado.

`auth.config.ts` contiene la configuración de autenticación utilizada por los
controladores y el middleware. `pruebas-api/` conserva la colección Postman y
su documentación para probar los endpoints sin mezclarla con la lógica HTTP.
