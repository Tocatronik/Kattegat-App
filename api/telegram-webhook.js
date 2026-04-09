// ═══════════════════════════════════════════════════════════════════
// KATTEGAT INDUSTRIES — Telegram Bot Pro v2.0
// Full 2-way business bot: POs, quotes, approvals, alerts, reports
// ═══════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://exfxohmvyekfoqlczqzm.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

// ─── Supabase Helpers ───
async function query(table, params = '') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }
  });
  return r.json();
}

async function insert(table, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  return r.json();
}

async function update(table, id, data) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${id}`, {
    method: 'PATCH',
    headers: {
      'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json', 'Prefer': 'return=representation'
    },
    body: JSON.stringify(data)
  });
  return r.json();
}

// ─── Telegram Helpers ───
async function sendMessage(token, chatId, text, options = {}) {
  const body = { chat_id: chatId, text, parse_mode: 'Markdown', ...options };
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function answerCallback(token, callbackId, text = '') {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackId, text })
  });
}

// ─── Business Context for AI ───
async function getBusinessContext() {
  const [ots, clientes, bobinas, resinas, papeles, facturas, gastos, proveedores, pos] = await Promise.all([
    query('ordenes_trabajo', 'order=fecha_creacion.desc&limit=30'),
    query('clientes', 'order=created_at.desc'),
    query('bobinas_pt', 'order=fecha_produccion.desc&limit=50'),
    query('resinas', 'order=fecha_entrada.desc'),
    query('papel_bobinas', 'order=fecha_entrada.desc'),
    query('facturas', 'order=fecha_emision.desc&limit=20'),
    query('gastos', 'order=fecha.desc&limit=20'),
    query('proveedores', 'order=created_at.desc'),
    query('ordenes_compra', 'order=created_at.desc&limit=20').catch(() => []),
  ]);

  const otsActivas = (ots || []).filter(o => o.status === 'en_proceso').length;
  const otsPend = (ots || []).filter(o => o.status === 'pendiente').length;
  const totalKg = (bobinas || []).reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);

  return [
    `OTs: ${otsActivas} activas, ${otsPend} pendientes (total ${(ots||[]).length})`,
    `OTs detalle: ${(ots||[]).slice(0,10).map(o => `${o.codigo} ${o.cliente_nombre} [${o.status}]`).join('; ')}`,
    `Clientes CRM: ${(clientes||[]).map(c => `${c.nombre} (${c.etapa}, ${c.tons_potenciales||0}t)`).join('; ')}`,
    `Bobinas: ${(bobinas||[]).length}, peso total: ${totalKg.toFixed(0)}kg`,
    `Resinas: ${(resinas||[]).map(r => `${r.nombre}: ${r.stock_kg}kg @$${r.precio_kg}`).join('; ')}`,
    `Papeles: ${(papeles||[]).map(p => `${p.nombre}: ${p.stock_kg}kg @$${p.precio_kg}`).join('; ')}`,
    `Facturas: ${(facturas||[]).slice(0,10).map(f => `${f.numero||'s/n'} ${f.cliente} $${f.monto} [${f.status}]`).join('; ')}`,
    `Proveedores: ${(proveedores||[]).map(p => `${p.nombre}`).join(', ')}`,
    `POs: ${(pos||[]).slice(0,10).map(p => `${p.codigo} ${p.cliente_nombre} [${p.status}] $${p.total||0}`).join('; ')}`,
  ].join('\n');
}

// ─── Claude AI ───
async function askClaude(message, context) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return 'AI no configurado.';

  const systemPrompt = `Eres Kattegat AI, asistente de Kattegat Industries (extrusión/laminación PE, México).
Respondes via Telegram. Sé conciso pero completo. Usa emojis.
Puedes ayudar con: cotizaciones, análisis de producción, costos, clientes, reportes.
Si te piden crear una PO o cotización, guía al usuario paso a paso.
Si te piden un reporte, genera un resumen ejecutivo con los datos disponibles.
Datos del negocio:\n${context}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 1024, system: systemPrompt, messages: [{ role: 'user', content: message }] })
    });
    const data = await r.json();
    return data.content?.[0]?.text || 'Sin respuesta';
  } catch { return 'Error conectando con AI'; }
}

