# Views — interfaz de Sigilia

Esta carpeta contiene las vistas públicas y privadas de Next.js. El nombre
`(views)` es un grupo de rutas del App Router: organiza el código sin agregar
`/views` a las URLs. Por eso las rutas siguen siendo `/informativo`, `/login`,
`/dashboard` y `/legal`.

Cada pantalla combina `page.tsx` para la vista, componentes `.tsx` para la
interacción y archivos `*.module.css` para sus estilos aislados. Next.js usa
React Server Components por defecto y los componentes interactivos declaran
`"use client"` cuando necesitan estado, eventos o APIs del navegador.

Dependencias principales de esta capa: Next.js, React, `next/image`, `next/link`,
CSS Modules y `@vladmandic/human` para el procesamiento facial local.
