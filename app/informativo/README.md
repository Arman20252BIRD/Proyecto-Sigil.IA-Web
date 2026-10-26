# Portal informativo

## Objetivo

Landing page pública de Sigil.IA. Su función es explicar la plataforma de seguridad para flotas a clientes corporativos y dirigirlos hacia el portal de acceso.

## Estructura

- `page.tsx`: composición de la página, navegación, hero, arquitectura, funciones y footer.
- `page.module.css`: estilos encapsulados, paleta clara, visualización de radar y comportamiento responsive.

## Secciones implementadas

1. **Navegación superior**: enlaces de anclaje a `#proyecto`, `#como-funciona` y `#funciones`.
2. **Acciones de acceso**: `Iniciar sesión` enlaza a `/login`; `Acceso corporativo` enlaza a `/login?tipo=corporativo`.
3. **Hero**: presenta el procesamiento en el borde, la inteligencia artificial y AWS.
4. **Arquitectura**: explica el flujo de captura local con ESP32, inferencia inteligente y visibilidad en AWS.
5. **Funciones**: resume alertas en tiempo real, protección de datos y escalabilidad.

## Criterios técnicos

- La ruta sigue las convenciones del App Router de Next.js 16.
- Es un Server Component porque no requiere estado ni eventos de navegador.
- Los iconos son SVG inline para evitar una dependencia adicional.
- El layout se adapta a móvil mediante un breakpoint en `800px`.
- La ruta raíz renderiza el mismo portal directamente desde `app/page.tsx`, evitando una redirección innecesaria durante el prerender de Next.js 16.
- `next.config.ts` permite el origen de desarrollo `192.168.1.66` para que HMR funcione al abrir la app desde otro dispositivo de la red local.

## Próximos pasos

- Crear las rutas `/login` y `/crear-cuenta`.
- Reemplazar los enlaces de acceso por el flujo real de autenticación.
- Añadir recursos de marca definitivos si se proporcionan (logotipo, tipografías o imágenes).
