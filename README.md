# SIGIL.IA

## Frontend

El frontend está organizado dentro de `app` usando el App Router de Next.js.

### Portal informativo

La landing pública está disponible en `/informativo` y también es la ruta inicial (`/`). Se encuentra en `app/(views)/informativo` y presenta:

- Navegación superior con anclas a proyecto, funcionamiento y funciones.
- Accesos preparados para iniciar sesión y entrar al portal corporativo.
- Hero con la propuesta de valor de Sigil.IA y llamadas a la acción.
- Explicación visual de la arquitectura edge-computing: ESP32, inferencia inteligente y almacenamiento en AWS.
- Sección de funciones y footer corporativo.

La página usa CSS Modules (`page.module.css`) para encapsular los estilos del portal. Los enlaces `/login` y `/login?tipo=corporativo` quedan preparados para la siguiente etapa: autenticación y creación de cuenta.

La documentación específica de este apartado está en [`app/(views)/informativo/README.md`](app/(views)/informativo/README.md).
## paso 1:
descargar el proyecto con git clone https://github.com/Arman20252BIRD/Proyecto-Sigil.IA-Web.git

## paso 2: 
descargar las dependecias con npm install

## paso 3:
luego ejecutas con npm run dev.

hola universo

## Organización MVC

- `app/(views)/`: vistas y componentes visuales de Next.js.
- `servidor/controllers/frontend/`: controladores del frontend para peticiones y sesión.
- `servidor/models/frontend/`: modelos reutilizables del frontend, incluido el procesamiento facial local.
- `servidor/controllers/`: controladores HTTP de Express.
- `servidor/models/`: conexión PostgreSQL y definición SQL del Modelo.
- `public/`: recursos estáticos independientes de la lógica MVC.
