# Arquitectura

Documento técnico de Kattegat ERP. Para setup paso a paso ve a [`SETUP.md`](SETUP.md).

---

## Diagrama de alto nivel

```
┌────────────────┐     ┌──────────────────────┐     ┌──────────────────┐
│    Browser     │────▶│   Vercel Edge / λ    │────▶│     Supabase     │
│  (PWA React)   │◀────│   (api/* funcs)      │◀────│   (PostgreSQL)   │
└────────────────┘     └──────────────────────┘     └──────────────────┘
        ▲                       │   ▲
        │                       ▼   │
        │                  ┌──────────────────┐
        │                  │   Anthropic API  │   (Claude Haiku 4.5)
        │                  └──────────────────┘
        │                       │
        │              webhook  ▼
        │                  ┌──────────────────┐
        └──────────────────│   Telegram Bot   │   (@KattegatBot)
                           └──────────────────┘
```

Tres actores:

1. **Operador / admin web**: usa la PWA en navegador o instalada como app. Habla directo con Supabase (lectura/escritura usando la anon key, filtrado por RLS).
2. **Operador de planta (Gerardo)**: usa Telegram desde una tablet en la planta. El bot escribe a Supabase. La PWA refleja los datos en tiempo real (polling).
3. **Servicios serverless**: Vercel functions actúan de bridge cuando hace falta hacer cosas que el browser no debería hacer (llamar a Claude, enviar Telegram, log de errores).

---

## Capas

### 1. Frontend (`src/`)

**Bootstrap (`main.jsx`)**

```
<ErrorBoundary>           # Captura React errors → /api/log-error
  <ToastProvider>         # Notificaciones globales
    <App />
  </ToastProvider>
</ErrorBoundary>
installGlobalReporter()   # window.onerror + unhandledrejection
```

**Routing**: estado local en `App.jsx` (`mod` state), no React Router. Cada módulo es un `lazy(() => import(...))` para code-splitting.

**Auth**: WebAuthn biométrico opcional (`utils/biometric.js`) + selector simple de usuario (sin sessions reales en Supabase — la anon key es pública por diseño). Los usuarios viven en una tabla `usuarios` propia. Para producción seria con multi-tenant se necesita activar Supabase Auth.

**Persistencia local**: ninguna por ahora. Los datos vienen siempre de Supabase. Polling cada 120s (TODO: smart cache).

**Componentes reutilizables (`src/components/`)**

- `Toast.jsx` — `useToast()` hook + `<ToastProvider>` global. API: `toast.success/error/warning/info(msg)`.
- `ErrorBoundary.jsx` — captura crashes de React y los reporta a Supabase.
- `Skeleton.jsx` — placeholders durante carga.
- `EmptyState.jsx` — vista cuando una lista está vacía.
- `Modal.jsx` — modal genérico.
- `ui.jsx` — primitivos: `Loading`, `Btn`, `TxtInp`, `F`, `Badge`, `RR`.

**Lib (`src/lib/`)**

- `api.js` — wrappers de `/api/*` (notify, parse-tds, askAI). Incluye el header `Authorization: Bearer ${VITE_APP_API_TOKEN}` cuando está configurado.
- `format.js` — `fmtI`, `today`, `daysDiff`.
- `pdf.js` — builders de packing list, TDS, cotización (dynamic import de jsPDF).
- `qr.js` — generación de QR para trazabilidad (dynamic import de qrcode).
- `errorReporter.js` — buffer + flush a `/api/log-error`.

### 2. API serverless (`api/`)

Todas las funciones corren en Vercel (Node 20 lambdas). Cada una exporta `default async function handler(req, res)`.

| Endpoint | Auth | Propósito |
|---|---|---|
| `POST /api/chat` | Bearer | Chat con Claude (system prompt + contexto del negocio). Modelo `claude-haiku-4-5`. |
| `POST /api/parse-tds` | Bearer | Sube PDF base64, Claude extrae JSON estructurado de la ficha técnica (resina o papel). |
| `POST /api/notify` | Bearer | Envía mensaje al bot Telegram (alertas desde la PWA). |
| `POST /api/log-error` | público | Sink de errores cliente → tabla `error_log`. Sin auth porque debe funcionar aún cuando el resto está roto. |
| `GET /api/health` | público | Health check (200 OK / 503 si Supabase no responde). Para UptimeRobot, BetterStack, etc. |
| `POST /api/telegram-webhook` | Telegram | Webhook del bot. Maneja todos los comandos. Telegram verifica con su token, no hay middleware extra. |
| `GET /api/telegram-set-webhook` | público | One-shot para configurar el webhook al deployment actual de Vercel. |
| `GET /api/telegram-setup` | público | Devuelve los chat IDs disponibles del bot (útil para configurar `TELEGRAM_CHAT_ID`). |

