export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set' });

  const { message, context } = req.body;
  if (!message) return res.status(400).json({ error: 'No message provided' });

  try {
    const systemPrompt = `Eres el asistente AI de Kattegat Industries, una empresa de extrusión y laminación de polietileno (PE) en México.
Tu nombre es Kattegat AI. Respondes en español, de forma concisa y profesional.
Tienes acceso a los datos actuales del negocio que te paso como contexto.
Ayudas con análisis de producción, costos, clientes, cotizaciones y decisiones de negocio.
Si no tienes la info para responder algo, dilo honestamente.
Datos del negocio:
${context || "No hay datos disponibles en este momento."}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: message }]
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: `API error: ${err}` });
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || 'Sin respuesta';
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
