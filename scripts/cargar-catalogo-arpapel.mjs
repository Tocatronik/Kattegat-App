// Carga catálogo de productos Arpapel + historial de facturas al ERP
// Ejecutar: node scripts/cargar-catalogo-arpapel.mjs

const h = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
const u = 'https://exfxohmvyekfoqlczqzm.supabase.co/rest/v1';

// ═══ CATÁLOGO DE PRODUCTOS ARPAPEL ═══
const productos = [
  { clave: 'AP0032', nombre: 'Tela Coextruida Blanca 80GR', tipo_polimero: 'PEBD', papel_g: 62, pe_g: 18, gramaje_total: 80, precio_m2: 4.15 },
  { clave: 'AP0033', nombre: 'Coextruido BOND 70GR+PE 10GR 80GR', tipo_polimero: 'PE', papel_g: 70, pe_g: 10, gramaje_total: 80, precio_m2: 3.70 },
  { clave: 'AP0034', nombre: 'Coextruido KRAFT 130GR+PE 14GR 144GR', tipo_polimero: 'PE', papel_g: 130, pe_g: 14, gramaje_total: 144, precio_m2: 4.20 },
  { clave: 'AP0035', nombre: 'Coextruido BOND 32.5GR+PE 15GR 47GR', tipo_polimero: 'PE', papel_g: 32.5, pe_g: 15, gramaje_total: 47, precio_m2: 2.00 },
  { clave: 'AP0038', nombre: 'Coextruido LWC 60GR+PE 18GR 78GR', tipo_polimero: 'PE', papel_g: 60, pe_g: 18, gramaje_total: 78, precio_m2: 1.40 },
  { clave: 'AP0039', nombre: 'Coextruido BOND 90GR+PEBD 15GR 105GR', tipo_polimero: 'PEBD', papel_g: 90, pe_g: 15, gramaje_total: 105, precio_m2: 5.50 },
];

// ═══ HISTORIAL DE FACTURAS ═══
const facturas = [
  { fecha: '2025-01-16', numero: '90', po: 'PO59493', clave: 'AP0035', m2: 13064, pu: 2.00, status: 'pagada' },
  { fecha: '2025-01-16', numero: '91', po: 'PO59494', clave: 'AP0035', m2: 59984, pu: 2.00, status: 'pagada' },
  { fecha: '2025-01-22', numero: '92', po: 'PO59363', clave: 'AP0035', m2: 30400, pu: 2.00, status: 'pagada' },
  { fecha: '2025-01-22', numero: '93', po: 'PO59583', clave: 'AP0033', m2: 38308, pu: 3.70, status: 'pagada' },
  { fecha: '2025-02-25', numero: '95', po: 'PO60181', clave: 'AP0033', m2: 41572.5, pu: 3.70, status: 'pagada' },
  { fecha: '2025-04-21', numero: '96', po: 'PO60899', clave: 'AP0033', m2: 27600, pu: 3.70, status: 'pagada' },
  { fecha: '2025-04-21', numero: '97', po: 'PO61175', clave: 'AP0033', m2: 39330, pu: 3.70, status: 'pagada' },
  { fecha: '2025-05-16', numero: '98', po: 'PO61873', clave: 'AP0032', m2: 19730.7, pu: 4.15, status: 'pagada' },
  { fecha: '2025-06-19', numero: '100', po: 'PO62588', clave: 'AP0033', m2: 69632.5, pu: 3.70, status: 'pagada' },
  { fecha: '2025-06-05', numero: '101', po: 'PO62294', clave: 'AP0038', m2: 61300, pu: 1.40, status: 'pagada' },
  { fecha: '2025-06-05', numero: '102', po: 'PO62295', clave: 'AP0035', m2: 70300, pu: 2.00, status: 'pagada' },
  { fecha: '2025-07-08', numero: '103', po: 'PO62954', clave: 'AP0039', m2: 89100, pu: 5.50, status: 'pagada' },
  { fecha: '2025-07-22', numero: '104', po: 'PO63188', clave: 'AP0035', m2: 85690, pu: 2.00, status: 'pagada' },
  { fecha: '2025-08-15', numero: '106', po: 'PO63645', clave: 'AP0034', m2: 5310, pu: 4.20, status: 'pagada' },
  { fecha: '2025-08-27', numero: '108', po: 'PO63889', clave: 'AP0033', m2: 68022.5, pu: 3.70, status: 'pagada' },
  { fecha: '2025-09-01', numero: '109', po: 'PO63934', clave: 'AP0035', m2: 57190, pu: 2.00, status: 'pagada' },
  { fecha: '2025-09-10', numero: '110', po: 'PO64084', clave: 'AP0033', m2: 86480, pu: 3.70, status: 'pagada' },
  { fecha: '2025-09-19', numero: '111', po: 'PO64218', clave: 'AP0034', m2: 14900, pu: 4.20, status: 'pagada' },
  { fecha: '2025-10-10', numero: '112', po: 'PO64528', clave: 'AP0034', m2: 39159, pu: 4.20, status: 'pagada' },
  { fecha: '2025-10-10', numero: '113', po: 'PO64529', clave: 'AP0033', m2: 46400, pu: 3.70, status: 'pagada' },
  { fecha: '2025-10-16', numero: '114', po: 'PO64624', clave: 'AP0035', m2: 28405, pu: 2.00, status: 'pagada' },
  { fecha: '2025-10-27', numero: '115', po: 'PO64808', clave: 'AP0035', m2: 90060, pu: 2.00, status: 'pagada' },
  { fecha: '2025-10-27', numero: '116', po: 'PO64809', clave: 'AP0033', m2: 45655, pu: 3.70, status: 'pagada' },
  { fecha: '2025-10-27', numero: '117', po: 'PO64832', clave: 'AP0035', m2: 28500, pu: 2.00, status: 'pagada' },
  { fecha: '2025-10-31', numero: '118', po: 'PO64934', clave: 'AP0035', m2: 28215, pu: 2.00, status: 'pagada' },
  { fecha: '2025-10-31', numero: '119', po: 'PO64935', clave: 'AP0035', m2: 9500, pu: 2.00, status: 'pagada' },
  { fecha: '2025-10-31', numero: '120', po: 'PO64936', clave: 'AP0035', m2: 28025, pu: 2.00, status: 'pagada' },
  { fecha: '2025-11-07', numero: '121', po: 'PO65011', clave: 'AP0035', m2: 28025, pu: 2.00, status: 'pagada' },
  { fecha: '2025-11-07', numero: '122', po: 'PO65059', clave: 'AP0035', m2: 28120, pu: 2.00, status: 'pagada' },
  { fecha: '2025-11-20', numero: '125', po: 'PO65152', clave: 'AP0033', m2: 36684.5, pu: 3.70, status: 'pagada' },
  { fecha: '2025-11-20', numero: '126', po: 'PO65309', clave: 'AP0035', m2: 51585, pu: 2.00, status: 'pagada' },
  { fecha: '2025-11-28', numero: '127', po: 'PO65456', clave: 'AP0035', m2: 31397.5, pu: 2.00, status: 'pagada' },
  { fecha: '2025-12-05', numero: '129', po: 'PO65669', clave: 'AP0035', m2: 50302.5, pu: 2.00, status: 'pagada' },
  { fecha: '2025-12-05', numero: '130', po: 'PO65662', clave: 'AP0033', m2: 130352.5, pu: 3.70, status: 'aprobada' },
  { fecha: '2026-01-12', numero: '131', po: 'PO66064', clave: 'AP0034', m2: 38619, pu: 4.20, status: 'pendiente' },
];

