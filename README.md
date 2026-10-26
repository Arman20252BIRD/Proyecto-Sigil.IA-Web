# SIGIL.IA

## Frontend

El frontend está organizado dentro de `app` usando el App Router de Next.js.

### Portal informativo

La landing pública está disponible en `/informativo` y también es la ruta inicial (`/`). Ambas rutas renderizan el mismo portal directamente, sin redirección. Se encuentra en `app/informativo` y presenta:

- Navegación superior con anclas a proyecto, funcionamiento y funciones.
- Accesos preparados para iniciar sesión y entrar al portal corporativo.
- Hero con la propuesta de valor de Sigil.IA y llamadas a la acción.
- Explicación visual de la arquitectura edge-computing: ESP32, inferencia inteligente y almacenamiento en AWS.
- Sección de funciones y footer corporativo.

La página usa CSS Modules (`page.module.css`) para encapsular los estilos del portal. Los enlaces `/login` y `/login?tipo=corporativo` quedan preparados para la siguiente etapa: autenticación y creación de cuenta.

La documentación específica de este apartado está en [`app/informativo/README.md`](app/informativo/README.md).
## paso 1:
descargar el proyecto con git clone https://github.com/Arman20252BIRD/Proyecto-Sigil.IA-Web.git

## paso 2: 
descargar las dependecias con npm install

## paso 3:
luego ejecutas con npm run dev.

hola universo
