// Vercel Serverless Function: Get chat_id from bot updates
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(500).json({ error: 'TELEGRAM_BOT_TOKEN not set' });

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const data = await tgRes.json();
    if (!data.ok) return res.status(500).json({ error: data.description });

    const chats = (data.result || [])
      .filter(u => u.message?.chat)
      .map(u => ({
        chat_id: u.message.chat.id,
        name: u.message.chat.first_name || u.message.chat.title || 'Unknown',
        username: u.message.chat.username || '',
        text: u.message.text || '',
      }));

    // Remove duplicates by chat_id
    const unique = [...new Map(chats.map(c => [c.chat_id, c])).values()];

    return res.status(200).json({
      instruction: 'Copy your chat_id and add it as TELEGRAM_CHAT_ID env var in Vercel',
      chats: unique,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