**Middleware (`api/_auth.js`)**

- `requireAuth(req, res)` — valida `Authorization: Bearer <APP_API_TOKEN>` contra `process.env.APP_API_TOKEN`. **Fail-open**: si la env var no está, el endpoint queda abierto (con `console.warn`). Esto permite migrar sin downtime: primero deploy, luego set en Vercel y se activa.
- `rateLimit(req, res, { max, windowMs })` — bucket in-memory por IP. Default 30 req/min. Se reinicia entre cold starts (es OK para Vercel; si hace falta más, swap a Upstash Redis).

### 3. Database (Supabase / PostgreSQL)

**Migrations** versionadas en `supabase/migrations/`. Se aplican manualmente en orden (SQL Editor del dashboard):

| # | Archivo | Qué hace |
|---|---|---|
| 001 | `001_bot_operador.sql` | Crea `bot_usuarios`, `maquinas`, `turnos`, `diario_planta`, `temperaturas`, `mantenimientos`, `recepciones_mp`. Extiende `ordenes_trabajo` y `bobinas_pt`. Seed: Pintadora 1, Nando admin. |
| 002 | `002_bot_estados.sql` | `bot_estados` (state machine cross-request del bot) + `mezclas_resinas` (recetas multi-componente). |
| 003 | `003_disable_rls_bot.sql` | Desactiva RLS en tablas del bot (la auth la valida el código serverless, no la DB). |
| 004 | `004_error_log.sql` | Tabla `error_log` para tracking de errores. |

**Tablas core (preexistentes, anteriores a estas migrations)**

| Tabla | Función |
|---|---|
| `usuarios` | Usuarios web (no es Supabase Auth, es propia) |
| `clientes` | CRM |
| `cotizaciones` | Cotizaciones generadas |
| `actividades` | Audit log |
| `ordenes_trabajo` | OTs de producción |
| `bobinas_pt` | Bobinas de producto terminado |
| `resinas` | Inventario de resinas |
| `papel_bobinas` | Inventario de papel |
| `empleados` | Empleados para nómina |
| `facturas` | Facturación |
| `gastos` | Gastos |
| `proveedores` | Catálogo de proveedores |
| `ordenes_compra` | POs |
| `fichas_tecnicas` | TDS de resinas y papel |
| `solicitudes` | Workflow de correcciones |
| `config` | Settings globales (overhead, etc.) |

**RLS** — actualmente desactivado en las tablas del bot por simplicidad (el código serverless valida el rol). Las tablas core usan la anon key directamente desde el navegador, lo cual asume confianza en los usuarios del dominio. Para multi-tenant real hace falta activar Supabase Auth y políticas RLS por `auth.uid()`.

### 4. Telegram bot

Ver guía completa en [`BOT.md`](BOT.md).

**Arquitectura del bot**

```
Telegram user
   │
   ▼ webhook (POST)
api/telegram-webhook.js
   │
   ├─ getUserRole(userId)        # check bot_usuarios
   ├─ handleStateInput(...)      # state machine si esperamos input
   ├─ ... handler matching ...   # cmd routing (admin vs operador)
   ├─ supabase REST              # CRUD
   └─ sendMessage(...)           # respuesta
```

**State machine (`bot_estados`)** — cross-request. Cada usuario tiene una sola fila con `(estado, payload, expira_en)`. Los flujos multi-step (cargar OT → escoger papel → resinas → ancho) se modelan como transiciones de estado. Expira a los 30 minutos.

**Inline buttons + force_reply** — el flujo del operador es 100% button-driven; los argumentos viejos (`/trabajo OT-1234 Navigator 70 15 950`) siguen funcionando para power users.

### 5. AI integration

- **Modelo**: `claude-haiku-4-5-20251001` (rápido, barato, suficientemente bueno para chat operacional y extracción).
- **Endpoint chat**: prompt sistema con identidad ("eres Kattegat AI...") + contexto del negocio (datos serializados de la sesión actual).
- **Endpoint parse-tds**: el PDF se manda como `type: document` a Claude; el prompt pide JSON estricto con campos predefinidos (gramaje, MFI, densidad, etc.). Si no parsea, devuelve `raw` para debug.
- **Bot natural language**: cuando un admin escribe algo que no es comando, el bot llama a Claude con el contexto del negocio y devuelve la respuesta.

