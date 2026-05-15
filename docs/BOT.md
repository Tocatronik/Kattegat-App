# Bot de Telegram

Guía completa del bot Telegram de Kattegat ERP. Para setup inicial ver [`SETUP.md`](SETUP.md).

---

## Resumen

Un solo bot, **dos roles**:

- **Admin** (Nando + cualquiera que agregues como `rol = 'admin'`): acceso total. Comandos de consulta, lenguaje natural via Claude, aprobaciones, gestión.
- **Operador** (Gerardo + tus operadores): flujo button-driven para capturar producción desde la tablet en planta. Acceso restringido — solo comandos de producción y diario.

Versión actual: **v2.2** — operador con botones inline, mezclas de resinas multi-componente.

---

## Roles y whitelist

El bot rechaza a cualquier user que no esté en la tabla `bot_usuarios`. Para autorizar a alguien:

1. Pídele que mande `/whoami` al bot. Le devuelve su `telegram_user_id`.
2. INSERT en Supabase:

```sql
INSERT INTO bot_usuarios (telegram_user_id, nombre, rol, activo)
VALUES (123456789, 'Nombre Apellido', 'operador', true);
-- rol: 'admin' o 'operador'
```

Para desactivar a alguien temporalmente, `UPDATE ... SET activo = false`. Para revocar de plano, `DELETE`.

---

## Comandos del operador

Diseñados para una tablet con una sola mano sucia en la planta. Todos funcionan **sin argumentos** — el bot guía con botones inline. Los argumentos del estilo viejo (`/trabajo OT-1234 Navigator 70 15 950`) siguen funcionando para power users.

### Flujo de turno (state machine)

```
   /prende        →  marca máquina prendida → estado: "iniciado"
       ↓
   /trabajo       →  bot pide OT, papel, resinas, % de cada una, ancho
       ↓               (botones inline, multi-step, expira en 30 min)
   /arranca       →  inicio formal de producción → estado: "trabajando"
       ↓
   /bobina        →  bot pide metros → INSERT bobinas_pt
       ↓                  (loop por cada bobina producida)
   /pausa <razon> →  estado: "pausado" + razón en diario
       ↓
   /reanuda       →  vuelve a "trabajando"
       ↓
   /apaga         →  estado: "apagado" (máquina enfriando)
       ↓
   /cierra        →  estado: "cerrado" (turno terminado)
```

### Cheat sheet operador

| Comando | Acción |
|---|---|
| `/prende` | Marca máquina prendida (inicio calentamiento) |
| `/trabajo` | Carga OT en curso. Flujo button-driven: OT → papel → resinas → % → ancho |
| `/arranca` | Producción inicia formalmente |
| `/bobina` | Registra una bobina (pide metros con `force_reply`) |
| `/temps` | Captura temperaturas (formulario dinámico según zonas configuradas en `maquinas.zonas_temps`) |
| `/pausa <razón>` | Pausa el turno con razón |
| `/reanuda` | Reanuda turno pausado |
| `/apaga` | Apaga máquina (estado: "apagado") |
| `/cierra` | Cierra turno definitivamente |
| `/mio` | Ver mi turno activo + bobinas registradas |
| `/papel` | Quick info de stock de papel |
| `/resinas` | Quick info de stock de resinas |

### Comandos de diario (operador + admin)

| Comando | Sintaxis | Acción |
|---|---|---|
| `/manto` | `/manto <tipo> <descripción>` | Registra mantenimiento (carbones, filtros, calibración, etc.) |
| `/visita` | `/visita <técnico> <descripción>` | Registra visita externa (Victor, proveedor, etc.) |
| `/recibe` | `/recibe pe\|papel <marca> <kg> [costo] [factura]` | Registra recepción de materia prima |

Todos escriben a la tabla `diario_planta` (log universal) + tabla específica (`mantenimientos`, `recepciones_mp`).

---

## Comandos del admin

Acceso total. Si un admin escribe algo que no es un comando, el bot lo manda a **Claude con contexto del negocio** y devuelve respuesta en lenguaje natural.

