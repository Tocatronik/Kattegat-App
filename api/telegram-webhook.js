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
const fmtTime = (d) => d ? new Date(d).toLocaleTimeString('es-MX', { hour:'2-digit', minute:'2-digit' }) : 'N/A';
const parseNum = (s) => { const n = parseFloat(String(s).replace(/[^\d.-]/g, '')); return isNaN(n) ? null : n; };

// ─── Auth & Role Helpers ───
async function getUserRole(userId) {
  if (!userId) return null;
  const users = await query('bot_usuarios', `telegram_user_id=eq.${userId}&activo=eq.true`);
  return users?.[0]?.rol || null;
}

async function getMaquinaDefault() {
  const m = await query('maquinas', 'codigo=eq.PINTA-1&limit=1');
  return m?.[0] || null;
}

async function logDiario({ autorId, autorNombre, tipo, payload = {}, turnoId = null, otId = null }) {
  return await insert('diario_planta', {
    autor_telegram_id: autorId,
    autor_nombre: autorNombre,
    tipo,
    payload,
    turno_id: turnoId,
    ot_id: otId
  });
}

async function getTurnoActivo(operadorId) {
  if (!operadorId) return null;
  const turnos = await query('turnos',
    `operador_telegram_id=eq.${operadorId}&estado=in.(iniciado,calentando,trabajando,pausado)&order=created_at.desc&limit=1`);
  return turnos?.[0] || null;
}

// ─── /whoami — Identifica al usuario (funciona para cualquiera) ───
async function handleWhoami(userId, userName, chatId, chatType) {
  const role = await getUserRole(userId);
  const roleText = role
    ? (role === 'admin' ? '👑 *admin*' : '🛠 *operador*')
    : '⚠️ _no autorizado_';

  let text = `🆔 *Tu info:*\n\n`;
  text += `👤 Nombre: *${userName}*\n`;
  text += `🔢 User ID: \`${userId}\`\n`;
  text += `💬 Chat: \`${chatId}\` _(${chatType})_\n`;
  text += `🛡 Rol: ${roleText}\n`;

  if (!role) {
    text += `\n📩 Para autorizarte, Nando debe correr en Supabase:\n`;
    text += `\`INSERT INTO bot_usuarios (telegram_user_id, nombre, rol) VALUES (${userId}, '${userName}', 'operador');\``;
  }
  return { text };
}

// ═══════════════════════════════════════════════════════════════════
// OPERADOR — Comandos de captura de producción (Gerardo)
// ═══════════════════════════════════════════════════════════════════

// /prende — Operador prende la máquina (calentando)
async function handlePrende(userId, userName) {
  const existing = await getTurnoActivo(userId);
  if (existing && existing.hora_prendida) {
    return { text: `⚠️ Ya hay un turno activo desde las ${fmtTime(existing.hora_prendida)}.\nSi quieres reiniciar, primero cierra con /apaga.` };
  }

  const maquina = await getMaquinaDefault();
  const now = new Date().toISOString();

  let turno;
  if (existing) {
    turno = await update('turnos', existing.id, { hora_prendida: now, estado: 'calentando' });
    turno = Array.isArray(turno) ? turno[0] : turno;
  } else {
    const ins = await insert('turnos', {
      maquina_id: maquina?.id,
      operador_telegram_id: userId,
      operador_nombre: userName,
      hora_prendida: now,
      estado: 'calentando'
    });
    turno = Array.isArray(ins) ? ins[0] : ins;
  }

  await logDiario({ autorId: userId, autorNombre: userName, tipo: 'prende', payload: { hora: now }, turnoId: turno?.id });

  return {
    text: `🔥 *Máquina prendida — ${fmtTime(now)}*\n\nCalentando ${maquina?.nombre || 'Pintadora'}.\nCuando esté lista, dame los parámetros del trabajo:\n\n\`/trabajo OT-XXXX\`\n\nEj: \`/trabajo OT-1234 Navigator 70 PE15 950\``
  };
}

