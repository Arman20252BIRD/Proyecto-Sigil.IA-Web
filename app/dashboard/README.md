# Dashboard de administración

## Ruta

`/dashboard`

## Organizacion del panel

- **Resumen:** consulta conductores, eventos y posiciones GPS del backend. Las métricas, actividad reciente y gráfica de los siete días alrededor del evento más reciente reflejan PostgreSQL.
- **Conductores:** lista y búsqueda de los conductores guardados en PostgreSQL. Las altas, modificaciones y eliminaciones usan las rutas CRUD del backend.
- **Detalle del conductor:** al seleccionar una unidad se muestran sus apartados independientes:
  - **Resumen:** estado y datos de GPS/eventos recibidos del backend.
  - **Eventos y logs:** historial consultado desde PostgreSQL.
  - **GPS:** mapa de OpenStreetMap con la última posición registrada para el vehículo asociado y sus coordenadas.
  - **Contactar:** muestra el teléfono del registro del conductor.
- **Configuración admin:** interfaz visual separada de la gestión de conductores.
- **Soporte tecnico:** incidencias, documentacion operativa y contacto para la web, sensores y dispositivos ESP32.

## Integración disponible

- Al abrir o actualizar el dashboard, se leen `/api/drivers`, `/api/dashboard/events` y `/api/dashboard/gps`.
- Las lecturas y cambios requieren el token de acceso emitido después del login y segundo factor demo; al expirar se cierra la sesión y se vuelve a `/login`.
- `Alta de conductor`, `Editar` y `Eliminar` persisten los cambios mediante `/api/drivers` y `/api/drivers/:id`.
- Las últimas posiciones GPS se enlazan a los conductores con vehículo asignado; los eventos recientes vienen del endpoint de eventos.
- Las coordenadas actuales son datos estáticos de simulación en `Sigil-backend/database/seed.sql`; el mapa de OpenStreetMap requiere conexión a Internet y no actualiza la ubicación del vehículo.
- Los errores de red o del API se muestran en el dashboard; no se sustituyen con datos de demostración.
- El identificador de conductor lo genera PostgreSQL. Vehículo y hardware ESP32 aparecen como no asignados hasta asociar un vehículo.
- `Cerrar sesión` elimina el token de la sesión de la pestaña y regresa a `/login`.

## Límites actuales

- El backend no ofrece rutas para asignar vehículos, cambiar el estado de eventos, ni actualizar el perfil del administrador; esas pantallas no persisten en PostgreSQL.
- Los eventos solo incluyen el registro temporal y el conductor asociado; aún no almacenan tipo, severidad ni estado de resolución.
- El MFA compara muestras matemáticas de luminancia; no es reconocimiento facial real ni debe usarse como seguridad en producción.
