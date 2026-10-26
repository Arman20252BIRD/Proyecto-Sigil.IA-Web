# Dashboard de administracion

## Ruta

`/dashboard`

## Organizacion del panel

- **Resumen:** vista independiente con metricas generales, grafica de actividad, alertas abiertas, alertas resueltas y registro historico.
- **Conductores ESP32:** CRUD visual de conductores y dispositivos. Permite buscar por ID o nombre, dar de alta, editar, consultar y eliminar registros.
- **Detalle del conductor:** al seleccionar una unidad se muestran sus apartados independientes:
  - **Resumen:** estado del ESP32, ultima senal y ubicacion reportada.
  - **Alertas:** eventos en proceso y resueltos, con accion para cambiar su estado.
  - **GPS:** ultima ubicacion y espacio preparado para integrar el mapa real.
  - **Contactar:** canal de contacto directo asociado al conductor.
  - **Logs y registros:** historial de eventos, origen, fecha y resultado.
- **Configuracion admin:** perfil, correo corporativo, telefono, zona horaria y seguridad de la cuenta. Esta separado de la gestion de conductores.
- **Soporte tecnico:** incidencias, documentacion operativa y contacto para la web, sensores y dispositivos ESP32.

## Acciones del frontend

- La busqueda filtra conductores por ID o nombre.
- Una alerta en proceso marca la fila del conductor en rojo, ilumina su indicador y muestra la etiqueta `Alerta activa`.
- El ID o nombre del conductor es seleccionable: al hacer clic, el detalle se despliega/enfoca debajo de la tabla.
- `Ver` abre el detalle del conductor y sus modulos.
- `Editar`, `Alta de conductor` y `Eliminar` representan el flujo CRUD.
- Las alertas se pueden marcar como **En proceso** o **Resuelta**.
- `Actualizar`, `Contactar` y `Guardar cambios` muestran confirmacion visual.
- `Cerrar sesion` regresa a `/login`.

## Integracion pendiente

Los registros actuales son datos de demostracion administrados en el estado local del frontend. El backend debera conectar autenticacion, permisos, base de datos, GPS, telemetria ESP32, bitacora de auditoria, telefono y MFA biometrico antes de ejecutar acciones reales.