// /trabajo OT-XXXX [marca] [gramaje] [PE espesor] [ancho mm] — define qué se va a correr
async function handleTrabajo(userId, userName, args) {
  if (!args) {
    return { text: `📋 *Cargar trabajo*\n\nUso: \`/trabajo OT-XXXX MarcaPapel Gramaje PE_espesor Ancho\`\n\nEjemplo:\n\`/trabajo OT-1234 Navigator 70 15 950\`\n\n→ OT-1234, papel Navigator 70g/m², PE 15g/m², 950mm de ancho.\n\n_Si solo das el OT, después captura los demás campos en mensajes separados._` };
  }

  const turno = await getTurnoActivo(userId);
  if (!turno) {
    return { text: `❌ No hay turno activo. Primero corre /prende para encender la máquina.` };
  }

  const parts = args.split(/\s+/);
  const codigoOT = parts[0]?.toUpperCase();
  const marca = parts[1] || null;
  const gramaje = parseNum(parts[2]);
  const peEspesor = parseNum(parts[3]);
  const ancho = parseNum(parts[4]);

  // Buscar OT
  const ots = await query('ordenes_trabajo', `codigo=eq.${codigoOT}`);
  const ot = ots?.[0];
  if (!ot) {
    return { text: `❌ No encontré OT *${codigoOT}*.\nVerifica el código en /ots.` };
  }

  // Update OT con params
  const otUpdates = {};
  if (marca) otUpdates.papel_marca = marca;
  if (gramaje !== null) otUpdates.papel_gramaje = gramaje;
  if (peEspesor !== null) otUpdates.pe_espesor_g = peEspesor;
  if (ancho !== null) otUpdates.ancho_mm = ancho;
  if (ot.status === 'pendiente') otUpdates.status = 'en_proceso';

  if (Object.keys(otUpdates).length) {
    await update('ordenes_trabajo', ot.id, otUpdates);
  }

  // Update turno con la OT
  await update('turnos', turno.id, { ot_actual_id: ot.id });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'carga_trabajo',
    payload: { codigo_ot: codigoOT, marca, gramaje, pe_espesor: peEspesor, ancho },
    turnoId: turno.id, otId: ot.id
  });

  let text = `📋 *Trabajo cargado: ${codigoOT}*\n\n`;
  text += `👤 Cliente: ${ot.cliente_nombre || 'N/A'}\n`;
  if (marca) text += `📜 Papel: ${marca} ${gramaje || '?'}g\n`;
  if (peEspesor !== null) text += `🧪 PE: ${peEspesor}g\n`;
  if (ancho !== null) text += `↔️ Ancho: ${ancho}mm\n`;
  text += `\nCuando la máquina esté caliente, dale /arranca y empieza producción.`;

  return { text };
}

// /arranca — producción real empieza, aparecen botones de bobinas
async function handleArranca(userId, userName) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo. Corre /prende primero.` };
  if (!turno.ot_actual_id) return { text: `⚠️ No has cargado trabajo. Corre /trabajo OT-XXXX antes de arrancar.` };

  const now = new Date().toISOString();
  await update('turnos', turno.id, { hora_arranque: now, estado: 'trabajando' });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'arranca',
    payload: { hora: now }, turnoId: turno.id, otId: turno.ot_actual_id
  });

  return {
    text: `▶️ *Producción arrancó — ${fmtTime(now)}*\n\nA partir de ahora, cada bobina que salga:\n\n\`/bobina 5000\`\n\n_(donde 5000 = metros lineales)_\n\nO /pausa, /apaga, /cierra cuando aplique.`
  };
}

