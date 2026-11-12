# SIGIL.IA / Desarrollo inicial

## Interfaz web y arquitectura MVC

Documento de la segunda etapa de desarrollo

Fecha de elaboración: 11 de noviembre de 2026

<div align="center">

**Interfaz de usuario · composición visual · Modelo–Vista–Controlador**

</div>

---

## INTRODUCCIÓN

La segunda etapa del proyecto Sigil.IA se enfoca en la construcción de la interfaz web y en la organización de la aplicación mediante una arquitectura basada en el patrón Modelo–Vista–Controlador, conocido como MVC.

La interfaz fue elaborada para que el usuario pueda comprender el propósito de Sigil.IA, iniciar sesión, crear una cuenta administrativa y consultar información relacionada con conductores, eventos y telemetría vehicular. El diseño mantiene una identidad visual tecnológica, limpia y corporativa, utilizando principalmente tonos blancos, azul profundo, azul claro y cian.

La aplicación está dividida en un frontend y un backend. El frontend es la parte visible que utiliza la persona usuaria. El backend recibe las solicitudes, procesa las reglas y se comunica con PostgreSQL. Esta separación permite que la interfaz se concentre en presentar información y capturar acciones, mientras que el servidor valida y procesa los datos.

---

## OBJETIVO

El objetivo de esta etapa es documentar cómo se compone visualmente la aplicación, cómo se organizan sus pantallas, qué función cumple cada apartado de la interfaz y cómo se distribuyen las responsabilidades de Modelo, Vista y Controlador dentro de las carpetas del proyecto.

La documentación se concentra exclusivamente en la interfaz y en la arquitectura MVC aplicada a Sigil.IA. No pretende describir todo el funcionamiento interno de PostgreSQL ni sustituir una memoria específica del backend.

---

## 1. ESTRUCTURA GENERAL DE LA INTERFAZ

La interfaz principal se encuentra dentro de la carpeta `app`. Esta carpeta utiliza el sistema App Router de Next.js. Cada subcarpeta representa una sección o una ruta visual de la aplicación, y normalmente contiene un archivo `page.tsx` para construir la página y un archivo `page.module.css` para definir su apariencia.

La estructura visual principal está organizada de la siguiente forma:

```text
app/
├── page.tsx                         Entrada principal
├── layout.tsx                       Estructura general de la aplicación
├── globals.css                      Estilos globales
├── informativo/                     Portal público
│   ├── page.tsx
│   ├── page.module.css
│   └── sensor-demo.tsx
├── login/                           Acceso y registro
│   ├── page.tsx
│   ├── auth-panel.tsx
│   ├── auth-panel-query.tsx
│   ├── face-recognition.ts
│   └── page.module.css
├── dashboard/                       Panel administrativo
│   ├── page.tsx
│   ├── dashboard-client.tsx
│   ├── page.module.css
│   └── driver-map.module.css
└── legal/                           Información legal
    ├── privacidad/
    ├── arco/
    └── components/
```

Cada pantalla tiene una responsabilidad visual concreta. El portal informativo presenta el proyecto, el login controla el acceso y el dashboard muestra las funciones administrativas. Las páginas legales complementan el flujo de acceso y explican el aviso de privacidad y la solicitud ARCO.

---

## 2. COMPOSICIÓN VISUAL DE LA PÁGINA

La composición visual de Sigil.IA se construye mediante encabezados, áreas de contenido, tarjetas, botones, formularios, indicadores y pies de página. Estos elementos se acomodan con CSS Grid y Flexbox para conservar una distribución ordenada tanto en pantallas grandes como en dispositivos pequeños.

El encabezado identifica la marca por medio del logotipo y contiene los enlaces principales. En el portal informativo permite navegar entre las secciones del proyecto, consultar cómo funciona el sistema y acceder al login. En el login muestra el logotipo, el selector de preferencias y la identidad del portal administrativo.

Las tarjetas se utilizan para agrupar información relacionada. Por ejemplo, en el login se utiliza una tarjeta para explicar la autenticación multifactor y otra para contener los formularios. En el dashboard las tarjetas se utilizan para mostrar resúmenes, estados, conductores, eventos y datos GPS.

