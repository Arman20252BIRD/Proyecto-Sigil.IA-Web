# Portal informativo

## Objetivo

Landing pública de Sigil.IA basada en el HTML de referencia entregado para el portal de monitoreo vehicular inteligente. Explica la arquitectura a clientes corporativos y dirige al acceso de la plataforma.

## Estructura implementada

- `page.tsx`: página Server Component con navegación, hero, diagrama SVG del vehículo, proyecto, funcionamiento, funciones, contacto y footer.
- `page.module.css`: estilos locales en CSS Modules, paleta azul/cian, grilla técnica, tarjetas y responsive móvil.

## Secciones

1. **Navegación superior**: anclas a `#proyecto`, `#como-funciona` y `#funciones`, más accesos a `/login`.
2. **Hero**: mensaje “Más claridad para cuidar lo que te mueve”, botones de acción, nota técnica y diagrama conceptual con ESP32, MPU-6050 y GPS.
3. **El proyecto**: tres pilares: microcontrolador ESP32, inferencia inteligente y Broker MQTT/Cloud AWS.
4. **Cómo funciona**: cuatro etapas: detección, análisis, comunicación/almacenamiento y consulta/notificaciones.
5. **Funciones**: monitoreo de eventos, alertas, ubicación, historial, estado del vehículo y validación biométrica MFA.
6. **Contacto corporativo**: llamada a pruebas de concepto institucionales.

## Decisiones técnicas

- El Tailwind por CDN del HTML de referencia fue convertido a CSS local para evitar dependencias de red en Next.js.
- El diagrama del vehículo se implementó como SVG inline, sin imágenes externas.
- La animación de escaneo se implementó con `@keyframes` local.
- Los iconos se mantienen como SVG inline para no agregar una librería.
- La ruta `/` y `/informativo` muestran el mismo portal.
- Los enlaces `/login` y `/login?tipo=corporativo` quedan preparados para la siguiente etapa de autenticación.

## Validación

Ejecutar desde la raíz:

```bash
npm run lint
npm run build
```
