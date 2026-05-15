/**
 * Auth middleware para endpoints serverless (Express-style en Vercel).
 *
 * Uso:
 *   import { requireAuth, rateLimit } from './_auth.js';
 *   export default async function handler(req, res) {
 *     if (!requireAuth(req, res)) return;
 *     if (!rateLimit(req, res)) return;
 *     // ... resto del handler
 *   }
 *
 * Fail-open: si APP_API_TOKEN no está seteado en el entorno, el middleware
 * deja pasar la request con un warning. Esto permite migrar sin downtime —
 * primero deploy, después set env var en Vercel, y el middleware se activa.
 */

/**
 * Valida el token Bearer contra APP_API_TOKEN.
 * Retorna true si OK (continuar), false si rechazado (la respuesta ya se envió).
 */
export function requireAuth(req, res) {
  const token = process.env.APP_API_TOKEN;
  if (!token) {
    console.warn('[auth] APP_API_TOKEN no está seteado — endpoint está ABIERTO. Configura la env var en Vercel.');
    return true; // fail-open
  }
  const header = req.headers?.authorization || req.headers?.Authorization || '';
  const presented = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (presented !== token) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

/**
 * Rate-limit simple in-memory (se reinicia entre cold starts en Vercel).
 * Para protección real, reemplazar con Upstash Redis después.
 * Retorna true si OK (continuar), false si rate-limited (la respuesta ya se envió).
 */
const RATE_BUCKETS = new Map();
export function rateLimit(req, res, opts = {}) {
  const max = opts.max || 30;
  const windowMs = opts.windowMs || 60_000;
  const fwd = req.headers?.['x-forwarded-for'] || req.headers?.['X-Forwarded-For'] || 'unknown';
  const key = fwd.toString().split(',')[0].trim();
  const now = Date.now();
  const bucket = RATE_BUCKETS.get(key) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  RATE_BUCKETS.set(key, bucket);
  if (bucket.count > max) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    res.status(429).json({ error: 'rate_limited', retryAfter });
    return false;
  }
  return true;
}