// ─── Format Helpers ───
const fmtMoney = (n) => `$${(parseFloat(n)||0).toLocaleString('es-MX', {minimumFractionDigits:2, maximumFractionDigits:2})}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day:'2-digit', month:'short', year:'2-digit' }) : 'N/A';

// ─── Command Handlers ───
const COMMANDS = {
  '/start': (chatId) => ({
    text: `🏭 *Kattegat ERP Bot v2.0*

Soy tu asistente completo de negocio. Comandos:

📋 *Producción*
/ots — OTs activas y pendientes
/produccion — Resumen de planta
/status OT-XXX — Detalle de una OT
/aprobar OT-XXX — Aprobar OT pendiente

📦 *Inventario*
/inventario — Stock resinas/papel
/alertas — Inventario bajo

🛒 *Compras & Ventas*
/po — Crear orden de compra
/pos — POs activas
/cotizar — Cotización rápida
/clientes — Pipeline CRM
/facturas — Facturas recientes
/cobrar FAC-XXX — Marcar pagada

🏢 *Admin*
/proveedores — Lista proveedores
/fichas — Fichas técnicas
/reporte — Reporte ejecutivo
/chatid — Ver ID de este chat

🤖 O pregúntame lo que quieras en lenguaje natural.`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 OTs', callback_data: 'cmd_ots' }, { text: '📦 Inventario', callback_data: 'cmd_inventario' }],
        [{ text: '🛒 Nueva PO', callback_data: 'cmd_po_new' }, { text: '📊 Reporte', callback_data: 'cmd_reporte' }],
      ]
    }
  }),

  '/help': () => ({
    text: `📖 *Comandos Kattegat Bot*

*Consultas:* /ots /inventario /clientes /facturas /proveedores /fichas
*Acciones:* /po /cotizar /aprobar /cobrar
*Reportes:* /reporte /produccion /alertas
*Sistema:* /chatid /help

Tip: También puedes escribirme en lenguaje natural.
Ej: "cuánto tenemos de resina PEBD?" o "genera un reporte semanal"`
  }),

  '/chatid': (chatId) => ({
    text: `🆔 *Chat ID:* \`${chatId}\`\nCopia este número y ponlo como TELEGRAM_CHAT_ID en Vercel.`
  }),
};

// ─── Data Command Handlers (async) ───
async function handleOts() {
  const ots = await query('ordenes_trabajo', 'order=fecha_creacion.desc&limit=30');
  const activas = (ots||[]).filter(o => o.status === 'en_proceso');
  const pend = (ots||[]).filter(o => o.status === 'pendiente');
  const pausadas = (ots||[]).filter(o => o.status === 'pausada');

  let text = `📋 *OTs Kattegat*\n`;
  if (activas.length) text += `\n🟢 *En proceso (${activas.length}):*\n${activas.map(o => `  ${o.codigo} — ${o.cliente_nombre} ${o.producto||''}`).join('\n')}`;
  if (pend.length) text += `\n\n🟡 *Pendientes (${pend.length}):*\n${pend.map(o => `  ${o.codigo} — ${o.cliente_nombre}`).join('\n')}`;
  if (pausadas.length) text += `\n\n🔴 *Pausadas (${pausadas.length}):*\n${pausadas.map(o => `  ${o.codigo} — ${o.cliente_nombre}`).join('\n')}`;
  if (!activas.length && !pend.length && !pausadas.length) text += '\n\nSin OTs activas.';

  const buttons = pend.slice(0, 4).map(o => [{ text: `✅ Aprobar ${o.codigo}`, callback_data: `approve_ot_${o.id}` }]);
  return { text, reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined };
}

