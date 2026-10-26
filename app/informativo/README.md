# Portal informativo

## Objetivo

Landing pública de Sigil.IA basada en el HTML de referencia y en la documentación del proyecto. Explica la plataforma de ciberseguridad y telemetría vehicular de forma clara para visitantes y clientes corporativos.

## Estructura

- `page.tsx`: navegación, hero, contenido del proyecto, funciones y footer.
- `sensor-demo.tsx`: módulo interactivo de sensores implementado como Client Component.
- `page.module.css`: estilos locales, responsive, animaciones y estados visuales.
- `public/sigil-logo.png`: logo transparente usado en el encabezado.

## Cambios de experiencia

- El encabezado usa el logo oficial transparente, navegación por anclas y acciones separadas para visitante y acceso corporativo.
- El hero conserva una sola acción visible que desplaza al visitante hacia el funcionamiento del sistema.
- El diagrama estático se complementa con una demostración interactiva: se puede seleccionar **Sonido**, **Movimiento** o **Peso** para ver la métrica y la explicación de cada sensor.
- Se eliminó de la vista el bloque final de contacto que no aportaba a la primera versión informativa.
- El footer se mantiene como una barra convencional con marca, copyright y enlaces de referencia.

## Sensores representados

- **Sonido / MIC**: patrones acústicos anómalos dentro del habitáculo.
- **Movimiento / IMU**: impactos, vibraciones y aceleración.
- **Peso / LOAD**: carga y distribución del vehículo.
- **ESP32**: microcontrolador que concentra las lecturas y ejecuta el procesamiento local.
- **GPS NEO-6M**: referencia de posición para relacionar el evento con la ruta.
- **Alimentación y comunicación**: módulos de energía y conectividad para enviar telemetría a AWS mediante MQTT.

La demostración es un ejemplo conceptual de frontend para mostrar la ubicación y el recorrido de los componentes; no representa telemetría real en vivo. La integración real de datos se conectará en la etapa de backend.

## Validación

```bash
npm run lint
npm run build
```
