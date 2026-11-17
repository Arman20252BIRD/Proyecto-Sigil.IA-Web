# Models del frontend

Los modelos del servidor permanecen en `servidor/models/`: `db.ts`,
`audit-log.model.ts` y `base-datos/`. No se mezclan con estos modelos porque
usan PostgreSQL y se ejecutan en el backend, mientras que esta carpeta se
ejecuta en el navegador.

Esta carpeta documenta los datos que consume la interfaz. El Modelo real del
sistema está en `servidor/models/`, especialmente en `base-datos/`, donde se
encuentran la conexión PostgreSQL, el esquema SQL, las migraciones y los datos
iniciales.

Los componentes de React no deben conectarse directamente a PostgreSQL; deben
consumir los endpoints del backend.

`face-recognition.ts` pertenece aquí porque transforma la captura de cámara en
descriptores y cajas faciales para que login y dashboard reutilicen el modelo
local sin duplicar esa definición.