async function handleStatus(args) {
  const codigo = args.toUpperCase();
  const ots = await query('ordenes_trabajo', `codigo=eq.${codigo}`);
  const ot = ots?.[0];
  if (!ot) return { text: `❌ No encontré OT con código *${codigo}*` };

  const bobinas = await query('bobinas_pt', `ot_id=eq.${ot.id}&order=fecha_produccion.desc`);
  const totalKg = (bobinas||[]).reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
  const totalM = (bobinas||[]).reduce((s, b) => s + (parseFloat(b.metros_lineales) || 0), 0);

  const statusIco = { en_proceso: '🟢', pendiente: '🟡', pausada: '🔴', completada: '✅' };
  return {
    text: `📋 *${ot.codigo}*\n\n${statusIco[ot.status]||'⚪'} Estado: *${ot.status}*\n👤 Cliente: ${ot.cliente_nombre}\n📦 Producto: ${ot.producto || ot.tipo || 'N/A'}\n📅 Creada: ${fmtDate(ot.fecha_creacion)}\n💳 Crédito: ${ot.dias_credito || 30} días\n\n📊 *Producción:*\n  Bobinas: ${(bobinas||[]).length}\n  Peso: ${totalKg.toFixed(1)} kg\n  Metros: ${totalM.toLocaleString('es-MX')} m`,
    reply_markup: ot.status === 'pendiente' ? {
      inline_keyboard: [[{ text: '✅ Aprobar', callback_data: `approve_ot_${ot.id}` }, { text: '🔴 Pausar', callback_data: `pause_ot_${ot.id}` }]]
    } : ot.status === 'en_proceso' ? {
      inline_keyboard: [[{ text: '✅ Completar', callback_data: `complete_ot_${ot.id}` }, { text: '🔴 Pausar', callback_data: `pause_ot_${ot.id}` }]]
    } : undefined
  };
}

async function handleApprove(args) {
  const codigo = args.toUpperCase();
  const ots = await query('ordenes_trabajo', `codigo=eq.${codigo}`);
  const ot = ots?.[0];
  if (!ot) return { text: `❌ No encontré *${codigo}*` };
  if (ot.status !== 'pendiente') return { text: `⚠️ ${codigo} no está pendiente (status: ${ot.status})` };

  await update('ordenes_trabajo', ot.id, { status: 'en_proceso' });
  return { text: `✅ *${codigo}* aprobada y en proceso.\nCliente: ${ot.cliente_nombre}\nProducto: ${ot.producto || ot.tipo}` };
}

async function handleInventario() {
  const [resinas, papeles] = await Promise.all([
    query('resinas', 'status=eq.disponible&order=tipo.asc'),
    query('papel_bobinas', 'status=eq.disponible&order=tipo.asc')
  ]);

  const totalResKg = (resinas||[]).reduce((s, r) => s + (parseFloat(r.stock_kg || r.peso_kg) || 0), 0);
  const totalPapKg = (papeles||[]).reduce((s, p) => s + (parseFloat(p.stock_kg || p.peso_kg) || 0), 0);

  let text = `📦 *Inventario Kattegat*\n\n🧪 *Resinas* (${totalResKg.toFixed(0)} kg total):\n`;
  text += (resinas||[]).map(r => `  • ${r.nombre || r.codigo}: ${r.stock_kg || r.peso_kg}kg @ ${fmtMoney(r.precio_kg || r.costo_kg)}/kg`).join('\n') || '  Sin stock';
  text += `\n\n📜 *Papeles* (${(papeles||[]).length} bobinas):\n`;
  text += (papeles||[]).map(p => `  • ${p.nombre || p.codigo}: ${p.peso_kg}kg — ${p.gramaje}g ${p.tipo} ${p.ancho_mm}mm`).join('\n') || '  Sin stock';

  return { text };
}

async function handleAlertas() {
  const [resinas, papeles, facturas] = await Promise.all([
    query('resinas', 'status=eq.disponible'),
    query('papel_bobinas', 'status=eq.disponible'),
    query('facturas', 'status=eq.pendiente&order=fecha_emision.asc')
  ]);

  let alerts = [];
  // Low stock alerts (< 100kg resin, < 5 paper rolls)
  const lowResinas = (resinas||[]).filter(r => (parseFloat(r.stock_kg || r.peso_kg) || 0) < 100);
  if (lowResinas.length) alerts.push(`🔴 *Resinas bajas:*\n${lowResinas.map(r => `  ${r.nombre||r.codigo}: ${r.stock_kg||r.peso_kg}kg`).join('\n')}`);
  if ((papeles||[]).length < 5) alerts.push(`🔴 *Papel bajo:* solo ${(papeles||[]).length} bobinas disponibles`);

  // Overdue invoices
  const now = new Date();
  const overdue = (facturas||[]).filter(f => {
    const due = new Date(f.fecha_vencimiento || f.fecha_emision);
    due.setDate(due.getDate() + 30);
    return due < now;
  });
  if (overdue.length) alerts.push(`💰 *Facturas vencidas (${overdue.length}):*\n${overdue.slice(0,5).map(f => `  ${f.numero} — ${f.cliente} ${fmtMoney(f.monto)}`).join('\n')}`);

  return { text: alerts.length ? `⚠️ *Alertas Kattegat*\n\n${alerts.join('\n\n')}` : '✅ *Sin alertas.* Todo en orden.' };
}

