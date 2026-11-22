# Base de datos — definición del Modelo

Contiene el esquema, seed y migraciones SQL de PostgreSQL. Es la persistencia
del Modelo MVC: administradores, conductores, eventos, GPS, privacidad y
auditoría.

`audit-log-append-only.sql` debe aplicarse en instalaciones nuevas y existentes.
Impide `UPDATE`, `DELETE` y `TRUNCATE` sobre `audit_logs`; la tabla sigue
permitiendo nuevas entradas para que la aplicación registre eventos.

Esta protección detiene cambios hechos mediante DML normal, pero no es
resistente a un propietario de la tabla o superusuario de PostgreSQL, que puede
desactivar los triggers o modificar el esquema. En producción, el usuario de la
aplicación no debe ser propietario ni superusuario; asígnale solo los permisos
necesarios para leer e insertar auditoría.
