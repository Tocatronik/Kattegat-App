# Setup local

Pasos para correr Kattegat ERP en tu máquina desde cero. Si solo vas a hacer deploys, ve directo a [`DEPLOYMENT.md`](DEPLOYMENT.md).

---

## Requisitos

- **Node.js 20+** (Vercel usa Node 20 en runtime; útil para reproducir bugs serverless localmente).
- **npm 10+** (viene con Node 20).
- **Git**.
- Cuenta en [Supabase](https://supabase.com), [Vercel](https://vercel.com), [Anthropic](https://console.anthropic.com), [Telegram](https://web.telegram.org).

---

## 1. Clonar e instalar

```bash
git clone https://github.com/Tocatronik/Kattegat-App.git
cd Kattegat-App
npm install
```

---

## 2. Supabase

### 2.1 Crear el proyecto

1. Entra a <https://supabase.com> → **New project**.
2. Nombre: `kattegat-erp` (o el que quieras).
3. Anota la **Project URL** (`https://xxxxx.supabase.co`) y la **anon key**. Vas a usarlas en `.env.local`.
4. También necesitas la **service role key** para algunos scripts de admin (no se commitea). La encuentras en **Settings → API**.

### 2.2 Schema base (preexistente)

El repo no incluye las migrations originales de las tablas core (`clientes`, `ordenes_trabajo`, `resinas`, etc.). Si arrancas un proyecto nuevo, vas a tener que recrear el schema. Opciones:

- Hacer un dump de la instancia actual de producción y aplicarlo (recomendado si tienes acceso).
- Recrearlo manualmente leyendo los inserts/selects del código (`grep -r "supabase.from" src/`).

> **TODO**: agregar `000_initial_schema.sql` al repo para que cualquiera pueda bootstrappear.

### 2.3 Aplicar migraciones del bot + extras

En el dashboard de Supabase → **SQL Editor** → New query. Pega y corre cada archivo en orden:

1. `supabase/migrations/001_bot_operador.sql`
2. `supabase/migrations/002_bot_estados.sql`
3. `supabase/migrations/003_disable_rls_bot.sql`
4. `supabase/migrations/004_error_log.sql`

Verifica que se crearon:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'bot_usuarios','bot_estados','maquinas','turnos',
  'diario_planta','temperaturas','mantenimientos',
  'recepciones_mp','mezclas_resinas','error_log'
);
```

Deberían salir las 10.

### 2.4 Whitelist de usuarios del bot

La migración 001 crea a Nando como admin con el `telegram_user_id` 383853233. Si vas a usar tu propio bot, agrégate:

```sql
INSERT INTO bot_usuarios (telegram_user_id, nombre, rol, activo)
VALUES (TU_TELEGRAM_ID, 'Tu Nombre', 'admin', true);
```

Para conseguir tu `TU_TELEGRAM_ID`, mándale `/whoami` al bot una vez configurado (sección 4).

---

## 3. Anthropic API key

1. Entra a <https://console.anthropic.com>.
2. **API keys → Create key**.
3. Carga créditos en **Billing** (mínimo $5 alcanza para semanas de uso con Haiku 4.5).
4. Guárdala como `ANTHROPIC_API_KEY` — solo va en server-side (no se expone al cliente).

---

## 4. Bot de Telegram

### 4.1 Crear el bot

1. Abre Telegram, busca `@BotFather`.
2. `/newbot` → dale un nombre y username (`@KattegatBot` ya está tomado; usa el tuyo).
3. Te devuelve el **bot token**. Esto es `TELEGRAM_BOT_TOKEN`.
4. Opcional pero recomendado: `/setcommands` y pega:

```
start - Mostrar comandos
help - Ayuda
whoami - Ver mi ID y rol
prende - Prender máquina
trabajo - Cargar OT en curso
arranca - Iniciar producción
bobina - Registrar bobina
temps - Capturar temperaturas
pausa - Pausar turno
reanuda - Reanudar turno
apaga - Apagar máquina
cierra - Cerrar turno
mio - Ver mi turno actual
manto - Registrar mantenimiento
visita - Registrar visita técnica
recibe - Registrar recepción MP
ots - Ver OTs (admin)
inventario - Ver stock (admin)
clientes - Ver clientes (admin)
```

### 4.2 Obtener tu `TELEGRAM_CHAT_ID`

Después de hacer el deploy en Vercel (sección 6), abre en el browser:

```
https://<tu-app>.vercel.app/api/telegram-setup
```

Te devuelve los chats donde el bot tiene actividad reciente. Copia el `chat_id` del privado contigo (o del grupo si quieres notificaciones grupales). Eso es `TELEGRAM_CHAT_ID`.

### 4.3 Configurar el webhook

```
https://<tu-app>.vercel.app/api/telegram-set-webhook
```

Esto le dice a Telegram dónde mandar los mensajes. Solo hay que correrlo una vez (o cuando cambies de dominio).

Verificar:

```bash
curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
```

Debería listar tu URL de Vercel en `url`.

---

## 5. Variables de entorno locales

```bash
cp .env.example .env.local
```

Edita `.env.local`:

```bash
# Frontend (Vite las inyecta en build, prefijo VITE_)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# Token opcional para llamar /api/* desde el frontend.
# Si lo dejas vacío, los endpoints de Claude/notify son públicos (fail-open).
VITE_APP_API_TOKEN=

# Server-side (solo necesario si corres `vercel dev`)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGc...
TELEGRAM_BOT_TOKEN=123:ABC...
TELEGRAM_CHAT_ID=383853233
ANTHROPIC_API_KEY=sk-ant-...
APP_API_TOKEN=         # mismo valor que VITE_APP_API_TOKEN si lo activas
```

> `.env.local` está en `.gitignore` — **nunca** lo commitees.

---

## 6. Correr local

### Dev server (solo frontend)

```bash
npm run dev
```

Abre <http://localhost:5173>. Los `/api/*` no funcionan aquí (Vite no los sirve); para eso necesitas `vercel dev`.

### Dev server completo (con serverless local)

```bash
npm i -g vercel
vercel dev
```

Esto sí monta `/api/*` localmente en `http://localhost:3000`. Útil para probar el webhook del bot, pero el webhook de Telegram solo apunta a HTTPS — usa ngrok si necesitas eso en local:

```bash
ngrok http 3000
# Toma la URL https y configura: <ngrok-url>/api/telegram-set-webhook
```

### Build de producción

```bash
npm run build       # genera dist/
npm run preview     # sirve dist/ en localhost:4173
```

---

## 7. Verificar que todo funciona

| Check | Cómo |
|---|---|
| Frontend conecta a Supabase | `npm run dev`, login con cualquier usuario, ver Dashboard con datos |
| Toast funciona | Provocar un error de validación en cualquier formulario |
| ErrorBoundary funciona | Throw manual desde devtools — debería verse fallback UI |
| Bot responde | `/start` en Telegram al bot |
| Webhook live | `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo` → ver tu URL Vercel |
| Health check | `curl https://<tu-app>.vercel.app/api/health` → `{ ok: true, db: "ok" }` |
| Claude API | En la PWA: módulo AIChat → mandar pregunta → respuesta en español |

Si algo falla, revisa los logs en **Vercel → Deployments → Functions** o en la consola del navegador.

---

## Siguiente paso

Para deploy a producción: [`DEPLOYMENT.md`](DEPLOYMENT.md).
Para entender al bot: [`BOT.md`](BOT.md).
Para arquitectura: [`ARCHITECTURE.md`](ARCHITECTURE.md).