| Comando | Acción |
|---|---|
| `/ots` | Listar OTs activas/pendientes/pausadas |
| `/status <id>` | Detalle de una OT |
| `/aprobar <id>` | Aprobar una OT/cotización |
| `/inventario` | Stock de resinas + papel |
| `/alertas` | Alertas activas (stock bajo, OTs vencidas, etc.) |
| `/clientes` | Listar clientes |
| `/facturas` | Facturas pendientes |
| `/cobrar <id>` | Marcar factura como cobrada |
| `/proveedores` | Listar proveedores |
| `/fichas` | Listar fichas técnicas |
| `/produccion` | Producción del día |
| `/reporte` | Reporte resumen (KPIs) |
| `/po <id>` | Detalle de PO |
| `/pos` | Listar POs |
| `/cotizar <texto>` | Crear cotización (admin power flow) |
| `/chatid` | Devuelve el chat ID actual (útil para setear `TELEGRAM_CHAT_ID`) |

### Lenguaje natural

```
Usuario admin: ¿Cuánto vendimos esta semana?
Bot: <Claude responde con datos reales del business context>

Usuario admin: ¿Cuántas bobinas registró Gerardo hoy?
Bot: Hoy llevamos 14 bobinas en la Pintadora 1 (turno activo desde 7:42am)...
```

El contexto que se le pasa a Claude se construye en `getBusinessContext()` dentro de `telegram-webhook.js` — incluye snapshots de OTs, inventario, clientes recientes, etc.

---

## Comandos universales (cualquiera)

| Comando | Quién | Acción |
|---|---|---|
| `/start` | cualquiera | Menú de bienvenida con shortcuts |
| `/help` | cualquiera | Ayuda compacta |
| `/whoami` o `/quiensoy` | cualquiera | Ver tu user_id + rol (útil para autorizarte) |

Usuarios no autorizados solo pueden correr `/start`, `/help` y `/whoami`. Cualquier otro mensaje recibe un educado "no estás autorizado".

---

## State machine en detalle

Tabla `bot_estados` (migración 002):