// /bobina <metros> — log bobina hija con metros lineales
async function handleBobina(userId, userName, args) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };
  if (turno.estado !== 'trabajando') return { text: `⚠️ El turno está en estado *${turno.estado}*. Para registrar bobina, debe estar en *trabajando* (corre /reanuda si está pausado).` };

  const metros = parseNum(args);
  if (metros === null || metros <= 0) {
    return { text: `❌ Pásame los metros lineales:\n\n\`/bobina 5000\`` };
  }

  // Cuántas bobinas lleva este turno
  const bobinasPrev = await query('bobinas_pt', `turno_id=eq.${turno.id}&order=fecha_produccion.desc`);
  const numero = (bobinasPrev?.length || 0) + 1;

  // Calcular peso estimado (metros × ancho_mm × (papel + PE) ÷ 1e6)
  let pesoEstimado = null;
  if (turno.ot_actual_id) {
    const ots = await query('ordenes_trabajo', `id=eq.${turno.ot_actual_id}`);
    const ot = ots?.[0];
    if (ot && ot.ancho_mm && (ot.papel_gramaje || ot.pe_espesor_g)) {
      const gramajeTotal = (parseFloat(ot.papel_gramaje) || 0) + (parseFloat(ot.pe_espesor_g) || 0);
      pesoEstimado = (metros * (parseFloat(ot.ancho_mm) || 0) * gramajeTotal) / 1e6;
    }
  }

  const codigo = `B-${turno.id.slice(0, 4).toUpperCase()}-${String(numero).padStart(3, '0')}`;
  const now = new Date().toISOString();

  const ins = await insert('bobinas_pt', {
    codigo,
    ot_id: turno.ot_actual_id,
    turno_id: turno.id,
    metros_lineales: metros,
    peso_kg: pesoEstimado ? +pesoEstimado.toFixed(2) : null,
    fecha_produccion: now,
    status: 'disponible'
  });
  const bobina = Array.isArray(ins) ? ins[0] : ins;

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'bobina',
    payload: { numero, codigo, metros, peso_kg: pesoEstimado },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  let text = `✅ *Bobina ${numero} registrada — ${fmtTime(now)}*\n\n`;
  text += `📦 ${codigo}\n`;
  text += `📏 ${metros.toLocaleString('es-MX')} metros\n`;
  if (pesoEstimado) text += `⚖️ ~${pesoEstimado.toFixed(1)} kg (estimado)\n`;
  text += `\nTotal turno: ${numero} bobinas. Sigue así. 💪`;

  return { text };
}

// /temps z1 z2 z3 ... — captura lectura de temperaturas (separadas por espacio)
async function handleTemps(userId, userName, args) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };

  const maquina = turno.maquina_id ? (await query('maquinas', `id=eq.${turno.maquina_id}`))?.[0] : await getMaquinaDefault();
  const zonasGrupos = maquina?.zonas_temps || [];
  const todasLasZonas = zonasGrupos.flatMap(g => (g.zonas || []).map(z => `${g.grupo} ${z}`));
  const totalZonas = todasLasZonas.length;

  if (!args) {
    let text = `🌡 *Captura de temperaturas — ${maquina?.nombre || 'Pintadora'}*\n\n`;
    text += `Manda los ${totalZonas} valores separados por espacio en este orden:\n\n`;
    text += '```\n' + todasLasZonas.map((z, i) => `${i+1}. ${z}`).join('\n') + '\n```\n';
    text += `\nEjemplo: \`/temps 285 290 295 300 ${'... '.repeat(Math.min(3, totalZonas-4))}\``;
    return { text };
  }

  const valores = args.split(/\s+/).map(parseNum).filter(n => n !== null);
  if (valores.length !== totalZonas) {
    return { text: `❌ Esperaba ${totalZonas} valores, recibí ${valores.length}.\n\nCorre /temps sin args para ver el orden esperado.` };
  }

  const lecturas = {};
  todasLasZonas.forEach((z, i) => { lecturas[z] = valores[i]; });
  const promedio = valores.reduce((s, v) => s + v, 0) / valores.length;

  await insert('temperaturas', {
    turno_id: turno.id,
    maquina_id: maquina?.id,
    lecturas,
    promedio: +promedio.toFixed(2),
    autor_telegram_id: userId
  });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'temps',
    payload: { lecturas, promedio: +promedio.toFixed(2) },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  // Min/max para reporte rápido
  const min = Math.min(...valores), max = Math.max(...valores);
  return {
    text: `🌡 *Temps registradas — ${fmtTime(new Date())}*\n\n` +
          `Promedio: *${promedio.toFixed(1)}°C*\nRango: ${min}°C – ${max}°C\n\n` +
          `Cañón: ${zonasGrupos.find(g=>g.grupo==='Cañón')?.zonas.map(z=>lecturas[`Cañón ${z}`]).join('/')||'-'}\n` +
          `Dado: ${zonasGrupos.find(g=>g.grupo==='Dado')?.zonas.map(z=>lecturas[`Dado ${z}`]).join('/')||'-'}`
  };
}

