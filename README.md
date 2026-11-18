# Sigil.IA

**Ciberseguridad y telemetría vehicular inteligente.**

Sigil.IA es una plataforma web para supervisar flotas, conductores y eventos de seguridad mediante telemetría vehicular. Integra sensores ESP32, GPS, análisis de eventos, autenticación multifactor y un panel administrativo conectado a PostgreSQL.

El proyecto está compuesto por un frontend desarrollado con Next.js y TypeScript, además de un backend con Express y PostgreSQL. Su objetivo es proporcionar información operativa y alertas para ayudar a proteger los vehículos y facilitar la gestión de una flota.

## Inicio rápido

```bash
git clone https://github.com/Arman20252BIRD/Proyecto-Sigil.IA-Web.git
npm install
npm run dev
```

El portal informativo estará disponible en `http://localhost:3000/informativo`.

## Estructura principal

- `app/`: vistas, páginas y componentes del frontend Next.js.
- `servidor/controllers/`: controladores HTTP del backend Express.
- `servidor/models/`: conexión con PostgreSQL, modelos y scripts de base de datos.
- `servidor/middleware/`: autenticación, autorización y validaciones intermedias.
- `public/`: imágenes, logotipos, videos y otros recursos estáticos.
- `docs/`: documentación técnica, legal y funcional del proyecto.