---

## Flujos de datos

### Crear una OT desde la PWA

```
User clicks "Nueva OT"
  → modal en Produccion.jsx
  → supabase.from('ordenes_trabajo').insert(...)
  → setOts(prev => [nueva, ...prev])
  → toast.success("OT creada")
  → notifyTelegram("Nueva OT: ...", "ot")   # fire-and-forget
       → /api/notify → Telegram
```

### Operador registra una bobina por Telegram

```
Operador: /bobina
  → bot_estados = { estado: "bobina_metros" }
  → "¿Cuántos metros?"
Operador: "1250"
  → handleStateInput detecta estado
  → registerBobina(turno, 1250)
  → INSERT bobinas_pt
  → INSERT diario_planta (tipo: "bobina")
  → UPDATE turnos (bobinas_count++)
  → "✅ Bobina registrada. Total turno: 8"
  → PWA detecta el cambio en el siguiente poll (120s)
```

### Error en producción

```
Algo crashea en React
  → ErrorBoundary captura
  → reportError(err)
       → cola → /api/log-error
       → INSERT error_log
  → render fallback UI con botón "Refrescar"

Async error en navegador (window.onerror)
  → installGlobalReporter listener
  → reportError(err)
  → mismo flujo
```

### Health probe externo

```
UptimeRobot ping cada 5 min
  → GET /api/health
  → SELECT trivial sobre maquinas
  → 200 { ok: true, db: "ok", db_ms: 45, ... }
       o
  → 503 { ok: false, db: "unreachable", ... }
```

---

## Convenciones de naming

**Tablas**: `snake_case`, plural, español (`ordenes_trabajo`, `bobinas_pt`, `mantenimientos`). Columnas también `snake_case` español (`fecha_creacion`, `kg_estimados`, `papel_marca`).

**Frontend**:

- Componentes: `PascalCase.jsx` (`Dashboard.jsx`, `ErrorBoundary.jsx`).
- Hooks: `useCamelCase.js`.
- Helpers: `camelCase.js`.
- Constantes: `UPPER_SNAKE` en `utils/constants.js`.

**API endpoints**: `kebab-case.js` (`telegram-webhook.js`, `parse-tds.js`).

**Branches**: `tipo/descripcion-corta` (`feat/bot-operador-v2`, `refactor/extract-hooks`).

---

## Patrones de código

### Async con manejo de error

Antes había `try { ... } catch {}` vacíos. Ahora la convención es:

```js
try {
  const { data, error } = await supabase.from('x').insert(...);
  if (error) {
    toast.error(`No se pudo guardar: ${error.message}`);
    reportError(error, { ctx: 'insert x' });
    return;
  }
  toast.success('Guardado');
} catch (e) {
  toast.error(`Error inesperado: ${e.message}`);
  reportError(e, { ctx: 'insert x' });
}
```

### Toast en lugar de `alert()`

Importar `useToast()` y usar `toast.success/error/warning/info`. Nunca `alert()` (rompe la UX móvil).

### Dynamic import para libs pesadas

`jsPDF` y `QRCode` son grandes. Cárgalos en el momento de uso, no en root:

```js
async function exportPDF() {
  const { buildPackingListPdf } = await import('../lib/pdf.js');
  buildPackingListPdf(data);
}
```

### Fire-and-forget para notificaciones

`notifyTelegram(...)` no se await-ea (devuelve `Promise<Response|null>`). Si falla, no debe bloquear la UI. El wrapper en `lib/api.js` lo trata así.

### State machine del bot

Cualquier comando que necesite más de un mensaje se modela como `bot_estados`. No usar variables globales en el handler (Vercel functions son stateless).

---

## Cosas TODO / pendientes

- **Tests**: no hay. Otro agente está armando Vitest en paralelo.
- **RLS en tablas core**: actualmente la anon key tiene acceso amplio. Para SaaS multi-tenant esto cambia.
- **Service worker propio**: hay `public/sw.js` pero falta confirmar que sirve para offline real (no solo cache de Vite default).
- **Refactor de `App.jsx`**: 1500+ líneas. Otro agente está extrayendo a contexts + hooks.
- **CI**: no hay GitHub Actions. El build pasa solo si el deploy de Vercel pasa.