// /pausa razón — pausar producción
async function handlePausa(userId, userName, args) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };
  if (turno.estado !== 'trabajando') return { text: `⚠️ El turno no está en producción (estado actual: ${turno.estado}).` };

  await update('turnos', turno.id, { estado: 'pausado', pausa_razon: args || 'sin razón especificada' });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'pausa',
    payload: { razon: args || null, hora: new Date().toISOString() },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  return { text: `⏸ *Producción pausada — ${fmtTime(new Date())}*\nRazón: ${args || '_sin especificar_'}\n\nCuando reanudes: \`/reanuda\`` };
}

async function handleReanuda(userId, userName) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };
  if (turno.estado !== 'pausado') return { text: `⚠️ El turno no está pausado (estado: ${turno.estado}).` };

  await update('turnos', turno.id, { estado: 'trabajando', pausa_razon: null });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'reanuda',
    payload: { hora: new Date().toISOString() },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  return { text: `▶️ *Producción reanudada — ${fmtTime(new Date())}*\n\nSigue registrando bobinas con \`/bobina <metros>\`.` };
}

async function handleApaga(userId, userName) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };

  const now = new Date().toISOString();
  await update('turnos', turno.id, { estado: 'apagado', hora_apagada: now });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'apaga',
    payload: { hora: now },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  return { text: `🔌 *Máquina apagada — ${fmtTime(now)}*\n\nCuando termines el trabajo (puede ser hoy o mañana), corre /cierra para guardar kg de resina y observaciones finales.` };
}

// /cierra <kg_resina> [observaciones]
async function handleCierra(userId, userName, args) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `❌ No hay turno activo.` };

  const parts = String(args || '').trim().split(/\s+/);
  const kgResina = parseNum(parts[0]);
  const observaciones = parts.slice(1).join(' ') || null;

  if (kgResina === null) {
    return { text: `📊 *Cerrar trabajo*\n\nUso: \`/cierra <kg_resina> [observaciones]\`\n\nEjemplo:\n\`/cierra 250 papel se acabó tres veces\`` };
  }

  await update('turnos', turno.id, {
    estado: 'cerrado',
    resina_kg_consumida: kgResina,
    observaciones
  });

  // Si la OT ya no se va a tocar, márcala completada
  if (turno.ot_actual_id) {
    await update('ordenes_trabajo', turno.ot_actual_id, { status: 'completada' });
  }

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'cierra',
    payload: { kg_resina: kgResina, observaciones, hora: new Date().toISOString() },
    turnoId: turno.id, otId: turno.ot_actual_id
  });

  // Sumario del turno
  const bobinas = await query('bobinas_pt', `turno_id=eq.${turno.id}`);
  const totalMetros = (bobinas || []).reduce((s, b) => s + (parseFloat(b.metros_lineales) || 0), 0);
  const totalPeso = (bobinas || []).reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);

  return {
    text: `✅ *Trabajo cerrado*\n\n📦 ${(bobinas || []).length} bobinas\n📏 ${totalMetros.toLocaleString('es-MX')} metros\n⚖️ ${totalPeso.toFixed(1)} kg producidos\n🧪 ${kgResina} kg resina consumida\n${observaciones ? `📝 ${observaciones}\n` : ''}\nGracias 💪`
  };
}