async function handleClientes() {
  const clientes = await query('clientes', 'order=created_at.desc');
  const byStage = {};
  (clientes||[]).forEach(c => { byStage[c.etapa] = byStage[c.etapa] || []; byStage[c.etapa].push(c); });

  const stageIcons = { lead: '🎯', contactado: '📞', cotizado: '📋', negociacion: '🤝', ganado: '✅', perdido: '❌' };
  let text = `👥 *Pipeline CRM*\n`;
  for (const [stage, cls] of Object.entries(byStage)) {
    text += `\n${stageIcons[stage]||'⚪'} *${stage}* (${cls.length}):\n`;
    text += cls.map(c => `  • ${c.nombre} ${c.tons_potenciales ? `— ${c.tons_potenciales}t` : ''}`).join('\n');
  }
  return { text };
}

async function handleFacturas() {
  const facturas = await query('facturas', 'order=fecha_emision.desc&limit=15');
  const pendientes = (facturas||[]).filter(f => f.status === 'pendiente');
  const cobradas = (facturas||[]).filter(f => f.status === 'cobrada' || f.status === 'pagada');

  let text = `💰 *Facturas*\n\n🔴 *Pendientes (${pendientes.length}):*\n`;
  text += pendientes.map(f => `  ${f.numero||'s/n'} — ${f.cliente} ${fmtMoney(f.monto)}`).join('\n') || '  Ninguna';
  text += `\n\n🟢 *Cobradas (${cobradas.length}):*\n`;
  text += cobradas.slice(0,5).map(f => `  ${f.numero||'s/n'} — ${f.cliente} ${fmtMoney(f.monto)}`).join('\n') || '  Ninguna';

  const buttons = pendientes.slice(0, 4).map(f => [{ text: `💰 Cobrar ${f.numero||f.id.slice(0,8)}`, callback_data: `cobrar_${f.id}` }]);
  return { text, reply_markup: buttons.length ? { inline_keyboard: buttons } : undefined };
}

async function handleCobrar(args) {
  const facturas = await query('facturas', `numero=eq.${args}&limit=1`);
  const f = facturas?.[0];
  if (!f) return { text: `❌ No encontré factura *${args}*` };
  if (f.status === 'cobrada' || f.status === 'pagada') return { text: `⚠️ ${args} ya está cobrada.` };

  await update('facturas', f.id, { status: 'cobrada' });
  return { text: `✅ *${args}* marcada como cobrada.\n${f.cliente} — ${fmtMoney(f.monto)}` };
}

async function handleProveedores() {
  const prov = await query('proveedores', 'order=created_at.desc');
  if (!(prov||[]).length) return { text: '🏢 Sin proveedores registrados.' };
  return {
    text: `🏢 *Proveedores*\n\n${prov.map(p =>
      `• *${p.nombre}*${p.rfc ? ` (${p.rfc})` : ''}${p.contacto ? `\n  👤 ${p.contacto}` : ''}${p.telefono ? ` 📞 ${p.telefono}` : ''}${p.correo ? ` 📧 ${p.correo}` : ''}`
    ).join('\n')}`
  };
}

async function handleFichas() {
  const cfgRes = await query('configuracion', 'clave=eq.fichas_tecnicas');
  const ft = cfgRes?.[0]?.valor;
  if (!ft) return { text: '📄 Sin fichas técnicas. Agrégalas desde la app web.' };

  const rPart = (ft.resinas||[]).map(r => `  • *${r.nombre}* ${r.tipo_polimero||''} — MFI:${r.mfi||'?'} Dens:${r.densidad||'?'}`).join('\n');
  const pPart = (ft.papeles||[]).map(p => `  • *${p.nombre}* ${p.tipo||''} ${p.gramaje||'?'}g — ${p.proveedor||''}`).join('\n');
  return { text: `📄 *Fichas Técnicas*\n\n🧪 *Resinas:*\n${rPart || '  Sin fichas'}\n\n📜 *Papeles:*\n${pPart || '  Sin fichas'}` };
}

