export const config = { api: { bodyParser: { sizeLimit: '10mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { pdf_base64, tipo } = req.body;
  if (!pdf_base64) return res.status(400).json({ error: 'No PDF provided' });

  const extractPrompt = tipo === 'papel' ? `Analiza este PDF de ficha técnica de PAPEL y extrae los datos en el siguiente formato JSON exacto.
Si un campo no está disponible en el documento, déjalo como string vacío "".
Responde SOLO con el JSON, sin texto adicional, sin markdown, sin backticks.

{
  "nombre": "nombre del producto exacto como aparece",
  "proveedor": "nombre del fabricante/proveedor",
  "tipo": "Bond|Couché|Kraft|Térmico|Bristol|Otro",
  "gramaje": "gramaje en g/m² (solo número)",
  "brightness": "brightness/blancura en % (solo número)",
  "opacidad": "opacidad en % (solo número)",
  "humedad": "humedad en % (solo número)",
  "espesor": "espesor en μm (solo número)",
  "resistencia_tension": "resistencia a tensión en kN/m (solo número)",
  "resistencia_rasgado": "resistencia al rasgado en mN (solo número)",
  "porosidad": "porosidad Gurley en s/100ml (solo número)",
  "norma": "normas de referencia principales separadas por coma",
  "notas": "info adicional relevante: aplicaciones, condiciones de proceso, cumplimiento regulatorio, aditivos"
}` : `Analiza este PDF de ficha técnica de RESINA plástica y extrae los datos en el siguiente formato JSON exacto.
Si un campo no está disponible en el documento, déjalo como string vacío "".
Responde SOLO con el JSON, sin texto adicional, sin markdown, sin backticks.

{
  "nombre": "nombre del producto exacto como aparece (ej: Supreme 021)",
  "grado": "grado o código del producto",
  "fabricante": "nombre del fabricante",
  "tipo_polimero": "PEBD|PEAD|PELBD|PP|Ionómero|EVA|Supreme|POP|Otro",
  "mfi": "melt flow index en g/10min (solo número, ej: 1.0)",
  "densidad": "densidad en g/cm³ (solo número, ej: 0.902)",
  "punto_fusion": "melting temperature/punto de fusión en °C (solo número)",
  "temp_min": "temperatura mínima de proceso en °C (solo número)",
  "temp_max": "temperatura máxima de proceso en °C (solo número)",
  "resistencia_tension": "tensile strength en MPa o kg/cm² (solo número, usar el valor MD si hay MD/TD)",
  "elongacion": "elongation at break en % (solo número, usar valor MD si hay MD/TD)",
  "dureza": "dureza Shore o Vicat softening temp",
  "norma": "normas de test principales separadas por coma (ej: ASTM D1238, ASTM D792)",
  "notas": "info adicional: tipo de copolímero, aplicaciones, cumplimiento FDA/EU, aditivos, condiciones de extrusión"
}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdf_base64
              }
            },
            {
              type: 'text',
              text: extractPrompt
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || 'API Error';
      if (msg.includes('credit balance')) return res.status(402).json({ error: 'Sin créditos API. Agrega fondos en console.anthropic.com' });
      return res.status(response.status).json({ error: msg });
    }

    const data = await response.json();
    const raw = data.content?.[0]?.text || '{}';

    // Parse JSON from response (handle potential markdown wrapping)
    let parsed;
    try {
      const jsonStr = raw.replace(/^```json?\s*/i, '').replace(/```\s*$/i, '').trim();
      parsed = JSON.parse(jsonStr);
    } catch {
      return res.status(200).json({ error: 'No se pudo parsear respuesta AI', raw });
    }

    return res.status(200).json({ ficha: parsed });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