// /mio — estado del turno actual del operador
async function handleMio(userId, userName) {
  const turno = await getTurnoActivo(userId);
  if (!turno) return { text: `🤷 No tienes turno activo.\n\nCorre /prende cuando empieces a calentar la máquina.` };

  const bobinas = await query('bobinas_pt', `turno_id=eq.${turno.id}&order=fecha_produccion.desc`);
  const totalMetros = (bobinas || []).reduce((s, b) => s + (parseFloat(b.metros_lineales) || 0), 0);
  const ot = turno.ot_actual_id ? (await query('ordenes_trabajo', `id=eq.${turno.ot_actual_id}`))?.[0] : null;

  const estadoIco = { iniciado:'⚪', calentando:'🔥', trabajando:'▶️', pausado:'⏸', apagado:'🔌', cerrado:'✅' };

  let text = `📋 *Tu turno*\n\n`;
  text += `${estadoIco[turno.estado]||'⚪'} Estado: *${turno.estado}*\n`;
  if (turno.hora_prendida) text += `🔥 Prendida: ${fmtTime(turno.hora_prendida)}\n`;
  if (turno.hora_arranque) text += `▶️ Arranque: ${fmtTime(turno.hora_arranque)}\n`;
  if (ot) {
    text += `\n📋 OT: *${ot.codigo}* — ${ot.cliente_nombre || ''}\n`;
    if (ot.papel_marca) text += `📜 ${ot.papel_marca} ${ot.papel_gramaje||'?'}g\n`;
    if (ot.pe_espesor_g) text += `🧪 PE ${ot.pe_espesor_g}g\n`;
    if (ot.ancho_mm) text += `↔️ ${ot.ancho_mm}mm\n`;
  }
  text += `\n📦 Bobinas: ${(bobinas || []).length}\n`;
  text += `📏 Metros totales: ${totalMetros.toLocaleString('es-MX')}\n`;
  if (turno.estado === 'pausado' && turno.pausa_razon) text += `\n⏸ Pausa: ${turno.pausa_razon}`;

  return { text };
}

// ═══════════════════════════════════════════════════════════════════
// DIARIO — Mantenimiento, visitas, recepciones (admin + operador)
// ═══════════════════════════════════════════════════════════════════

// /manto <tipo> <descripción>
async function handleManto(userId, userName, args) {
  if (!args) {
    return { text: `🛠 *Registrar mantenimiento*\n\nUso: \`/manto <tipo> <descripción>\`\n\nTipos: carbones, filtros, calibración, limpieza, otro\n\nEj: \`/manto carbones cambio rutinario, ~2 horas\`` };
  }
  const parts = args.split(/\s+/);
  const tipo = parts[0]?.toLowerCase();
  const descripcion = parts.slice(1).join(' ');
  const maquina = await getMaquinaDefault();

  await insert('mantenimientos', {
    maquina_id: maquina?.id,
    tipo,
    descripcion,
    autor_telegram_id: userId,
    autor_nombre: userName,
    tecnico: 'interno'
  });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'manto',
    payload: { tipo_manto: tipo, descripcion }
  });

  return { text: `🛠 *Mantenimiento registrado*\n\nTipo: ${tipo}\nDesc: ${descripcion}\n\nQueda en el diario para análisis de tendencias.` };
}

