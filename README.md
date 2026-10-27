# SIGIL.IA

## Frontend

El frontend está organizado dentro de `app` usando el App Router de Next.js.

### Portal informativo

La landing pública está disponible en `/informativo` y también es la ruta inicial (`/`). Se encuentra en `app/informativo` y presenta:

- Navegación superior con anclas a proyecto, funcionamiento y funciones.
- Accesos preparados para iniciar sesión y entrar al portal corporativo.
- Hero con la propuesta de valor de Sigil.IA y llamadas a la acción.
- Explicación visual de la arquitectura edge-computing: ESP32, inferencia inteligente y almacenamiento en AWS.
- Sección de funciones y footer corporativo.

La página usa CSS Modules (`page.module.css`) para encapsular los estilos del portal. Los enlaces `/login` y `/login?tipo=corporativo` quedan preparados para la siguiente etapa: autenticación y creación de cuenta.

La documentación específica de este apartado está en [`app/informativo/README.md`](app/informativo/README.md).

La API, los contratos y la futura conexión al backend están documentados en [`backend/README.md`](backend/README.md) y [`backend/openapi.yaml`](backend/openapi.yaml).
Los controles aplicados y las tareas de seguridad pendientes están documentados en [`backend/SECURITY.md`](backend/SECURITY.md).

## Requisitos

- Node.js 20.9.0 o posterior (se recomienda Node.js 22 LTS).
- npm, incluido con Node.js.

Comprueba las versiones desde una terminal de PowerShell:

```powershell
node --version
npm --version
```

## Instalación en Windows

Abre el proyecto en VS Code y ejecuta estos comandos desde la carpeta que contiene `package.json`:

```powershell
npm ci
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en el navegador. Para detener el servidor, pulsa `Ctrl+C` en la terminal.

`npm ci` instala las versiones exactas guardadas en `package-lock.json`. Vuelve a ejecutarlo si necesitas reconstruir las dependencias.

## Verificación

```powershell
npm run lint
npm run build
```

Para iniciar la compilación de producción localmente, ejecuta `npm run start` después de `npm run build`.