```sql
CREATE TABLE bot_estados (
  user_id BIGINT PRIMARY KEY,
  estado TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  expira_en TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

Cada usuario tiene como máximo **una fila** (PK = `user_id`). Cuando el bot necesita más de un mensaje para completar una acción, escribe su progreso aquí.

### Estados del flujo `/trabajo`

```
trab_papel         → mostrando inline buttons con papeles disponibles
trab_resina_count  → preguntando cuántas resinas va a mezclar (1, 2, 3...)
trab_resina_pick   → mostrando buttons con resinas (loop hasta N)
trab_resina_pct    → pidiendo porcentaje de la resina seleccionada
trab_ancho         → pidiendo ancho en mm (force_reply numérico)
```

### Estados del flujo `/bobina`

```
bobina_metros      → esperando metros (force_reply numérico)
```

### Expiración

A los 30 min sin updates, `handleStateInput` borra la fila. Esto previene que el bot quede "atorado" si el operador deja la tablet.

---

## Estados del turno (`turnos.estado`)

```
iniciado     → recién creado con /prende, máquina calentando
calentando   → (no usado actualmente, reservado)
trabajando   → producción activa después de /arranca
pausado      → /pausa, captura razón
apagado      → /apaga, máquina enfriando
cerrado      → /cierra, turno finalizado, no se puede modificar
```

Constraint en la tabla:

```sql
CHECK (estado IN ('iniciado','calentando','trabajando','pausado','apagado','cerrado'))
```

---

## Configuración de máquinas

Tabla `maquinas`:

```sql
CREATE TABLE maquinas (
  id UUID PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,        -- 'PINTA-1'
  nombre TEXT NOT NULL,                -- 'Pintadora 1'
  zonas_temps JSONB DEFAULT '[]',      -- layout de zonas
  activa BOOLEAN DEFAULT true
);
```

`zonas_temps` define el formulario de `/temps`:

```json
[
  { "grupo": "Cañón", "zonas": ["Z1","Z2","Z3","Z4","Z5","Z6"] },
  { "grupo": "Malla", "zonas": ["M1"] },
  { "grupo": "Pipe",  "zonas": ["P1","P2"] },
  { "grupo": "Dado",  "zonas": ["D1","D2","D3","D4","D5","D6","D7","D8","D9"] }
]
```

El bot pinta el formulario de temperaturas dinámicamente con base en este JSON. Si agregas/quitas zonas o máquinas nuevas, solo edita esta tabla — no toca el código.

---

## Estructura del código (`api/telegram-webhook.js`)

Archivo grande (1500+ LOC) pero organizado en secciones:

```
1. Helpers Supabase     (query, insert, update, deleteRow)
2. Helpers Telegram     (sendMessage, answerCallback)
3. State machine        (getEstado, setEstado, clearEstado)
4. Handlers operador    (handlePrende, handleTrabajo, handleArranca, ...)
5. Handlers diario      (handleManto, handleVisita, handleRecibe)
6. Handlers admin       (handleOts, handleInventario, ...)
7. Callback handler     (procesa botones inline)
8. State input handler  (procesa force_reply en medio de un flujo)
9. Claude integration   (askClaude + getBusinessContext)
10. Main handler        (router por cmd + role check)
```

### Cómo añadir un nuevo comando

1. Decide rol: operador, admin, o universal.
2. Escribe el handler `async function handleNuevoComando(userId, userName, args) { ... return { text, reply_markup? } }`.
3. Agrega el branch en el main handler:

```js
else if (cmd === '/nuevo') result = await handleNuevoComando(userId, userName, argsOriginal);
```

4. Si requiere multi-step, mete los estados en `handleStateInput` y usa `setEstado/getEstado`.
5. Actualiza `COMMANDS['/help']` con la nueva línea.
6. Test: deploy preview, manda el comando, valida en Supabase que la fila se creó.

### Cómo añadir botones inline

```js
return {
  text: 'Escoge una opción:',
  reply_markup: {
    inline_keyboard: [
      [{ text: 'Opción A', callback_data: 'opt_a' }],
      [{ text: 'Opción B', callback_data: 'opt_b' }],
    ]
  }
};
```

Cuando el usuario toca un botón, `tgUpdate.callback_query` llega al webhook. Maneja en `handleCallback` con un switch sobre `data`.

---

## Debugging

### El bot no responde

1. `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo` — ¿la URL apunta a tu Vercel?
2. Vercel → Deployments → Functions → `telegram-webhook` — ¿hay logs / errores?
3. Tu usuario está en `bot_usuarios` con `activo = true`?

### El flujo button-driven se traba

```sql
DELETE FROM bot_estados WHERE user_id = TU_ID;
```

Eso resetea tu state. Mandale `/start` de nuevo.

### El bot responde algo random a un mensaje

Si eres admin y el comando no matchea ningún handler, va a Claude. Si es operador, el bot rechaza con "Como operador solo tienes acceso a...".

### Las bobinas no aparecen en la PWA

La PWA hace polling cada 120s. Si quieres ver en tiempo real, refresca manualmente. (TODO: real-time vía Supabase Realtime.)

---

## Seguridad

- El bot **siempre** valida el rol (`getUserRole`) antes de cualquier acción.
- Los operadores no pueden mandar comandos admin — el handler rechaza explícitamente.
- El token del bot vive solo en env vars de Vercel server-side. **Nunca** se expone al cliente.
- Los webhooks de Telegram no usan `APP_API_TOKEN` (Telegram firma los requests con su propio token via la URL).

---

## Limitaciones conocidas

- **Sin notificaciones push reales**: la PWA no se entera de cambios hasta el siguiente poll. (TODO: Supabase Realtime → WebSocket.)
- **State machine se reinicia entre cold starts** de Vercel: no, en realidad vive en `bot_estados` (Postgres), así que es robusto. Solo expira a 30 min.
- **Un usuario, un estado**: si un operador tiene un flujo `/trabajo` abierto y mete `/manto` en medio, el flujo se rompe. Es una decisión: priorizamos simplicidad.
- **No hay i18n**: todo en español. Si llegas con un equipo bilingüe, hay que parametrizar las cadenas.
