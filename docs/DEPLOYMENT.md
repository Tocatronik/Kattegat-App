# Deployment

Cómo deployar Kattegat ERP en Vercel. Asume que ya hiciste el setup de Supabase + Telegram según [`SETUP.md`](SETUP.md).

---

## 1. Conectar el repo a Vercel

1. Crea cuenta en <https://vercel.com> (login con GitHub).
2. **Add new → Project → Import GitHub repository**.
3. Selecciona `Tocatronik/Kattegat-App`.
4. Vercel detecta Vite automáticamente. Settings sugeridos:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
   - **Install command**: `npm install`

No cambies nada de eso; los defaults funcionan.

---

## 2. Variables de entorno en Vercel

**Settings → Environment Variables**. Agrega todas estas (los valores los obtuviste en `SETUP.md`):

| Variable | Scope | Valor / Notas |
|---|---|---|
| `VITE_SUPABASE_URL` | Production + Preview + Dev | URL pública del proyecto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Production + Preview + Dev | Anon key (segura para ir en bundle) |
| `VITE_APP_API_TOKEN` | Production + Preview | Token aleatorio para autenticar llamadas del frontend al backend. Genera con `openssl rand -hex 32` |
| `SUPABASE_URL` | Production + Preview + Dev | Misma URL (server-side fallback) |
| `SUPABASE_KEY` | Production + Preview + Dev | Anon key (server-side OK) |
| `TELEGRAM_BOT_TOKEN` | Production + Preview | Bot token de @BotFather |
| `TELEGRAM_CHAT_ID` | Production | Chat ID donde el bot envía alertas |
| `ANTHROPIC_API_KEY` | Production + Preview | API key de Claude |
| `APP_API_TOKEN` | Production + Preview | **Mismo valor** que `VITE_APP_API_TOKEN` (el server valida contra esta) |

### Notas importantes

- **`VITE_*`** se inyectan en el bundle del cliente — son visibles en el browser. No metas secretos ahí (la anon key es pública por design).
- **Sin `VITE_*`** prefix → solo accesibles desde server-side (`api/*.js`). Aquí van Claude API key, Telegram bot token, etc.
- **`APP_API_TOKEN` opcional**: si lo dejas vacío, los endpoints `/api/chat`, `/api/parse-tds`, `/api/notify` quedan abiertos a internet (fail-open con warning). Para producción, **siempre** ponlo.
- Cambios en env vars **no aplican retroactivamente** — necesitas redeployear (Deployments → Latest → **Redeploy**).

---

## 3. Primer deploy

1. Push a `main` (o usa **Deploy** desde el dashboard de Vercel).
2. Vercel hace `npm install && npm run build`.
3. Si pasa, te asigna `<projecto>.vercel.app` + tu dominio custom si configuraste.

### Verificar

```bash
curl https://<tu-app>.vercel.app/api/health
```

Debe responder:

```json
{ "ok": true, "ts": "...", "db": "ok", "db_ms": 45, ... }
```

Si `db != "ok"` revisa las env vars del Supabase.

---

## 4. Configurar dominio custom

En el caso de Kattegat, la prod es `kattegat-app.vercel.app` (subdominio Vercel default). Para usar dominio propio:

1. **Settings → Domains → Add**.
2. Pega tu dominio (ej. `app.kattegat.mx`).
3. Vercel te da los registros DNS a configurar.
4. Cambia los DNS en tu registrar (Namecheap, GoDaddy, Cloudflare).
5. Espera propagación (5 min - 24 hr).

---

## 5. Configurar el webhook de Telegram

Cada vez que cambias el dominio (custom domain, primer deploy, etc.), reconfigura:

```
https://<tu-app>.vercel.app/api/telegram-set-webhook
```

Abre esa URL en el browser. Devuelve confirmación. Esto NO se hace automáticamente.

---

## 6. Workflow de deploy

```
Local (refactor/feature/fix branch)
   ↓
git push origin <branch>
   ↓
Vercel detecta push → genera preview URL automática
   ↓
Pruebas en preview URL (https://<app>-<branch>-<hash>.vercel.app)
   ↓
PR a main → review → merge
   ↓
Vercel detecta merge a main → deploy automático a producción
```

### Reglas

- **Nunca push directo a `main`**. Producción se queda intacta hasta que un PR pasa preview.
- **Cada PR genera su preview URL** — úsala para validar antes de mergear.
- **Smoke test en preview**: dashboard carga, una OT se crea, el bot responde, `/api/health` OK.
- **Migrations SQL**: se aplican manualmente en el dashboard de Supabase **antes** de mergear el código que las usa. Si invertis el orden, el deploy queda roto.

---

## 7. Rollback

Si un deploy rompe producción:

### Opción A — Revert desde Vercel (instantáneo, no requiere git)

1. **Deployments → busca el último deploy sano → menú "..." → Promote to Production**.
2. Listo. La URL apunta de nuevo al deploy viejo.

### Opción B — Revert desde Git (limpio)

```bash
git revert <hash-malo>
git push origin main
```

Vercel re-deploya automáticamente con el commit revertido.

### Opción C — Force reset (solo si el revert también rompe)

```bash
git reset --hard <hash-bueno>
git push --force origin main
```

> ⚠️ Force push destruye el histórico — solo si estás seguro y nadie más está trabajando en `main`.

---

## 8. Monitoreo

### Logs

- **Vercel → Deployments → seleccionar deploy → Functions**: logs de cada llamada a `api/*`.
- **Vercel → Logs (live)**: stream en vivo.

### Errores cliente

Tabla `error_log` en Supabase. Query rápida:

```sql
SELECT ts, source, message, url
FROM error_log
WHERE resolved = false AND ts > now() - interval '24 hours'
ORDER BY ts DESC
LIMIT 50;
```

### Uptime externo

Apunta tu servicio favorito (UptimeRobot, BetterStack, Pingdom) a:

```
GET https://<tu-app>.vercel.app/api/health
```

Configurar alerta si `status != 200` por más de 2 checks consecutivos.

---

## 9. Cosas a checar antes de cada deploy a `main`

- [ ] `npm run build` pasa localmente sin warnings nuevos.
- [ ] `npm run lint` no introduce errores nuevos.
- [ ] Probaste el cambio en la URL de preview de Vercel.
- [ ] Si hay migration SQL, ya la corriste en Supabase prod.
- [ ] Si agregaste env vars nuevas, ya están seteadas en Vercel para Production scope.
- [ ] El commit message describe el "por qué" del cambio.

---

## 10. Costos

| Servicio | Plan actual | $/mes aprox |
|---|---|---|
| Vercel | Hobby (free) | $0 |
| Supabase | Free | $0 (hasta 500 MB DB + 5 GB egress) |
| Anthropic | Pay-as-you-go | $5-15 (depende del uso de Claude) |
| Telegram | Free | $0 |

Si pasas el free tier de Vercel o Supabase, los costos se vuelven $20-25/mes Vercel Pro + $25/mes Supabase Pro.