async function handleProduccion() {
  const [ots, bobinas, resinas, papeles] = await Promise.all([
    query('ordenes_trabajo', 'order=fecha_creacion.desc&limit=50'),
    query('bobinas_pt', 'order=fecha_produccion.desc&limit=100'),
    query('resinas', 'status=eq.disponible'),
    query('papel_bobinas', 'status=eq.disponible')
  ]);

  const activas = (ots||[]).filter(o => o.status === 'en_proceso');
  const hoy = new Date().toISOString().slice(0, 10);
  const bobHoy = (bobinas||[]).filter(b => b.fecha_produccion?.startsWith(hoy));
  const kgHoy = bobHoy.reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
  const totalResKg = (resinas||[]).reduce((s, r) => s + (parseFloat(r.stock_kg || r.peso_kg) || 0), 0);

  return {
    text: `🏭 *Resumen de Planta*\n\n🟢 OTs activas: *${activas.length}*\n${activas.map(o => `  ${o.codigo} — ${o.cliente_nombre}`).join('\n') || '  Ninguna'}\n\n📊 *Producción hoy:*\n  Bobinas: ${bobHoy.length}\n  Peso: ${kgHoy.toFixed(1)} kg\n\n📦 *Inventario:*\n  Resinas: ${totalResKg.toFixed(0)} kg\n  Papeles: ${(papeles||[]).length} bobinas`
  };
}

async function handleReporte() {
  const context = await getBusinessContext();
  const report = await askClaude(
    'Genera un reporte ejecutivo breve del estado del negocio. Incluye: OTs activas, inventario, facturas pendientes, producción reciente, y cualquier alerta importante. Formato: resumen ejecutivo para el dueño.',
    context
  );
  return { text: `📊 *Reporte Ejecutivo Kattegat*\n\n${report}` };
}

// ─── PO Creation Flow ───
async function handlePO(args) {
  if (!args) {
    const clientes = await query('clientes', 'order=nombre.asc');
    const buttons = (clientes||[]).slice(0, 8).map(c => [{ text: c.nombre, callback_data: `po_client_${c.id}` }]);
    return {
      text: `🛒 *Nueva Orden de Compra*\n\nSelecciona el cliente:`,
      reply_markup: { inline_keyboard: [...buttons, [{ text: '❌ Cancelar', callback_data: 'cancel' }]] }
    };
  }
  return { text: `🛒 Para crear una PO completa, usa la app web o escríbeme:\n"Crear PO para [cliente], [producto], [cantidad kg], [precio]"` };
}

async function handlePOs() {
  const pos = await query('ordenes_compra', 'order=created_at.desc&limit=15').catch(() => []);
  if (!(pos||[]).length) return { text: '🛒 Sin órdenes de compra registradas.' };

  const statusIco = { borrador: '📝', enviada: '📤', confirmada: '✅', en_produccion: '🏭', entregada: '📦', facturada: '💰' };
  return {
    text: `🛒 *Órdenes de Compra*\n\n${(pos||[]).map(p =>
      `${statusIco[p.status]||'⚪'} *${p.codigo}* — ${p.cliente_nombre}\n  ${fmtMoney(p.total)} | ${p.status} | ${fmtDate(p.created_at)}`
    ).join('\n\n')}`
  };
}

// ─── Quick Quote ───
async function handleCotizar(args) {
  if (!args) {
    return { text: `⚖️ *Cotización Rápida*\n\nEscríbeme así:\n\`/cotizar [producto] [cantidad kg]\`\n\nEj: \`/cotizar PEBD 15g 1000\`\n\nO pregúntame en lenguaje natural:\n"Cuánto costaría laminar 2000kg de Bond 60g con PEBD 15g?"` };
  }
  const context = await getBusinessContext();
  return { text: await askClaude(`Haz una cotización rápida basada en estos datos: ${args}. Usa los precios de resinas/papeles del inventario. Calcula costo, margen sugerido (40-60%), y precio de venta. Muestra 3 escenarios de cantidad.`, context) };
}

