# Proxy y middleware

## Convencion de Next.js

Este proyecto usa Next.js 16. En esta version, el punto de entrada para interceptar solicitudes es `proxy.ts` en la raiz del proyecto, al mismo nivel que `app`. La convencion `middleware.ts` fue reemplazada por `proxy.ts`; la carpeta `middleware/` no activa por si misma un middleware de Next.js.

`prueba2.tsx` es un archivo vacio de prueba, no una funcion de middleware activa.

## Responsabilidades

Cuando exista autenticacion de servidor, `proxy.ts` podra aplicar redirecciones tempranas en rutas como `/dashboard`. Debe limitarse a comprobaciones ligeras de la solicitud, por ejemplo, verificar si se presenta una cookie de sesion.

Proxy no debe conectarse a PostgreSQL, cargar permisos desde la base de datos ni ser la unica barrera de autorizacion. Las rutas, acciones de servidor y funciones de acceso a datos deben validar la sesion y los permisos antes de leer o modificar informacion.

Por ahora, el dashboard permanece accesible para conservar su comportamiento de demostracion. No se crea una cookie de sesion ficticia ni se afirma que el login actual autentique usuarios.

## Pendiente antes de activar la proteccion

- Implementar el inicio y cierre de sesion en el servidor.
- Elegir como se crean, firman, caducan y revocan las sesiones.
- Definir roles y permisos y validarlos en cada operacion protegida.
- Crear `proxy.ts` en la raiz solo cuando pueda comprobar la sesion real sin bloquear los recursos publicos.