// /visita victor <descripción>
async function handleVisita(userId, userName, args) {
  if (!args) {
    return { text: `👷 *Visita técnico externo*\n\nUso: \`/visita <nombre> <descripción>\`\n\nEj: \`/visita Victor revisión motor, ajuste calibración\`` };
  }
  const parts = args.split(/\s+/);
  const tecnico = parts[0]?.toLowerCase();
  const descripcion = parts.slice(1).join(' ');
  const maquina = await getMaquinaDefault();

  await insert('mantenimientos', {
    maquina_id: maquina?.id,
    tipo: 'visita_tecnico',
    descripcion,
    tecnico,
    autor_telegram_id: userId,
    autor_nombre: userName
  });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'visita',
    payload: { tecnico, descripcion }
  });

  return { text: `👷 *Visita ${tecnico} registrada*\n\n${descripcion}` };
}

// /recibe pe|papel <marca> <kg> [costo] [factura]
async function handleRecibe(userId, userName, args) {
  if (!args) {
    return { text: `📥 *Recepción de materia prima*\n\nUso:\n\`/recibe pe <marca> <kg> [costo] [factura]\`\n\`/recibe papel <marca> <kg> [costo] [factura]\`\n\nEj: \`/recibe pe Dow 1500 28000 F-2401\`` };
  }
  const parts = args.split(/\s+/);
  const tipoRaw = parts[0]?.toLowerCase();
  const tipo = tipoRaw === 'pe' || tipoRaw === 'pebd' || tipoRaw === 'pead' ? 'PE' :
               tipoRaw === 'papel' ? 'papel' :
               tipoRaw === 'tinta' ? 'tinta' : null;
  if (!tipo) return { text: `❌ Tipo desconocido: ${tipoRaw}.\nUsa: pe, papel, tinta` };

  const marca = parts[1] || null;
  const kg = parseNum(parts[2]);
  const costo = parts[3] ? parseNum(parts[3]) : null;
  const factura = parts[4] || null;

  if (kg === null) return { text: `❌ Pásame los kg.\nEj: \`/recibe ${tipo} ${marca||'Marca'} 1500\`` };

  const ins = await insert('recepciones_mp', {
    tipo, marca, kg, costo, factura_num: factura,
    autor_telegram_id: userId, autor_nombre: userName,
    status: 'pendiente'
  });

  await logDiario({
    autorId: userId, autorNombre: userName, tipo: 'recepcion',
    payload: { tipo, marca, kg, costo, factura }
  });

  return {
    text: `📥 *Recepción registrada*\n\n📦 ${tipo}: ${marca || '?'}\n⚖️ ${kg.toLocaleString('es-MX')} kg\n${costo ? `💰 ${fmtMoney(costo)}\n` : ''}${factura ? `🧾 ${factura}\n` : ''}\n_Status:_ pendiente de dar de alta en inventario.\nNando: revisa /alertas o entra al PWA para hacer el alta formal.`
  };
}

