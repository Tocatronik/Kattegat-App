// Carga historial de facturas Arpapel al ERP (Supabase)
// Columnas: codigo, cliente_nombre, concepto, monto, iva, total, fecha_emision, dias_credito, fecha_vencimiento, status
// Ejecutar: node scripts/cargar-facturas-arpapel.mjs

const h = {
  'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI',
  'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI',
  'Content-Type': 'application/json',
  'Prefer': 'return=representation'
};
const u = 'https://exfxohmvyekfoqlczqzm.supabase.co/rest/v1';

const facturas = [
  { cod: 'FAC-090', num: '90', po: 'PO59493', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 13064, pu: 2.00, fecha: '2025-01-16', st: 'cobrada' },
  { cod: 'FAC-091', num: '91', po: 'PO59494', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 59984, pu: 2.00, fecha: '2025-01-16', st: 'cobrada' },
  { cod: 'FAC-092', num: '92', po: 'PO59363', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 30400, pu: 2.00, fecha: '2025-01-22', st: 'cobrada' },
  { cod: 'FAC-093', num: '93', po: 'PO59583', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 38308, pu: 3.70, fecha: '2025-01-22', st: 'cobrada' },
  { cod: 'FAC-095', num: '95', po: 'PO60181', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 41572.5, pu: 3.70, fecha: '2025-02-25', st: 'cobrada' },
  { cod: 'FAC-096', num: '96', po: 'PO60899', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 27600, pu: 3.70, fecha: '2025-04-21', st: 'cobrada' },
  { cod: 'FAC-097', num: '97', po: 'PO61175', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 39330, pu: 3.70, fecha: '2025-04-21', st: 'cobrada' },
  { cod: 'FAC-098', num: '98', po: 'PO61873', clv: 'AP0032', desc: 'Tela Coextruida Blanca 80GR', m2: 19730.7, pu: 4.15, fecha: '2025-05-16', st: 'cobrada' },
  { cod: 'FAC-100', num: '100', po: 'PO62588', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 69632.5, pu: 3.70, fecha: '2025-06-19', st: 'cobrada' },
  { cod: 'FAC-101', num: '101', po: 'PO62294', clv: 'AP0038', desc: 'Coextruido LWC 60+PE 18 78GR', m2: 61300, pu: 1.40, fecha: '2025-06-05', st: 'cobrada' },
  { cod: 'FAC-102', num: '102', po: 'PO62295', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 70300, pu: 2.00, fecha: '2025-06-05', st: 'cobrada' },
  { cod: 'FAC-103', num: '103', po: 'PO62954', clv: 'AP0039', desc: 'Coextruido BOND 90+PEBD 15 105GR', m2: 89100, pu: 5.50, fecha: '2025-07-08', st: 'cobrada' },
  { cod: 'FAC-104', num: '104', po: 'PO63188', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 85690, pu: 2.00, fecha: '2025-07-22', st: 'cobrada' },
  { cod: 'FAC-106', num: '106', po: 'PO63645', clv: 'AP0034', desc: 'Coextruido KRAFT 130+PE 14 144GR', m2: 5310, pu: 4.20, fecha: '2025-08-15', st: 'cobrada' },
  { cod: 'FAC-108', num: '108', po: 'PO63889', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 68022.5, pu: 3.70, fecha: '2025-08-27', st: 'cobrada' },
  { cod: 'FAC-109', num: '109', po: 'PO63934', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 57190, pu: 2.00, fecha: '2025-09-01', st: 'cobrada' },
  { cod: 'FAC-110', num: '110', po: 'PO64084', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 86480, pu: 3.70, fecha: '2025-09-10', st: 'cobrada' },
  { cod: 'FAC-111', num: '111', po: 'PO64218', clv: 'AP0034', desc: 'Coextruido KRAFT 130+PE 14 144GR', m2: 14900, pu: 4.20, fecha: '2025-09-19', st: 'cobrada' },
  { cod: 'FAC-112', num: '112', po: 'PO64528', clv: 'AP0034', desc: 'Coextruido KRAFT 130+PE 14 144GR', m2: 39159, pu: 4.20, fecha: '2025-10-10', st: 'cobrada' },
  { cod: 'FAC-113', num: '113', po: 'PO64529', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 46400, pu: 3.70, fecha: '2025-10-10', st: 'cobrada' },
  { cod: 'FAC-114', num: '114', po: 'PO64624', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28405, pu: 2.00, fecha: '2025-10-16', st: 'cobrada' },
  { cod: 'FAC-115', num: '115', po: 'PO64808', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 90060, pu: 2.00, fecha: '2025-10-27', st: 'cobrada' },
  { cod: 'FAC-116', num: '116', po: 'PO64809', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 45655, pu: 3.70, fecha: '2025-10-27', st: 'cobrada' },
  { cod: 'FAC-117', num: '117', po: 'PO64832', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28500, pu: 2.00, fecha: '2025-10-27', st: 'cobrada' },
  { cod: 'FAC-118', num: '118', po: 'PO64934', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28215, pu: 2.00, fecha: '2025-10-31', st: 'cobrada' },
  { cod: 'FAC-119', num: '119', po: 'PO64935', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 9500, pu: 2.00, fecha: '2025-10-31', st: 'cobrada' },
  { cod: 'FAC-120', num: '120', po: 'PO64936', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28025, pu: 2.00, fecha: '2025-10-31', st: 'cobrada' },
  { cod: 'FAC-121', num: '121', po: 'PO65011', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28025, pu: 2.00, fecha: '2025-11-07', st: 'cobrada' },
  { cod: 'FAC-122', num: '122', po: 'PO65059', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 28120, pu: 2.00, fecha: '2025-11-07', st: 'cobrada' },
  { cod: 'FAC-125', num: '125', po: 'PO65152', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 36684.5, pu: 3.70, fecha: '2025-11-20', st: 'cobrada' },
  { cod: 'FAC-126', num: '126', po: 'PO65309', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 51585, pu: 2.00, fecha: '2025-11-20', st: 'cobrada' },
  { cod: 'FAC-127', num: '127', po: 'PO65456', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 31397.5, pu: 2.00, fecha: '2025-11-28', st: 'cobrada' },
  { cod: 'FAC-129', num: '129', po: 'PO65669', clv: 'AP0035', desc: 'Coextruido BOND 32.5+PE 15 47GR', m2: 50302.5, pu: 2.00, fecha: '2025-12-05', st: 'cobrada' },
  { cod: 'FAC-130', num: '130', po: 'PO65662', clv: 'AP0033', desc: 'Coextruido BOND 70+PE 10 80GR', m2: 130352.5, pu: 3.70, fecha: '2025-12-05', st: 'pendiente' },
  { cod: 'FAC-131', num: '131', po: 'PO66064', clv: 'AP0034', desc: 'Coextruido KRAFT 130+PE 14 144GR', m2: 38619, pu: 4.20, fecha: '2026-01-12', st: 'pendiente' },
];