Los botones principales utilizan azul para representar una acción disponible, como iniciar sesión, registrar una cuenta o consultar información. Los botones secundarios tienen fondos claros y bordes suaves para acciones complementarias. Los avisos utilizan cian o tonos claros para comunicar estados sin interrumpir visualmente el flujo.

La interfaz utiliza fondos claros para mantener la legibilidad. El portal informativo agrega patrones de líneas y el video del hero como elementos visuales relacionados con telemetría. El texto se coloca sobre capas de contraste para que no pierda visibilidad cuando aparece sobre un video.

---

## 3. PORTAL INFORMATIVO

El portal informativo se encuentra en `app/informativo`. Es la primera pantalla destinada a las personas que todavía no han iniciado sesión. Su función es explicar qué es Sigil.IA y dirigir al usuario hacia el acceso corporativo.

El archivo `app/informativo/page.tsx` construye la estructura de la página. Dentro de esta página se encuentra el encabezado, el hero, las secciones explicativas, la demostración de sensores, el área de contacto y el pie de página.

El hero es la sección visual más importante. Contiene una etiqueta de identificación, un título principal, un párrafo descriptivo y botones de navegación. También utiliza el video localizado en `public/hero-video.mp4`, que se reproduce como fondo. El video se mantiene detrás del contenido y se aplica una capa de contraste para evitar que interfiera con el texto.

La sección del proyecto explica la idea general de la plataforma y presenta los elementos que forman parte de su arquitectura conceptual. La sección de funcionamiento organiza el proceso en etapas, desde la detección de una señal hasta la consulta de información. La sección de funciones presenta las capacidades principales de la plataforma.

El componente `sensor-demo.tsx` representa de forma visual la integración de sensores. Su objetivo es enriquecer la presentación de la página y mostrar cómo podrían relacionarse el movimiento, el sonido, el peso y la conectividad del vehículo.

Los estilos de esta pantalla se encuentran en `app/informativo/page.module.css`. Este archivo controla el tamaño del hero, la posición del video, el contraste, las tarjetas, los botones, la retícula visual y la adaptación para pantallas pequeñas.

---

## 4. LOGIN Y REGISTRO

La pantalla de login está formada por dos áreas principales. El lado izquierdo presenta el mensaje “Control seguro para tu operación” y explica que el acceso combina contraseña con un segundo factor. El lado derecho contiene el panel interactivo donde se inicia sesión o se crea una cuenta.

La página visual se encuentra en `app/login/page.tsx`. El componente `auth-panel-query.tsx` prepara la lectura de parámetros de la URL y carga el componente principal `auth-panel.tsx`. La lógica interactiva se encuentra en `auth-panel.tsx`, donde se administran los formularios, los estados y las respuestas de autenticación.

El login trabaja con diferentes estados visuales. Inicialmente muestra el formulario de correo y contraseña. Después de validar las credenciales, muestra el segundo factor. Dependiendo de la configuración de la cuenta, el usuario puede verificar su identidad mediante un código TOTP o mediante el rostro enrolado.

El registro solicita el nombre, empresa, correo, teléfono y contraseña. También permite realizar la captura del rostro para generar el descriptor facial. El análisis facial se apoya en `face-recognition.ts` y en los modelos locales almacenados dentro de `public/models`.

Antes de utilizar el login aparece el aviso de privacidad en un modal bloqueante. El modal permanece visible hasta que el usuario marca la casilla de aceptación y presiona “Aceptar”. Si se selecciona “Rechazar”, la interfaz redirige al portal informativo. De esta forma, el acceso queda condicionado a una decisión explícita del usuario.

La apariencia del login se encuentra principalmente en `app/login/page.module.css`. Ahí se definen las dos columnas, las tarjetas, campos de entrada, botones, paneles de MFA, aviso modal y diseño responsivo.

---

## 5. DASHBOARD ADMINISTRATIVO

El dashboard se encuentra en `app/dashboard`. Es la interfaz privada que se muestra después de completar la autenticación. Su objetivo es concentrar en un solo espacio la información operativa del administrador.

El archivo `page.tsx` representa la ruta del dashboard. El componente `dashboard-client.tsx` administra la interacción con el usuario, la selección de conductores, el cambio entre pestañas y la consulta de información al backend.

Visualmente, el dashboard se organiza con una barra lateral, una zona principal de contenido y diferentes paneles de información. La barra lateral permite moverse entre el resumen, conductores y configuración. La zona principal presenta el administrador o conductor seleccionado y las secciones relacionadas con resumen, eventos, GPS, contacto y registros.

