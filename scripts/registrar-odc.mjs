// Script para registrar ODC: Arpapel — PO66782 / Orden 370492 (Cliente final: Piñalim)
// Ejecutar: node scripts/registrar-odc.mjs

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://exfxohmvyekfoqlczqzm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI'
);

async function main() {
  console.log('🔍 Buscando si "Arpapel" ya existe como cliente...');

  // 1. Check if client exists
  const { data: existingClientes } = await supabase
    .from('clientes')
    .select('id, nombre, etapa')
    .ilike('nombre', '%arpapel%');

  let clienteId;

  if (existingClientes && existingClientes.length > 0) {
    console.log(`✅ Cliente encontrado: "${existingClientes[0].nombre}" (${existingClientes[0].etapa})`);
    clienteId = existingClientes[0].id;
  } else {
    console.log('📝 Creando cliente "Arpapel"...');
    const { data: newCliente, error: errCli } = await supabase.from('clientes').insert({
      nombre: 'Arpapel',
      contacto: 'Jannice Viridiana Tapia Gómez',
      email: 'compras3@arpapel.com.mx',
      telefono: '5521223860',
      ciudad: '',
      etapa: 'ganado',
      notas: 'Cliente final: Piñalim. PO vía Jannice (compras3@arpapel.com.mx). RQ vía Héctor Pérez Gutiérrez (prodflexible01@graphopak.com.mx). Facturación a Daniel Ballesteros (dballesteros@gmnv.mx).',
      tons_potenciales: '15',
      created_by: 'Nando',
      updated_by: 'Nando'
    }).select();

    if (errCli) { console.error('❌ Error creando cliente:', errCli.message); return; }
    clienteId = newCliente[0].id;
    console.log(`✅ Cliente creado con ID: ${clienteId}`);
  }

  // 2. Get max OT number
  const { data: allOTs } = await supabase.from('ordenes_trabajo').select('codigo');
  const maxNum = (allOTs || []).reduce((mx, o) => {
    const n = parseInt(o.codigo?.replace('OT-', ''));
    return n > mx ? n : mx;
  }, 0);
  const nuevoCodigo = `OT-${String(maxNum + 1).padStart(3, '0')}`;

  // 3. Create OT
  console.log(`📝 Creando ${nuevoCodigo}...`);
  const { data: newOT, error: errOT } = await supabase.from('ordenes_trabajo').insert({
    codigo: nuevoCodigo,
    cliente_nombre: 'Arpapel',
    tipo: 'maquila',
    producto: 'COEXTRUIDO BOND90GR+PEBD15GR 1000MM 105GR — Piñalim (Art. AP0039)',
    dias_credito: 30,
    status: 'pendiente',
    notas: `PO: PO66782 (Arpapel) | Orden Graphopak: 370492 | Art: AP0039 | ID: 4879117 | Op: 19\nCliente final: Piñalim\nCantidad: 145,000 metros lineales (145,000 m²)\nRQ: Héctor Pérez (Graphopak) | PO: Jannice Tapia (Arpapel)\nEntrega requiere: Factura+Remisión, OC, Cert. Calidad, Cert. Fumigación`
  }).select();

  if (errOT) { console.error('❌ Error creando OT:', errOT.message); return; }
  console.log(`✅ ${nuevoCodigo} creada exitosamente!`);
  console.log('   Cliente: Arpapel');
  console.log('   Producto: COEXTRUIDO BOND90GR+PEBD15GR 1000MM 105GR');
  console.log('   PO: PO66782 | Orden: 370492');
  console.log('   Cantidad: 145,000 m lineales');
  console.log('   Status: pendiente');

  // 4. Log activity
  await supabase.from('actividades').insert({
    texto: `ODC registrada: ${nuevoCodigo} — Arpapel — PO66782 — COEXTRUIDO BOND90GR+PEBD15GR 1000MM 105GR — 145,000 m`,
    cliente_id: clienteId,
    fecha: new Date().toISOString(),
    usuario: 'Nando'
  });
  console.log('📋 Actividad registrada en log');

  console.log('\n🎯 Listo! Abre el ERP para ver la OT nueva.');
}

main().catch(e => console.error('Error:', e));