async function main() {
  console.log('📄 Cargando 35 facturas de Arpapel...\n');
  let ok = 0, err = 0, errMsgs = [];

  for (const f of facturas) {
    const subtotal = Math.round(f.m2 * f.pu * 100) / 100;
    const iva = Math.round(subtotal * 0.16 * 100) / 100;
    const total = Math.round((subtotal + iva) * 100) / 100;
    const venc = new Date(new Date(f.fecha).getTime() + 30 * 86400000).toISOString().split('T')[0];

    const body = {
      codigo: f.cod,
      cliente_nombre: 'Arpapel',
      concepto: `${f.clv} ${f.desc} | PO: ${f.po} | ${f.m2.toLocaleString()}M²`,
      monto: subtotal,
      iva: iva,
      total: total,
      fecha_emision: f.fecha,
      dias_credito: 30,
      fecha_vencimiento: venc,
      status: f.st,
    };

    const r = await fetch(`${u}/facturas`, { method: 'POST', headers: h, body: JSON.stringify(body) });
    const j = await r.json();
    if (j.code) {
      err++;
      if (errMsgs.length < 3) errMsgs.push(`${f.cod}: ${j.message}`);
    } else {
      ok++;
      process.stdout.write(`  ✅ ${f.cod} (${f.clv} ${f.po}) $${subtotal.toLocaleString()}\n`);
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ ${ok} facturas cargadas`);
  if (err > 0) {
    console.log(`⚠️  ${err} errores:`);
    errMsgs.forEach(m => console.log(`   ${m}`));
  }

  // Summary
  const totalFact = facturas.reduce((s, f) => s + Math.round(f.m2 * f.pu * 1.16 * 100) / 100, 0);
  const totalM2 = facturas.reduce((s, f) => s + f.m2, 0);
  const cobradas = facturas.filter(f => f.st === 'cobrada').length;
  const pendientes = facturas.filter(f => f.st === 'pendiente').length;

  console.log(`\n📊 RESUMEN:`);
  console.log(`   ${facturas.length} facturas (${cobradas} cobradas, ${pendientes} pendientes)`);
  console.log(`   ${totalM2.toLocaleString()} M² totales`);
  console.log(`   $${totalFact.toLocaleString()} MXN facturado (c/IVA)`);
  console.log(`\n🎯 Abre el ERP → Contabilidad para verificar`);
}

main().catch(e => console.error('Error:', e));
