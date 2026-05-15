// Wrappers de fetch a las funciones serverless en /api/*.
// Centraliza el header de auth (Bearer token opcional vía VITE_APP_API_TOKEN)
// para no repetirlo en cada call site.

const apiHeaders = () => ({
  'Content-Type': 'application/json',
  ...(import.meta.env.VITE_APP_API_TOKEN && {
    Authorization: `Bearer ${import.meta.env.VITE_APP_API_TOKEN}`,
  }),
});

/**
 * POST /api/notify — envía mensaje al bot de Telegram (no-bloqueante).
 * El caller decide qué hacer si falla; este wrapper no lanza, solo loguea
 * (preservando el comportamiento histórico de "fire and forget" en App.jsx).
 *
 * @param {string} message
 * @param {string} [type='info']
 * @returns {Promise<Response|null>}
 */
export async function notifyTelegram(message, type = 'info') {
  try {
    const res = await fetch('/api/notify', {
      method: 'POST',
      headers: apiHeaders(),
      body: JSON.stringify({ message, type }),
    });
    if (!res.ok) console.warn('[notifyTelegram] non-ok response:', res.status);
    return res;
  } catch (e) {
    console.warn('[notifyTelegram] failed:', e);
    return null;
  }
}

/**
 * POST /api/parse-tds — manda PDF (base64) a Claude para extraer ficha técnica.
 * Devuelve el JSON parseado de la respuesta (incluye `.ficha` o `.error`).
 *
 * @param {string} pdfBase64
 * @param {'resina'|'papel'} tipo
 * @returns {Promise<object>}
 */
export async function parseTDS(pdfBase64, tipo) {
  const res = await fetch('/api/parse-tds', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ pdf_base64: pdfBase64, tipo }),
  });
  return res.json();
}

/**
 * POST /api/chat — pregunta a la AI con contexto del negocio.
 * Devuelve el JSON parseado de la respuesta (incluye `.reply` o `.error`).
 *
 * @param {string} message
 * @param {string} context
 * @returns {Promise<object>}
 */
export async function askAI(message, context) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: apiHeaders(),
    body: JSON.stringify({ message, context }),
  });
  return res.json();
}
