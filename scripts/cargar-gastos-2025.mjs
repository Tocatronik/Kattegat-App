// Cargar gastos 2025 desde Estado de Resultados Excel
// Ejecutar: node scripts/cargar-gastos-2025.mjs

const SUPABASE_URL = 'https://exfxohmvyekfoqlczqzm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI';

const gastos = [
  // === ENERO 2025 ===
  { codigo: "GH-2025-001", concepto: "Nómina Enero 2025", monto: 49989.58, categoria: "nomina", fecha: "2025-01-15" },
  { codigo: "GH-2025-002", concepto: "Impuestos Enero 2025 (SAT/IMSS/SAR/Infonavit)", monto: 14544.27, categoria: "otros", fecha: "2025-01-15" },
  { codigo: "GH-2025-003", concepto: "Renta bodega Enero 2025", monto: 59411.76, categoria: "renta", fecha: "2025-01-15" },
  { codigo: "GH-2025-004", concepto: "Luz Enero 2025", monto: 43394.00, categoria: "luz", fecha: "2025-01-15" },
  { codigo: "GH-2025-005", concepto: "Resinas PE Enero 2025 (Consorcio Dist. Químico)", monto: 160642.62, categoria: "materia_prima", fecha: "2025-01-15" },
  { codigo: "GH-2025-006", concepto: "Contador Enero 2025", monto: 2850.00, categoria: "otros", fecha: "2025-01-15" },
  { codigo: "GH-2025-007", concepto: "Mantenimiento maquinaria Enero 2025 (flete+maniobra)", monto: 5775.00, categoria: "mantenimiento", fecha: "2025-01-24" },

  // === FEBRERO 2025 ===
  { codigo: "GH-2025-008", concepto: "Nómina Febrero 2025", monto: 49726.48, categoria: "nomina", fecha: "2025-02-15" },
  { codigo: "GH-2025-009", concepto: "Impuestos Febrero 2025 (SAT/IMSS/SAR/Infonavit)", monto: 38670.04, categoria: "otros", fecha: "2025-02-15" },
  { codigo: "GH-2025-010", concepto: "Luz Febrero 2025", monto: 15312.00, categoria: "luz", fecha: "2025-02-15" },
  { codigo: "GH-2025-011", concepto: "Contador Febrero 2025", monto: 2850.00, categoria: "otros", fecha: "2025-02-15" },
  { codigo: "GH-2025-012", concepto: "Mantenimiento Febrero 2025 (reparación extrusora + cuchillas)", monto: 42222.41, categoria: "mantenimiento", fecha: "2025-02-12" },

  // === MARZO 2025 ===
  { codigo: "GH-2025-013", concepto: "Nómina Marzo 2025", monto: 51645.80, categoria: "nomina", fecha: "2025-03-15" },
  { codigo: "GH-2025-014", concepto: "Impuestos Marzo 2025 (SAT/IMSS/SAR/Infonavit)", monto: 32640.90, categoria: "otros", fecha: "2025-03-15" },
  { codigo: "GH-2025-015", concepto: "Renta bodega Marzo 2025", monto: 123576.47, categoria: "renta", fecha: "2025-03-15" },
  { codigo: "GH-2025-016", concepto: "Luz Marzo 2025", monto: 10993.00, categoria: "luz", fecha: "2025-03-15" },
  { codigo: "GH-2025-017", concepto: "Resinas PE Marzo 2025 (Consorcio+Promaplast)", monto: 212048.31, categoria: "materia_prima", fecha: "2025-03-15" },
  { codigo: "GH-2025-018", concepto: "Contador Marzo 2025", monto: 2850.00, categoria: "otros", fecha: "2025-03-15" },

  // === ABRIL 2025 ===
  { codigo: "GH-2025-019", concepto: "Nómina Abril 2025", monto: 56789.60, categoria: "nomina", fecha: "2025-04-15" },
  { codigo: "GH-2025-020", concepto: "Impuestos Abril 2025 (SAT/IMSS/SAR/Infonavit)", monto: 38224.70, categoria: "otros", fecha: "2025-04-15" },
  { codigo: "GH-2025-021", concepto: "Renta bodega Abril 2025", monto: 65797.50, categoria: "renta", fecha: "2025-04-15" },
  { codigo: "GH-2025-022", concepto: "Luz Abril 2025", monto: 28886.00, categoria: "luz", fecha: "2025-04-15" },
  { codigo: "GH-2025-023", concepto: "Contador Abril 2025", monto: 2850.00, categoria: "otros", fecha: "2025-04-15" },

  // === MAYO 2025 ===
  { codigo: "GH-2025-024", concepto: "Nómina Mayo 2025", monto: 45431.74, categoria: "nomina", fecha: "2025-05-15" },
  { codigo: "GH-2025-025", concepto: "Impuestos Mayo 2025 (SAT/IMSS/SAR/Infonavit)", monto: 16483.04, categoria: "otros", fecha: "2025-05-15" },
  { codigo: "GH-2025-026", concepto: "Renta bodega Mayo 2025", monto: 61788.23, categoria: "renta", fecha: "2025-05-15" },
  { codigo: "GH-2025-027", concepto: "Luz Mayo 2025", monto: 20325.00, categoria: "luz", fecha: "2025-05-15" },
  { codigo: "GH-2025-028", concepto: "Resinas PE Mayo 2025 (Consorcio Dist. Químico)", monto: 151842.90, categoria: "materia_prima", fecha: "2025-05-12" },
  { codigo: "GH-2025-029", concepto: "Contador Mayo 2025", monto: 2850.00, categoria: "otros", fecha: "2025-05-15" },
  { codigo: "GH-2025-030", concepto: "Mantenimiento Mayo 2025 (esmeril+flete+tornillo banco)", monto: 7039.31, categoria: "mantenimiento", fecha: "2025-05-21" },

  // === JUNIO 2025 ===
  { codigo: "GH-2025-031", concepto: "Nómina Junio 2025", monto: 45431.80, categoria: "nomina", fecha: "2025-06-15" },
  { codigo: "GH-2025-032", concepto: "Impuestos Junio 2025 (SAT/IMSS/SAR/Infonavit)", monto: 34574.98, categoria: "otros", fecha: "2025-06-15" },
  { codigo: "GH-2025-033", concepto: "Renta bodega Junio 2025", monto: 61788.23, categoria: "renta", fecha: "2025-06-15" },
  { codigo: "GH-2025-034", concepto: "Luz Junio 2025", monto: 21569.00, categoria: "luz", fecha: "2025-06-15" },
  { codigo: "GH-2025-035", concepto: "Contador Junio 2025", monto: 2850.00, categoria: "otros", fecha: "2025-06-15" },
  { codigo: "GH-2025-036", concepto: "Mantenimiento Junio 2025 (cuchillas+motor CD+escobillas+ventilador+reostato)", monto: 102602.00, categoria: "mantenimiento", fecha: "2025-06-18" },

  // === JULIO 2025 ===
  { codigo: "GH-2025-037", concepto: "Nómina Julio 2025", monto: 45431.80, categoria: "nomina", fecha: "2025-07-15" },
  { codigo: "GH-2025-038", concepto: "Impuestos Julio 2025 (SAT/IMSS/SAR/Infonavit)", monto: 18177.04, categoria: "otros", fecha: "2025-07-15" },
  { codigo: "GH-2025-039", concepto: "Luz Julio 2025", monto: 25651.00, categoria: "luz", fecha: "2025-07-15" },
  { codigo: "GH-2025-040", concepto: "Resinas PE Julio 2025 (SM Resinas)", monto: 184558.78, categoria: "materia_prima", fecha: "2025-07-07" },
  { codigo: "GH-2025-041", concepto: "Contador Julio 2025", monto: 2850.00, categoria: "otros", fecha: "2025-07-15" },
  { codigo: "GH-2025-042", concepto: "Mantenimiento Julio 2025 (fajas+zapatos seguridad)", monto: 4375.86, categoria: "mantenimiento", fecha: "2025-07-09" },

  // === AGOSTO 2025 ===
  { codigo: "GH-2025-043", concepto: "Nómina Agosto 2025", monto: 56789.60, categoria: "nomina", fecha: "2025-08-15" },
  { codigo: "GH-2025-044", concepto: "Impuestos Agosto 2025 (SAT/IMSS/SAR/Infonavit)", monto: 82436.90, categoria: "otros", fecha: "2025-08-15" },
  { codigo: "GH-2025-045", concepto: "Renta bodega Agosto 2025", monto: 61788.23, categoria: "renta", fecha: "2025-08-15" },
  { codigo: "GH-2025-046", concepto: "Luz Agosto 2025", monto: 29558.00, categoria: "luz", fecha: "2025-08-15" },
  { codigo: "GH-2025-047", concepto: "Resinas PE Agosto 2025 (SM Resinas)", monto: 184119.94, categoria: "materia_prima", fecha: "2025-08-29" },
  { codigo: "GH-2025-048", concepto: "Contador Agosto 2025", monto: 2850.00, categoria: "otros", fecha: "2025-08-15" },
  { codigo: "GH-2025-049", concepto: "Mantenimiento Agosto 2025 (chumacera+asbesto+flete+maniobra)", monto: 16350.81, categoria: "mantenimiento", fecha: "2025-08-06" },

  // === SEPTIEMBRE 2025 ===
  { codigo: "GH-2025-050", concepto: "Nómina Septiembre 2025", monto: 45431.80, categoria: "nomina", fecha: "2025-09-15" },
  { codigo: "GH-2025-051", concepto: "Impuestos Septiembre 2025 (SAT/IMSS/SAR/Infonavit)", monto: 25912.78, categoria: "otros", fecha: "2025-09-15" },
  { codigo: "GH-2025-052", concepto: "Luz Septiembre 2025", monto: 29558.00, categoria: "luz", fecha: "2025-09-15" },
  { codigo: "GH-2025-053", concepto: "Papel Septiembre 2025 (Arpapel)", monto: 166655.86, categoria: "materia_prima", fecha: "2025-09-15" },
  { codigo: "GH-2025-054", concepto: "Contador Septiembre 2025", monto: 2850.00, categoria: "otros", fecha: "2025-09-15" },
  { codigo: "GH-2025-055", concepto: "Mantenimiento Sep 2025 (estructura+herramienta+limpieza cañón+soldadura)", monto: 52625.54, categoria: "mantenimiento", fecha: "2025-09-01" },

  // === OCTUBRE 2025 ===
  { codigo: "GH-2025-056", concepto: "Nómina Octubre 2025", monto: 56789.60, categoria: "nomina", fecha: "2025-10-15" },
  { codigo: "GH-2025-057", concepto: "Impuestos Octubre 2025 (SAT/IMSS/SAR/Infonavit)", monto: 40639.24, categoria: "otros", fecha: "2025-10-15" },
  { codigo: "GH-2025-058", concepto: "Luz Octubre 2025", monto: 49726.00, categoria: "luz", fecha: "2025-10-15" },
  { codigo: "GH-2025-059", concepto: "Resinas PE Octubre 2025 (SM Resinas)", monto: 247704.48, categoria: "materia_prima", fecha: "2025-10-21" },
  { codigo: "GH-2025-060", concepto: "Contador Octubre 2025", monto: 2850.00, categoria: "otros", fecha: "2025-10-15" },

  // === NOVIEMBRE 2025 ===
  { codigo: "GH-2025-061", concepto: "Nómina Noviembre 2025", monto: 45431.60, categoria: "nomina", fecha: "2025-11-15" },
  { codigo: "GH-2025-062", concepto: "Impuestos Noviembre 2025 (SAT/IMSS/SAR/Infonavit)", monto: 15873.78, categoria: "otros", fecha: "2025-11-15" },
  { codigo: "GH-2025-063", concepto: "Renta bodega Noviembre 2025", monto: 123576.46, categoria: "renta", fecha: "2025-11-15" },
  { codigo: "GH-2025-064", concepto: "Luz Noviembre 2025", monto: 53080.00, categoria: "luz", fecha: "2025-11-15" },
  { codigo: "GH-2025-065", concepto: "Resinas PE Noviembre 2025 (SM Resinas)", monto: 173439.08, categoria: "materia_prima", fecha: "2025-11-13" },
  { codigo: "GH-2025-066", concepto: "Contador Noviembre 2025", monto: 2850.00, categoria: "otros", fecha: "2025-11-15" },
  { codigo: "GH-2025-067", concepto: "Mantenimiento Nov 2025 (silicon corona+flete+reparación extrusora)", monto: 45230.58, categoria: "mantenimiento", fecha: "2025-11-12" },

  // === DICIEMBRE 2025 (al 15) ===
  { codigo: "GH-2025-068", concepto: "Nómina Diciembre 2025 (al 15)", monto: 22716.00, categoria: "nomina", fecha: "2025-12-15" },
  { codigo: "GH-2025-069", concepto: "Renta bodega Diciembre 2025", monto: 185364.69, categoria: "renta", fecha: "2025-12-15" },
  { codigo: "GH-2025-070", concepto: "Contador Diciembre 2025", monto: 2850.00, categoria: "otros", fecha: "2025-12-15" },
  { codigo: "GH-2025-071", concepto: "Mantenimiento Dic 2025 (cuchillas+banda cerámica+fundición)", monto: 36570.00, categoria: "mantenimiento", fecha: "2025-12-04" },
];

async function cargar() {
  console.log(`\nCargando ${gastos.length} gastos a Supabase...\n`);

  let ok = 0, fail = 0;

  // Insert in batches of 10
  for (let i = 0; i < gastos.length; i += 10) {
    const batch = gastos.slice(i, i + 10).map(g => ({
      codigo: g.codigo,
      concepto: g.concepto,
      monto: g.monto,
      total: g.monto,
      categoria: g.categoria,
      fecha: g.fecha,
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/gastos`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(batch)
    });

    if (res.ok) {
      const data = await res.json();
      ok += data.length;
      console.log(`  ✓ Batch ${Math.floor(i/10)+1}: ${data.length} gastos insertados`);
    } else {
      const err = await res.text();
      fail += batch.length;
      console.log(`  ✗ Batch ${Math.floor(i/10)+1} ERROR: ${err}`);
    }
  }

  console.log(`\n=== RESULTADO ===`);
  console.log(`  Exitosos: ${ok}`);
  console.log(`  Fallidos: ${fail}`);
  console.log(`  Total: ${gastos.length}`);
}

cargar().catch(console.error);
