# Kattegat ERP

> ERP/PWA para Kattegat Industries — gestión de producción, inventario, ventas y bot de Telegram para el operador de planta. Hecho a la medida para una planta de extrusión y laminación de polietileno (PE) en México.

[![Vercel](https://img.shields.io/badge/deploy-vercel-black)](https://kattegat-app.vercel.app)
[![Stack](https://img.shields.io/badge/stack-React%2019%20%2B%20Vite%20%2B%20Supabase-blue)]()
[![PWA](https://img.shields.io/badge/PWA-installable-success)]()

Producción en vivo: <https://kattegat-app.vercel.app>

---

## Stack

- **Frontend:** React 19, Vite 7, Tailwind 4, PWA (manifest + service worker)
- **Backend:** Supabase (PostgreSQL + Auth + REST API auto-generada)
- **Hosting:** Vercel (PWA estática + serverless functions en `api/`)
- **Bot:** Telegram via webhook serverless (`api/telegram-webhook.js`)
- **AI:** Anthropic Claude API — modelo `claude-haiku-4-5` (chat + parseo de fichas técnicas)
- **PDF/QR:** `jsPDF` + `qrcode` (cargados con dynamic import para no engordar el bundle inicial)

## Quick start

```bash
git clone https://github.com/Tocatronik/Kattegat-App.git
cd Kattegat-App
npm install
cp .env.example .env.local        # rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY
npm run dev                        # http://localhost:5173
```

Sin variables de entorno, la app arranca igual usando fallbacks de la instancia de Supabase de producción (ver `src/supabase.js`). Para desarrollo serio, define las tuyas. Sigue [`docs/SETUP.md`](docs/SETUP.md) para el setup completo.

## Estructura

```
kattegat-app/
├── api/                       # Vercel serverless functions (Node 20)
│   ├── _auth.js               # Bearer-token + rate-limit middleware
│   ├── chat.js                # Claude chat con contexto del negocio
│   ├── health.js              # Health check público (uptime probes)
│   ├── log-error.js           # Sink de errores → error_log table
│   ├── notify.js              # Envía mensaje al bot de Telegram
│   ├── parse-tds.js           # Claude parsea PDFs de fichas técnicas
│   ├── telegram-webhook.js    # Bot completo (admin + operador, 1500+ LOC)
│   ├── telegram-set-webhook.js
│   └── telegram-setup.js
├── public/                    # Assets estáticos + manifest PWA + sw.js
├── src/
│   ├── App.jsx                # Root + routing entre módulos
│   ├── main.jsx               # Bootstrap: ErrorBoundary + ToastProvider
│   ├── supabase.js            # Cliente Supabase singleton
│   ├── components/            # Toast, ErrorBoundary, Skeleton, EmptyState, Modal, ui
│   ├── lib/                   # Utilities puras: api, format, pdf, qr, errorReporter
│   ├── modules/               # 13 módulos lazy-loaded (Dashboard, CRM, etc.)
│   └── utils/                 # helpers, biometric, calcNomina, constants
├── supabase/
│   └── migrations/            # 004 migraciones SQL versionadas
├── .env.example
└── vite.config.js
```

Detalle completo en [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Módulos (13)

| Módulo | Función |
|---|---|
| Dashboard | Resumen de OTs, alertas, KPIs |
| CRM | Pipeline de clientes + cotizaciones + actividades |
| Cotizador | Cálculo y export de cotizaciones (PDF) |
| Producción | OTs, bobinas, packing list, trazabilidad QR |
| Inventario | Resinas + papel: stock, recepciones, alertas |
| OrdenesCompra | POs a proveedores |
| Proveedores | Catálogo de proveedores |
| FichasTecnicas | TDS de resinas y papel (Claude parsea PDFs) |
| Nóminas | Cálculo simple de nómina semanal |
| Contabilidad | Facturas, gastos, P&L básico |
| Solicitudes | Workflow de correcciones |
| AIChat | Chat con Claude usando contexto del negocio |
| ActividadLog | Audit log filtrable |

## Documentación

- [`docs/SETUP.md`](docs/SETUP.md) — primer setup (Supabase + Telegram + local dev)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — stack + capas + flujo de datos + tablas
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — Vercel, env vars, workflow, rollback
- [`docs/BOT.md`](docs/BOT.md) — comandos completos del bot, roles, state machine

## Scripts

```bash
npm run dev       # dev server con HMR
npm run build     # producción a dist/
npm run preview   # servir dist/ localmente
npm run lint      # ESLint
```

## Convenciones

- **Branches:** `feat/*`, `fix/*`, `refactor/*`, `chore/*`. **Nunca** push directo a `main`.
- **Commits:** primera línea ≤ 60 chars, en español, claro. El cuerpo explica el "por qué".
- **PRs:** preview de Vercel obligatorio antes de mergear a `main`.
- **Idioma:** comentarios y UI en español; nombres de variables/funciones en inglés.

## Estado actual

Producción estable en [kattegat-app.vercel.app](https://kattegat-app.vercel.app).

- Bundle inicial: 457 KB (134 KB gzip)
- Code-split: jsPDF + QRCode dynamic, todos los módulos lazy
- Error tracking: client → `/api/log-error` → tabla `error_log`
- Health check: `GET /api/health` (200 OK / 503 si DB caída)
- Bot Telegram v2.2: button-driven para operador, lenguaje natural para admin

## Licencia

Privado — Kattegat Industries. No publicar.
