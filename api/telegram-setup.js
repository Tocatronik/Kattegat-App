// Vercel Serverless Function: Get chat_id (works even with webhook active)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

  try {
    // 1. Remove webhook temporarily
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook`);

    // 2. Get updates
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await tgRes.json();

    // 3. Re-set webhook
    const host = req.headers.host || 'kattegat-app.vercel.app';
    await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: `https://${host}/api/telegram-webhook` })
    });

    if (!data.ok) return res.status(500).json({ error: data.description });

    const chats = (data.result || [])
      .filter(u => u.message?.chat)
      .map(u => ({
        chat_id: u.message.chat.id,
        type: u.message.chat.type,
        name: u.message.chat.first_name || u.message.chat.title || 'Unknown',
        username: u.message.chat.username || '',
      }));

    const unique = [...new Map(chats.map(c => [c.chat_id, c])).values()];

    return res.status(200).json({
      instruction: 'Copy the chat_id (use the GROUP one if you want notifications in a group)',
      chats: unique,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
