# App — entrada de Next.js

Esta carpeta es la entrada del frontend con el App Router de Next.js.

## MVC dentro del proyecto

- `app/(views)/` contiene las vistas de la interfaz y conserva las rutas
  públicas `/informativo`, `/login`, `/dashboard` y `/legal`.
- `servidor/controllers/frontend/` documenta la frontera de control del frontend. Las
  peticiones HTTP y reglas de negocio principales se resuelven en
  `servidor/controllers/`.
- `servidor/models/frontend/` documenta los modelos consumidos por la interfaz. La
  persistencia y los modelos de datos se encuentran en `servidor/models/`
  y `servidor/models/base-datos/`.
- `public/` permanece fuera de `app` porque contiene recursos estáticos, incluido `icon.png`.

`layout.tsx`, `page.tsx`, `globals.css`, `theme-overrides.css` e `icon.png`
permanecen en la raíz porque son convenciones especiales del App Router. No son
carpetas MVC movibles: Next.js los detecta por su ubicación y moverlos rompería
el layout, la ruta inicial, los estilos globales o el favicon.
Los estilos globales se encuentran en `app/(views)/globals.css` y
`app/(views)/theme-overrides.css`; el favicon se sirve desde `public/icon.png`.
`layout.tsx` y `page.tsx` permanecen en la raíz porque son archivos especiales
del App Router y moverlos rompería la estructura de Next.js.