// ─── Command Handlers ───
const COMMANDS = {
  '/start': (chatId) => ({
    text: `🏭 *Kattegat ERP Bot v2.1*

Identifícate primero corriendo /whoami para ver tu rol.

🛠 *Operador (planta)*
/prende — máquina prendida
/trabajo OT-XXXX MarcaPapel Gramaje PE Ancho — cargar trabajo
/arranca — producción inicia
/bobina <metros> — registrar bobina hija
/temps z1 z2 ... — captura lectura de temperaturas
/pausa <razón> — pausar
/reanuda — continuar
/apaga — fin de turno
/cierra <kg_resina> [obs] — cerrar trabajo
/mio — estado del turno actual

📒 *Diario (operador y admin)*
/manto <tipo> <desc> — mantenimiento
/visita <técnico> <desc> — visita externa
/recibe pe|papel <marca> <kg> [costo] [factura] — recepción MP

👑 *Admin*
/ots /inventario /alertas /clientes /facturas /produccion /reporte /po /pos /cotizar /proveedores /fichas /cobrar /aprobar /chatid

🤖 También puedes escribirme en lenguaje natural (admin).`,
    reply_markup: {
      inline_keyboard: [
        [{ text: '📋 OTs', callback_data: 'cmd_ots' }, { text: '📦 Inventario', callback_data: 'cmd_inventario' }],
        [{ text: '🛒 Nueva PO', callback_data: 'cmd_po_new' }, { text: '📊 Reporte', callback_data: 'cmd_reporte' }],
      ]
    }
  }),

  '/help': () => ({
    text: `📖 *Comandos Kattegat Bot*

🛠 *Operador:* /prende /trabajo /arranca /bobina /temps /pausa /reanuda /apaga /cierra /mio
📒 *Diario:* /manto /visita /recibe
👑 *Admin:* /ots /inventario /alertas /clientes /facturas /produccion /reporte /po /pos /cotizar /proveedores /fichas /cobrar /aprobar
ℹ️ *Info:* /whoami /chatid /help

Tip: si eres admin, también puedes escribirme en lenguaje natural.
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
    const chatType = msg.chat.type || 'private'; // 'private' | 'group' | 'supergroup'
    const userId = msg.from?.id;
    const userName = msg.from?.first_name || msg.from?.username || 'Anónimo';
    const text = msg.text.trim();
    const t = text.toLowerCase();

    // Parse command and arguments
    const [cmd, ...argParts] = t.split(/\s+/);
    const args = argParts.join(' ');
    const argsOriginal = text.split(/\s+/).slice(1).join(' ');

    // Check role (null = no autorizado)
    const role = await getUserRole(userId);
    const isAdmin = role === 'admin';
    const isOperador = role === 'operador';

    let result;

    // ─── Universales (cualquier persona) ───
    if (cmd === '/whoami' || cmd === '/quiensoy') {
      result = await handleWhoami(userId, userName, chatId, chatType);
    }
    // Si no está autorizado, solo /start y /help responden
    else if (!role && (cmd === '/start' || cmd === '/help')) {
      result = COMMANDS[cmd](chatId);
    }
    else if (!role) {
      result = { text: `⚠️ No estás autorizado para usar este bot.\n\nCorre /whoami para ver tu ID y pídele a Nando que te agregue.` };
    }
    // ─── Comandos del operador (operador y admin) ───
    else if (cmd === '/prende') result = await handlePrende(userId, userName);
    else if (cmd === '/trabajo') result = await handleTrabajo(userId, userName, argsOriginal);
    else if (cmd === '/arranca') result = await handleArranca(userId, userName);
    else if (cmd === '/bobina') result = await handleBobina(userId, userName, args);
    else if (cmd === '/temps') result = await handleTemps(userId, userName, args);
    else if (cmd === '/pausa') result = await handlePausa(userId, userName, argsOriginal);
    else if (cmd === '/reanuda') result = await handleReanuda(userId, userName);
    else if (cmd === '/apaga') result = await handleApaga(userId, userName);
    else if (cmd === '/cierra') result = await handleCierra(userId, userName, argsOriginal);
    else if (cmd === '/mio') result = await handleMio(userId, userName);
    // ─── Diario (operador y admin) ───
    else if (cmd === '/manto') result = await handleManto(userId, userName, argsOriginal);
    else if (cmd === '/visita') result = await handleVisita(userId, userName, argsOriginal);
    else if (cmd === '/recibe') result = await handleRecibe(userId, userName, argsOriginal);
    // ─── Comandos admin (solo Nando) ───
    else if (!isAdmin) {
      result = { text: `🛠 Como operador solo tienes acceso a:\n\n*Producción:* /prende /trabajo /arranca /bobina /temps /pausa /reanuda /apaga /cierra /mio\n*Diario:* /manto /visita /recibe\n*Info:* /whoami /help` };
    }
    else if (COMMANDS[cmd]) {
      result = typeof COMMANDS[cmd] === 'function' ? COMMANDS[cmd](chatId) : COMMANDS[cmd];
    }
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
    // Natural language → Claude AI (solo admin)
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
