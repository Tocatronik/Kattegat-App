// Telegram 2-way webhook: receive messages, query business data, respond
const SUPABASE_URL = 'https://exfxohmvyekfoqlczqzm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI';

async function querySupabase(table, params = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return r.json();
}

async function getBusinessContext() {
  const [ots, clientes, bobinas, resinas, papeles, facturas, gastos, proveedores] = await Promise.all([
    querySupabase('ordenes_trabajo', 'order=fecha_creacion.desc&limit=30'),
    querySupabase('clientes', 'order=created_at.desc'),
    querySupabase('bobinas_pt', 'order=fecha_produccion.desc&limit=50'),
    querySupabase('resinas', 'order=fecha_entrada.desc'),
    querySupabase('papel_bobinas', 'order=fecha_entrada.desc'),
    querySupabase('facturas', 'order=fecha_emision.desc&limit=20'),
    querySupabase('gastos', 'order=fecha.desc&limit=20'),
    querySupabase('proveedores', 'order=created_at.desc'),
  ]);

  const otsActivas = (ots || []).filter(o => o.status === 'en_proceso').length;
  const otsPend = (ots || []).filter(o => o.status === 'pendiente').length;
  const otsComp = (ots || []).filter(o => o.status === 'completada').length;
  const totalKg = (bobinas || []).reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);

  return [
    `OTs: ${otsActivas} activas, ${otsPend} pendientes, ${otsComp} completadas (total ${(ots||[]).length})`,
    `OTs detalle: ${(ots||[]).slice(0,15).map(o => `${o.codigo} ${o.cliente_nombre} [${o.status}] ${o.producto||o.tipo||''}`).join('; ')}`,
    `Clientes CRM: ${(clientes||[]).map(c => `${c.nombre} (${c.etapa}, ${c.tons_potenciales||0}t pot.)`).join('; ')}`,
    `Bobinas producidas: ${(bobinas||[]).length}, peso total: ${totalKg.toFixed(0)}kg`,
    `Resinas inventario: ${(resinas||[]).map(r => `${r.nombre}: ${r.stock_kg}kg a $${r.precio_kg}/kg`).join('; ')}`,
    `Papeles inventario: ${(papeles||[]).map(p => `${p.nombre}: ${p.stock_kg}kg a $${p.precio_kg}/kg`).join('; ')}`,
    `Facturas recientes: ${(facturas||[]).slice(0,10).map(f => `${f.numero||'s/n'} ${f.cliente} $${f.monto} [${f.status}]`).join('; ')}`,
    `Gastos recientes: ${(gastos||[]).slice(0,10).map(g => `${g.concepto} $${g.monto} ${g.categoria}`).join('; ')}`,
    `Proveedores: ${(proveedores||[]).map(p => `${p.nombre}${p.rfc?' ('+p.rfc+')':''}${p.contacto?' - '+p.contacto:''}`).join('; ')}`,
  ].join('\n');
}

async function askClaude(message, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'AI no configurado. Agrega ANTHROPIC_API_KEY en Vercel.';

  const systemPrompt = `Eres Kattegat AI, asistente de Kattegat Industries (extrusión/laminación PE, México).
Respondes via Telegram, sé conciso (máx 500 chars). Usa emojis para claridad.
Si te piden cotizar, da un estimado basado en los datos de resinas/papeles que tienes.
Datos del negocio:\n${context}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 512, system: systemPrompt, messages: [{ role: 'user', content: message }] })
    });
    const data = await r.json();
    return data.content?.[0]?.text || 'Sin respuesta';
  } catch { return 'Error conectando con AI'; }
}

function quickResponse(text, chatId) {
  const t = text.toLowerCase().trim();
  if (t === '/start') return `🤖 *Kattegat AI Bot*\n\nSoy tu asistente de negocio. Pregúntame:\n\n📋 /ots - OTs activas\n👥 /clientes - Lista clientes\n🏢 /proveedores - Proveedores\n📦 /inventario - Stock resinas/papel\n💰 /facturas - Facturas recientes\n🆔 /chatid - Ver ID de este chat\n\nO escríbeme cualquier pregunta sobre tu negocio.`;
  if (t === '/help') return '📖 *Comandos:*\n/ots /clientes /proveedores /inventario /facturas /chatid\n\nO pregúntame lo que quieras en lenguaje natural.';
  if (t === '/chatid') return `🆔 *Chat ID:* \`${chatId}\`\n\nCopia este número y ponlo como TELEGRAM_CHAT_ID en Vercel para recibir notificaciones aquí.`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(200).json({ ok: true });

  try {
    const update = req.body;
    const msg = update.message;
    if (!msg?.text || !msg?.chat?.id) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text;

    // Check for quick commands first
    let reply = quickResponse(text, chatId);

    if (!reply) {
      // Query business data and ask Claude
      const context = await getBusinessContext();

      // Handle quick commands with data
      const t = text.toLowerCase().trim();
      if (t === '/ots') {
        const ots = await querySupabase('ordenes_trabajo', 'order=fecha_creacion.desc&limit=20');
        const activas = (ots||[]).filter(o=>o.status==='en_proceso');
        const pend = (ots||[]).filter(o=>o.status==='pendiente');
        reply = `📋 *OTs Kattegat*\n\n🟢 En proceso: ${activas.length}\n${activas.map(o=>`  • ${o.codigo} - ${o.cliente_nombre}`).join('\n')}\n\n🟡 Pendientes: ${pend.length}\n${pend.map(o=>`  • ${o.codigo} - ${o.cliente_nombre}`).join('\n')}`;
      } else if (t === '/clientes') {
        const cl = await querySupabase('clientes', 'order=created_at.desc');
        reply = `👥 *Clientes CRM*\n\n${(cl||[]).map(c=>`• ${c.nombre} (${c.etapa}) ${c.tons_potenciales||0}t`).join('\n')}`;
      } else if (t === '/proveedores') {
        const prov = await querySupabase('proveedores', 'order=created_at.desc');
        reply = `🏢 *Proveedores*\n\n${(prov||[]).length ? (prov||[]).map(p=>`• *${p.nombre}*${p.rfc?' ('+p.rfc+')':''}${p.contacto?'\n  👤 '+p.contacto:''}${p.telefono?' 📞 '+p.telefono:''}${p.correo?' 📧 '+p.correo:''}`).join('\n') : 'Sin proveedores registrados'}`;
      } else if (t === '/inventario') {
        const res1 = await querySupabase('resinas');
        const pap = await querySupabase('papel_bobinas');
        reply = `📦 *Inventario*\n\n🧪 Resinas:\n${(res1||[]).map(r=>`  • ${r.nombre}: ${r.stock_kg}kg @ $${r.precio_kg}`).join('\n')}\n\n📜 Papeles:\n${(pap||[]).map(p=>`  • ${p.nombre}: ${p.stock_kg}kg @ $${p.precio_kg}`).join('\n')}`;
      } else if (t === '/facturas') {
        const f = await querySupabase('facturas', 'order=fecha_emision.desc&limit=10');
        reply = `💰 *Facturas*\n\n${(f||[]).map(f=>`• ${f.numero||'s/n'} ${f.cliente} $${f.monto} [${f.status}]`).join('\n')}`;
      } else {
        // Natural language query - use Claude
        reply = await askClaude(text, context);
      }
    }

    // Send response via Telegram
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: reply, parse_mode: 'Markdown' })
    });

  } catch (e) {
    console.error('Webhook error:', e);
  }

  return res.status(200).json({ ok: true });
}