async function main() {
  // 1. Get client ID
  console.log('🔍 Buscando cliente Arpapel...');
  let r = await fetch(`${u}/clientes?nombre=ilike.*arpapel*&select=id,nombre`, { headers: h });
  let cl = await r.json();
  const clienteId = cl[0]?.id;
  if (!clienteId) { console.log('❌ Cliente Arpapel no encontrado. Corre registrar-odc.mjs primero.'); return; }
  console.log(`✅ Arpapel ID: ${clienteId}`);

  // 2. Load product catalog into fichas_resinas (reusing as product catalog)
  // Actually, let's use actividades to log the catalog and facturas to store invoices

  // 3. Load facturas
  console.log('\n📄 Cargando historial de facturas...');
  let loaded = 0;
  let skipped = 0;

  // Check existing facturas
  r = await fetch(`${u}/facturas?select=numero_factura&cliente=eq.Arpapel`, { headers: h });
  const existing = await r.json();
  const existingNums = new Set((existing || []).map(f => f.numero_factura));

  for (const f of facturas) {
    if (existingNums.has(f.numero)) { skipped++; continue; }

    const subtotal = f.m2 * f.pu;
    const total = subtotal * 1.16;
    const prod = productos.find(p => p.clave === f.clave);

    const body = {
      numero_factura: f.numero,
      cliente: 'Arpapel',
      concepto: `${prod?.nombre || f.clave} | PO: ${f.po} | ${f.m2.toLocaleString()}M²`,
      monto: Math.round(subtotal * 100) / 100,
      fecha_emision: f.fecha,
      fecha_vencimiento: new Date(new Date(f.fecha).getTime() + 30 * 86400000).toISOString().split('T')[0],
      cobrada: f.status === 'pagada',
      status: f.status === 'pagada' ? 'pagada' : 'pendiente',
    };

    r = await fetch(`${u}/facturas`, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const res = await r.json();
    if (res.code) { console.log(`  ⚠️ Factura ${f.numero}: ${res.message}`); }
    else { loaded++; }
  }
  console.log(`✅ ${loaded} facturas cargadas, ${skipped} ya existían`);

  // 4. Log catalog as activity
  const catalogText = productos.map(p =>
    `${p.clave}: ${p.nombre} — Papel ${p.papel_g}g + PE ${p.pe_g}g = ${p.gramaje_total}g/m² — $${p.precio_m2}/M²`
  ).join('\n');

  await fetch(`${u}/actividades`, { method: 'POST', headers: h, body: JSON.stringify({
    texto: `Catálogo Arpapel cargado (6 productos):\n${catalogText}`,
    cliente_id: clienteId,
    fecha: new Date().toISOString(),
    usuario: 'Nando'
  })});
  console.log('📋 Catálogo registrado en actividades');

  // 5. Summary
  const totalFacturado = facturas.reduce((s, f) => s + f.m2 * f.pu, 0);
  const totalM2 = facturas.reduce((s, f) => s + f.m2, 0);
  console.log(`\n📊 RESUMEN CARGADO:`);
  console.log(`   Productos: ${productos.length}`);
  console.log(`   Facturas: ${loaded} nuevas`);
  console.log(`   M² totales: ${totalM2.toLocaleString()}`);
  console.log(`   Facturado: $${totalFacturado.toLocaleString()} MXN`);
  console.log(`\n🎯 Abre el ERP → Contabilidad para ver las facturas`);
}

main().catch(e => console.error('Error:', e));
