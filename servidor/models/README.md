# Models — modelo y persistencia

Esta carpeta representa el Modelo dentro de MVC. La estructura persistente está
definida en `base-datos/`, que contiene el esquema, datos iniciales y
migraciones SQL de PostgreSQL. `db.ts` mantiene el pool de conexión usado por
los controladores y `audit-log.model.ts` persiste los movimientos de auditoría.

El proyecto no utiliza un ORM. Las consultas parametrizadas se ejecutan con
`pg`; si después se agregan entidades o repositorios, deben colocarse aquí.

`face-data.ts` cifra y descifra los descriptores faciales antes de persistirlos.
`base-datos/` contiene los scripts SQL y `scripts/` contiene la automatización
local para aplicar el esquema y los datos iniciales de PostgreSQL.
