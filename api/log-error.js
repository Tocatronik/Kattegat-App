const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exfxohmvyekfoqlczqzm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

export default async function handler(req, res) {
  // Accept POST + OPTIONS (for CORS preflight if needed)
  if (req.method === 'OPTIONS') return res.status(200).json({ ok: true });
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' });

  try {
    const body = req.body || {};
    // Validate minimal shape; drop noise
    if (!body.message || String(body.message).length < 3) {
      return res.status(200).json({ ok: true, skipped: true });
    }
    const payload = {
      source: body.source || 'client',
      level: body.level || 'error',
      message: String(body.message).slice(0, 2000),
      stack: body.stack ? String(body.stack).slice(0, 5000) : null,
      user_agent: req.headers?.['user-agent'] || null,
      url: body.url || req.headers?.referer || null,
      context: body.context || null,
    };
    const r = await fetch(`${SUPABASE_URL}/rest/v1/error_log`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!r.ok) {
      const txt = await r.text();
      console.error('[log-error] supabase write failed:', r.status, txt.slice(0, 300));
    }
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('[log-error] handler error:', e);
    return res.status(200).json({ ok: true, error: 'logged_to_console' });
  }
}