El apartado de conductores funciona como un CRUD visual. Desde la interfaz se puede crear un conductor, consultar la lista, editar sus datos y eliminar registros. El apartado de resumen presenta información general de la operación. El apartado de eventos muestra los incidentes registrados y el apartado GPS presenta la información de ubicación cuando existen datos disponibles.

La pantalla contempla estados vacíos. Si una cuenta administrativa es nueva y todavía no ha agregado conductores, no debe mostrar información inventada. De la misma manera, si no existen eventos o posiciones GPS para un conductor, la interfaz muestra un mensaje que indica que todavía no hay información registrada.

Los estilos principales del dashboard están en `app/dashboard/page.module.css`. El archivo `driver-map.module.css` contiene estilos específicos relacionados con la visualización del mapa o la información de ubicación.

---

## 6. PÁGINAS LEGALES

Las páginas legales se encuentran dentro de `app/legal`. La página `privacidad/page.tsx` muestra el aviso de privacidad integral y la página `arco/page.tsx` presenta la solicitud para ejercer derechos ARCO.

El componente `LegalLinks.tsx` permite reutilizar los enlaces de privacidad en el login y en el portal informativo. De esta manera, el usuario puede consultar el aviso desde el pie de página o desde el modal de acceso.

Los estilos de estas páginas se encuentran en sus respectivos archivos `page.module.css`. Conservan los colores, bordes, tarjetas y tipografía utilizados en el resto de Sigil.IA para que la información legal forme parte de la misma experiencia visual.

---

## 7. ARQUITECTURA MVC DEL PROYECTO

Sigil.IA aplica una arquitectura MVC de manera práctica. No utiliza un framework MVC tradicional con una carpeta única de modelos, vistas y controladores, sino que distribuye estas responsabilidades entre el frontend Next.js y el backend Express.

El recorrido general es el siguiente:

```text
Usuario
  ↓
Vista: páginas y componentes React
  ↓ fetch / JSON / JWT
Controlador: rutas y controladores Express
  ↓ consultas SQL parametrizadas
Modelo: PostgreSQL y archivos SQL
```

La Vista se encarga de mostrar información y capturar acciones. El Controlador recibe las solicitudes y aplica las reglas de la aplicación. El Modelo representa los datos, sus relaciones y la forma en que se guardan en PostgreSQL.

---

## 8. MODELO

El Modelo representa la información que utiliza el sistema. En Sigil.IA está compuesto principalmente por PostgreSQL, las tablas, las relaciones y las consultas SQL.

Los archivos que cumplen la función del Modelo se encuentran en `Sigil-backend/database`. El archivo `schema.sql` define la estructura de tablas como administradores, conductores, vehículos, eventos y posiciones GPS. Los archivos de migración agregan cambios específicos, como el aislamiento de datos administrativos y las tablas de privacidad y auditoría.

El archivo `src/config/db.ts` configura la conexión mediante un pool de PostgreSQL. Aunque se encuentra dentro de `src`, su responsabilidad se relaciona directamente con la persistencia porque permite que los controladores consulten y modifiquen la base de datos.

Las entidades principales del Modelo son las siguientes:

| Entidad | Representa |
|---|---|
| `admins` | Administradores del sistema. |
| `drivers` | Conductores registrados por cada administrador. |
| `vehicles` | Vehículos y dispositivos asociados. |
| `events` | Eventos generados por la operación o telemetría. |
| `gps_tracks` | Posiciones GPS registradas. |
| `privacy_documents` | Versiones del aviso de privacidad. |
| `privacy_consents` | Consentimientos aceptados o revocados. |
| `audit_logs` | Movimientos relevantes registrados por el sistema. |

En este proyecto no existe una carpeta `models` tradicional ni un ORM. Por eso se documenta el esquema SQL y las consultas parametrizadas como la implementación actual del Modelo.

---

## 9. VISTA

La Vista es la parte que observa y utiliza el usuario. Está implementada con Next.js, React, TypeScript y CSS Modules.

Las páginas visuales están dentro de `app`. Los archivos `page.tsx` construyen las rutas y los componentes `.tsx` permiten dividir la interfaz en piezas reutilizables. Por ejemplo, `auth-panel.tsx` concentra el panel interactivo del login y `sensor-demo.tsx` representa una demostración de sensores.

