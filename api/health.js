// Public health check endpoint.
// Sirve para monitoreo externo (UptimeRobot, BetterStack, etc.).
// Devuelve 200 si la app + Supabase responden; 503 si la DB no es alcanzable.
// NO escribe nada — solo hace un SELECT trivial sobre `maquinas`.

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exfxohmvyekfoqlczqzm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

const STARTED_AT = Date.now();

export default async function handler(req, res) {
  const start = Date.now();
  const result = {
    ok: true,
    ts: new Date().toISOString(),
    uptime_ms: Date.now() - STARTED_AT,
    env: process.env.VERCEL_ENV || 'unknown',
    region: process.env.VERCEL_REGION || 'unknown',
    deployment: (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 7) || null,
  };

  // Quick supabase ping — table `maquinas` existe siempre, query mínima.
  try {
    if (!SUPABASE_KEY) {
      result.db = 'missing_key';
      result.ok = false;
    } else {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/maquinas?select=id&limit=1`, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
      });
      result.db = r.ok ? 'ok' : `error_${r.status}`;
      result.db_ms = Date.now() - start;
      if (!r.ok) result.ok = false;
    }
  } catch (e) {
    result.db = 'unreachable';
    result.db_error = String(e).slice(0, 100);
    result.ok = false;
  }

  res.status(result.ok ? 200 : 503).json(result);
}