// ─── Callback Query Handler (inline buttons) ───
async function handleCallback(token, callbackQuery) {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  let reply = '';

  try {
    if (data === 'cancel') {
      reply = '❌ Cancelado.';
    } else if (data === 'cmd_ots') {
      const result = await handleOts();
      await sendMessage(token, chatId, result.text, { reply_markup: result.reply_markup ? JSON.stringify(result.reply_markup) : undefined });
      return answerCallback(token, callbackQuery.id, 'OTs cargadas');
    } else if (data === 'cmd_inventario') {
      const result = await handleInventario();
      await sendMessage(token, chatId, result.text);
      return answerCallback(token, callbackQuery.id, 'Inventario cargado');
    } else if (data === 'cmd_po_new') {
      const result = await handlePO('');
      await sendMessage(token, chatId, result.text, { reply_markup: JSON.stringify(result.reply_markup) });
      return answerCallback(token, callbackQuery.id);
    } else if (data === 'cmd_reporte') {
      await answerCallback(token, callbackQuery.id, 'Generando reporte...');
      const result = await handleReporte();
      await sendMessage(token, chatId, result.text);
      return;
    } else if (data.startsWith('approve_ot_')) {
      const otId = data.replace('approve_ot_', '');
      await update('ordenes_trabajo', otId, { status: 'en_proceso' });
      reply = '✅ OT aprobada y en proceso.';
    } else if (data.startsWith('pause_ot_')) {
      const otId = data.replace('pause_ot_', '');
      await update('ordenes_trabajo', otId, { status: 'pausada' });
      reply = '🔴 OT pausada.';
    } else if (data.startsWith('complete_ot_')) {
      const otId = data.replace('complete_ot_', '');
      await update('ordenes_trabajo', otId, { status: 'completada' });
      reply = '✅ OT marcada como completada.';
    } else if (data.startsWith('cobrar_')) {
      const factId = data.replace('cobrar_', '');
      await update('facturas', factId, { status: 'cobrada' });
      reply = '💰 Factura marcada como cobrada.';
    } else if (data.startsWith('po_client_')) {
      const clienteId = data.replace('po_client_', '');
      const clientes = await query('clientes', `id=eq.${clienteId}`);
      const cliente = clientes?.[0];
      reply = `🛒 Cliente: *${cliente?.nombre || 'N/A'}*\n\nAhora escríbeme el detalle:\n"PO para ${cliente?.nombre}: [producto], [cantidad], [precio unitario]"\n\nO usa la app web para crear la PO completa.`;
    } else {
      reply = '⚪ Acción no reconocida.';
    }
  } catch (e) {
    reply = `❌ Error: ${e.message}`;
  }

  await sendMessage(token, chatId, reply);
  await answerCallback(token, callbackQuery.id, reply.slice(0, 50));
}

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return res.status(200).json({ ok: true });

  try {
    const update = req.body;

    // Handle inline button callbacks
    if (update.callback_query) {
      await handleCallback(token, update.callback_query);
      return res.status(200).json({ ok: true });
    }

    const msg = update.message;
    if (!msg?.text || !msg?.chat?.id) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const t = text.toLowerCase();

    // Parse command and arguments
    const [cmd, ...argParts] = t.split(/\s+/);
    const args = argParts.join(' ');
    const argsOriginal = text.split(/\s+/).slice(1).join(' ');

    let result;

    // Static commands
    if (COMMANDS[cmd]) {
      result = typeof COMMANDS[cmd] === 'function' ? COMMANDS[cmd](chatId) : COMMANDS[cmd];
    }
    // Data commands
    else if (cmd === '/ots') result = await handleOts();
    else if (cmd === '/status' && args) result = await handleStatus(argsOriginal);
    else if (cmd === '/aprobar' && args) result = await handleApprove(argsOriginal);
    else if (cmd === '/inventario') result = await handleInventario();
    else if (cmd === '/alertas') result = await handleAlertas();
    else if (cmd === '/clientes') result = await handleClientes();
    else if (cmd === '/facturas') result = await handleFacturas();
    else if (cmd === '/cobrar' && args) result = await handleCobrar(argsOriginal);
    else if (cmd === '/proveedores') result = await handleProveedores();
    else if (cmd === '/fichas') result = await handleFichas();
    else if (cmd === '/produccion') result = await handleProduccion();
    else if (cmd === '/reporte') result = await handleReporte();
    else if (cmd === '/po') result = await handlePO(args);
    else if (cmd === '/pos') result = await handlePOs();
    else if (cmd === '/cotizar') result = await handleCotizar(argsOriginal);
    // Natural language → Claude AI
    else {
      const context = await getBusinessContext();
      result = { text: await askClaude(text, context) };
    }

    // Send response
    const sendOpts = {};
    if (result.reply_markup) sendOpts.reply_markup = JSON.stringify(result.reply_markup);
    await sendMessage(token, chatId, result.text, sendOpts);

  } catch (e) {
    console.error('Webhook error:', e);
  }

  return res.status(200).json({ ok: true });
}
