// Set Telegram webhook to point to our Vercel endpoint
export default async function handler(req, res) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

  // Auto-detect the Vercel deployment URL
  const host = req.headers.host || 'kattegat-app.vercel.app';
  const webhookUrl = `https://${host}/api/telegram-webhook`;

  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: webhookUrl })
    });
    const data = await r.json();

    if (data.ok) {
      return res.status(200).json({
        success: true,
        message: `Webhook configurado: ${webhookUrl}`,
        instruction: 'El bot ahora responde mensajes. Escríbele /start en Telegram.'
      });
    } else {
      return res.status(500).json({ error: data.description });
    }
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