Los archivos `page.module.css` definen la apariencia de cada pantalla. En ellos se encuentran los colores, tamaños, espacios, bordes, sombras, distribución de columnas, estados hover y reglas responsivas.

La carpeta `public` también participa en la Vista porque contiene recursos que el navegador muestra directamente. Ahí se encuentran el logotipo, el video del portal, los documentos PDF y los modelos utilizados en el análisis facial local.

La Vista no se conecta directamente a PostgreSQL. Cuando necesita información, realiza una petición HTTP al backend y utiliza la respuesta para actualizar el contenido que ve el usuario.

---

## 10. CONTROLADOR

El Controlador se encuentra en `Sigil-backend/src/controllers`. Su función es recibir una solicitud HTTP, revisar sus datos, ejecutar la operación correspondiente y devolver una respuesta al frontend.

`auth.controller.ts` controla el registro, el inicio de sesión, el enrolamiento TOTP, la verificación facial, la verificación del código autenticador y la recuperación de contraseña.

`admin.controller.ts` controla la consulta y actualización del perfil del administrador autenticado.

`driver.controller.ts` controla el CRUD de conductores. Recibe los datos enviados desde el dashboard, valida los campos, ejecuta las consultas y devuelve el conductor creado o actualizado.

`dashboard.controller.ts` controla la consulta de eventos y GPS, además de recibir eventos provenientes de dispositivos autorizados.

Los controladores se conectan con las rutas definidas en `Sigil-backend/src/app.ts`. Antes de llegar a ellos pueden ejecutarse middlewares como `auth.middleware.ts`, que verifica el JWT, o `device-auth.middleware.ts`, que valida el acceso de un dispositivo de telemetría.

---

## 11. RELACIÓN ENTRE LAS CARPETAS Y MVC

La siguiente relación resume cómo participa cada carpeta dentro de la arquitectura:

| Carpeta o archivo | Parte MVC | Responsabilidad |
|---|---|---|
| `app/**/page.tsx` | Vista | Construye las pantallas. |
| `app/**/*.tsx` | Vista | Componentes e interacción visual. |
| `app/**/*.module.css` | Vista | Diseño y estilos. |
| `public/` | Vista | Recursos visuales públicos. |
| `Sigil-backend/src/controllers/` | Controlador | Procesa solicitudes y reglas. |
| `Sigil-backend/src/middleware/` | Capa transversal | Valida autenticación y solicitudes. |
| `Sigil-backend/src/services/` | Servicio de apoyo | Registra auditoría y tareas reutilizables. |
| `Sigil-backend/database/` | Modelo | Define datos y relaciones. |
| `Sigil-backend/src/config/db.ts` | Modelo/persistencia | Configura la conexión con PostgreSQL. |
| `Sigil-backend/src/app.ts` | Enrutamiento | Relaciona endpoints con controladores. |

El flujo de creación de un conductor ejemplifica esta separación. La Vista muestra el formulario y captura los datos. El Controlador recibe la petición `POST /api/drivers`, valida la información y ejecuta la operación. El Modelo guarda el registro en la tabla `drivers`. Finalmente, la respuesta vuelve a la Vista y el dashboard actualiza la tabla.

---

## 12. CONCLUSIÓN

La interfaz de Sigil.IA fue elaborada como una aplicación web dividida en un portal informativo, un login con autenticación multifactor, un dashboard administrativo y páginas legales. Cada pantalla tiene una función específica y mantiene una identidad visual común basada en tarjetas claras, azul institucional, acentos cian, retículas y componentes responsivos.

La arquitectura MVC se aplica separando la presentación, el procesamiento y la persistencia. Next.js y React forman la Vista; Express y sus controladores forman el Controlador; PostgreSQL, el esquema SQL y las consultas parametrizadas forman el Modelo.

Esta organización permite mantener el proyecto de forma ordenada. La interfaz puede cambiar sin mover las reglas principales del backend, y el backend puede validar las operaciones aunque una solicitud no provenga directamente de la interfaz visual. De esta manera, Sigil.IA cuenta con una base clara para continuar el desarrollo de sus módulos de conductores, eventos, GPS y telemetría.

