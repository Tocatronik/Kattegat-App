// Generación de PDFs — renderers PUROS. Cada función:
//   1. Recibe TODA la data como parámetros (no toca state ni hooks).
//   2. Hace dynamic import de jsPDF para mantenerlo fuera del bundle inicial.
//   3. Llama `doc.save(...)` con el nombre apropiado.
//   4. Devuelve metadata útil (totales, número de cotización, etc.) para que
//      el caller pueda hacer su toast/log de actividad con info real.
//
// Los wrappers en App.jsx siguen siendo responsables de:
//   - filtrar/seleccionar datos del state
//   - mostrar toasts (showToast)
//   - registrar actividad (logActivity)
// Esto mantiene cero cambio de comportamiento — solo movemos la lógica de
// rendering, no la integración con UI.

import { fmt, fmtI, today } from './format.js';
import { generateQR } from './qr.js';

// ─────────────────────────────────────────────────────────────────────────────
// PACKING LIST
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza Packing List de una OT. El caller debe filtrar las bobinas de la OT
 * antes de invocar (evitamos depender del array global `bobinas`).
 *
 * @param {object} ot — { codigo, cliente_nombre, producto, fecha_inicio, fecha_fin }
 * @param {Array<object>} otBobinas — bobinas de la OT (ya filtradas)
 * @returns {Promise<{ totalBobinas:number, totalMetros:number, totalPeso:number, totalM2:number }>}
 */
export async function buildPackingListPdf(ot, otBobinas) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const W = 215.9, M = 15;

  // Header
  doc.setFillColor(11, 15, 26);
  doc.rect(0, 0, W, 35, 'F');
  doc.setTextColor(255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('KATTEGAT INDUSTRIES', M, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Packing List / Lista de Empaque', M, 23);
  doc.setFontSize(9);
  doc.text(`${ot.codigo} — ${new Date().toLocaleDateString('es-MX')}`, M, 30);

  // Client info
  let y = 45;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Cliente:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ot.cliente_nombre || '', M + 25, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Producto:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.text(ot.producto || '', M + 25, y);
  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', M, y);
  doc.setFont('helvetica', 'normal');
  doc.text(`Inicio: ${ot.fecha_inicio || '—'} | Fin: ${ot.fecha_fin || today()}`, M + 25, y);
  y += 10;

  // Table header
  const cols = [M, M + 25, M + 55, M + 85, M + 115, M + 145];
  doc.setFillColor(59, 130, 246);
  doc.rect(M, y, W - M * 2, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  ['#', 'Código', 'Ancho (mm)', 'Metros', 'Peso (kg)', 'Gramaje'].forEach((h, i) => {
    doc.text(h, cols[i] + 2, y + 5.5);
  });
  y += 10;

  // Table rows
  doc.setTextColor(0);
  doc.setFont('helvetica', 'normal');
  let totalMetros = 0, totalPeso = 0, totalM2 = 0;
  otBobinas.forEach((b, i) => {
    if (y > 250) { doc.addPage(); y = 20; }
    const bg = i % 2 === 0 ? 245 : 255;
    doc.setFillColor(bg, bg, bg);
    doc.rect(M, y - 3.5, W - M * 2, 7, 'F');
    doc.setFontSize(8);
    doc.text(String(i + 1), cols[0] + 2, y);
    doc.text(b.codigo || '', cols[1] + 2, y);
    doc.text(String(b.ancho_mm || ''), cols[2] + 2, y);
    doc.text(fmtI(b.metros_lineales || 0), cols[3] + 2, y);
    doc.text(String(b.peso_kg || ''), cols[4] + 2, y);
    doc.text(String(b.gramaje_total || '') + ' g/m²', cols[5] + 2, y);
    totalMetros += (b.metros_lineales || 0);
    totalPeso += (parseFloat(b.peso_kg) || 0);
    totalM2 += ((b.metros_lineales || 0) * (b.ancho_mm || 0) / 1000);
    y += 7;
  });

  // Totals
  y += 3;
  doc.setFillColor(16, 185, 129);
  doc.rect(M, y - 3.5, W - M * 2, 8, 'F');
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text(
    `TOTAL: ${otBobinas.length} bobinas | ${fmtI(totalMetros)} metros | ${fmtI(totalPeso)} kg | ${fmtI(totalM2)} m²`,
    M + 2, y + 1
  );

  // Footer
  y += 20;
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('___________________________', M, y);
  doc.text('___________________________', W / 2 + 10, y);
  y += 5;
  doc.text('Entregó', M + 10, y);
  doc.text('Recibió', W / 2 + 25, y);
  y += 15;
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generado por Kattegat ERP — ${new Date().toLocaleString('es-MX')}`, M, y);

  doc.save(`PL_${ot.codigo}_${today()}.pdf`);
  return { totalBobinas: otBobinas.length, totalMetros, totalPeso, totalM2 };
}

// ─────────────────────────────────────────────────────────────────────────────
// TDS (Technical Data Sheet) por ficha individual
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza ficha técnica TDS para una resina o papel.
 *
 * @param {object} ficha
 * @param {'resina'|'papel'} tipo
 * @returns {Promise<void>}
 */
export async function buildTDSPdf(ficha, tipo) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header - Kattegat letterhead
  doc.setFillColor(11, 15, 26);
  doc.rect(0, 0, pw, 35, 'F');
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 33, pw, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
  doc.text('K', 15, 23);
  doc.setFontSize(14); doc.text('KATTEGAT INDUSTRIES', 28, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('Extrusión y Laminación de Polietileno | México', 28, 25);

  // Title
  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(30, 41, 59);
  doc.text('FICHA TÉCNICA / TECHNICAL DATA SHEET', pw / 2, 48, { align: 'center' });

  doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5);
  doc.line(20, 52, pw - 20, 52);

  let y = 62;
  const addRow = (label, value, bold) => {
    if (!value && value !== 0) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(label, 22, y);
    doc.setTextColor(30, 41, 59);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(value), 95, y);
    y += 7;
  };
  const addSection = (title) => {
    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(59, 130, 246);
    doc.text(title, 20, y);
    doc.setDrawColor(200, 210, 230); doc.line(20, y + 2, pw - 20, y + 2);
    y += 9;
  };

  if (tipo === 'resina') {
    addSection('IDENTIFICACIÓN');
    addRow('Producto:', ficha.nombre, true);
    addRow('Grado/Grade:', ficha.grado);
    addRow('Fabricante:', ficha.fabricante);
    addRow('Tipo Polímero:', ficha.tipo_polimero);
    addRow('Norma Referencia:', ficha.norma);

    addSection('PROPIEDADES FÍSICAS');
    addRow('MFI (Índice Fluidez):', ficha.mfi ? `${ficha.mfi} g/10min` : '');
    addRow('Densidad:', ficha.densidad ? `${ficha.densidad} g/cm³` : '');
    addRow('Punto de Fusión:', ficha.punto_fusion ? `${ficha.punto_fusion} °C` : '');
    addRow('Dureza (Shore):', ficha.dureza);

    addSection('PROPIEDADES MECÁNICAS');
    addRow('Resistencia Tensión:', ficha.resistencia_tension ? `${ficha.resistencia_tension} MPa` : '');
    addRow('Elongación Ruptura:', ficha.elongacion ? `${ficha.elongacion} %` : '');

    addSection('PROCESAMIENTO');
    addRow('Temp. Proceso Mín:', ficha.temp_min ? `${ficha.temp_min} °C` : '');
    addRow('Temp. Proceso Máx:', ficha.temp_max ? `${ficha.temp_max} °C` : '');
  } else {
    addSection('IDENTIFICACIÓN');
    addRow('Producto:', ficha.nombre, true);
    addRow('Proveedor:', ficha.proveedor);
    addRow('Tipo:', ficha.tipo);
    addRow('Norma Referencia:', ficha.norma);

    addSection('PROPIEDADES FÍSICAS');
    addRow('Gramaje:', ficha.gramaje ? `${ficha.gramaje} g/m²` : '');
    addRow('Espesor:', ficha.espesor ? `${ficha.espesor} μm` : '');
    addRow('Brightness (ISO):', ficha.brightness ? `${ficha.brightness} %` : '');
    addRow('Opacidad:', ficha.opacidad ? `${ficha.opacidad} %` : '');
    addRow('Humedad:', ficha.humedad ? `${ficha.humedad} %` : '');

    addSection('PROPIEDADES MECÁNICAS');
    addRow('Resistencia Tensión:', ficha.resistencia_tension ? `${ficha.resistencia_tension} kN/m` : '');
    addRow('Resistencia Rasgado:', ficha.resistencia_rasgado ? `${ficha.resistencia_rasgado} mN` : '');
    addRow('Porosidad Gurley:', ficha.porosidad ? `${ficha.porosidad} s/100ml` : '');
  }

  if (ficha.notas) {
    addSection('OBSERVACIONES');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(ficha.notas, pw - 44);
    doc.text(lines, 22, y); y += lines.length * 5;
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(59, 130, 246); doc.line(20, y - 5, pw - 20, y - 5);
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Kattegat Industries — Generado: ${new Date().toLocaleDateString('es-MX')}`, 20, y);
  doc.text('Este documento es propiedad de Kattegat Industries', pw - 20, y, { align: 'right' });

  doc.save(`TDS_${ficha.nombre.replace(/\s+/g, '_')}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// CoC (Certificate of Conformity)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza Certificado de Calidad / Conformidad para una bobina.
 * Si la bobina no tiene trazabilidad, devuelve `false` sin generar nada.
 *
 * @param {object} bobina — incluye campo `trazabilidad` (object o JSON string)
 * @returns {Promise<boolean>} — true si se generó el PDF, false si faltaba data
 */
export async function buildCoCPdf(bobina) {
  const traz = typeof bobina.trazabilidad === 'string'
    ? JSON.parse(bobina.trazabilidad)
    : bobina.trazabilidad;
  if (!traz) return false;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(11, 15, 26);
  doc.rect(0, 0, pw, 35, 'F');
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 33, pw, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
  doc.text('K', 15, 23);
  doc.setFontSize(14); doc.text('KATTEGAT INDUSTRIES', 28, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('Extrusión y Laminación de Polietileno | México', 28, 25);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(30, 41, 59);
  doc.text('CERTIFICADO DE CALIDAD', pw / 2, 48, { align: 'center' });
  doc.setFontSize(10); doc.setTextColor(100, 116, 139);
  doc.text('CERTIFICATE OF COMPLIANCE / CONFORMITY', pw / 2, 55, { align: 'center' });

  doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
  doc.line(20, 59, pw - 20, 59);

  let y = 69;
  const addRow = (label, value, bold) => {
    if (!value && value !== 0) return;
    doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); doc.text(label, 22, y);
    doc.setTextColor(30, 41, 59); doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(String(value), 85, y);
    y += 7;
  };
  const addSec = (title) => {
    y += 3;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(16, 185, 129);
    doc.text(title, 20, y);
    doc.setDrawColor(200, 220, 210); doc.line(20, y + 2, pw - 20, y + 2);
    y += 9;
  };

  addSec('PRODUCTO');
  addRow('Código Bobina:', bobina.codigo, true);
  addRow('Lote:', traz.lote || bobina.lote);
  addRow('OT:', traz.ot_codigo);
  addRow('Cliente:', traz.cliente);
  addRow('Fecha Producción:', traz.fecha_produccion?.split('T')[0]);

  addSec('ESPECIFICACIONES');
  addRow('Ancho:', bobina.ancho_mm ? `${bobina.ancho_mm} mm` : '');
  addRow('Largo:', bobina.largo_m ? `${bobina.largo_m} m` : '');
  addRow('Peso:', bobina.peso_kg ? `${bobina.peso_kg} kg` : '');
  addRow('Gramaje:', bobina.gramaje ? `${bobina.gramaje} g/m²` : '');

  addSec('MATERIAS PRIMAS UTILIZADAS');
  if (traz.resinas?.length) {
    traz.resinas.forEach(r => {
      addRow(`Resina ${r.codigo}:`, `${r.tipo || ''} — ${r.peso_kg || ''}kg — Prov: ${r.proveedor || 'N/A'}`);
    });
  }
  if (traz.papeles?.length) {
    traz.papeles.forEach(p => {
      addRow(`Papel ${p.codigo}:`, `${p.tipo || ''} ${p.gramaje || ''}g — ${p.peso_kg || ''}kg — Prov: ${p.proveedor || 'N/A'}`);
    });
  }

  addSec('CONDICIONES DE PRODUCCIÓN');
  addRow('Operador:', traz.operador);
  addRow('Turno Inicio:', traz.turno_inicio);
  if (traz.condiciones_maquina) {
    const cm = traz.condiciones_maquina;
    if (cm.rpm_extruder) addRow('RPM Extruder:', cm.rpm_extruder);
    if (cm.amp_motor) addRow('AMP Motor:', `${cm.amp_motor} A`);
    if (cm.vel_extruder) addRow('Vel. Extruder:', cm.vel_extruder);
    if (cm.rpm_linea) addRow('RPM Línea:', cm.rpm_linea);
    if (cm.vel_linea) addRow('Vel. Línea:', cm.vel_linea);
    if (cm.mpm_linea) addRow('MPM Línea:', `${cm.mpm_linea} m/min`);
    if (cm.mallas_mesh) addRow('Mallas (Mesh):', cm.mallas_mesh);
    // backwards compat
    if (cm.rpm) addRow('RPM:', cm.rpm);
    if (cm.temperaturas && Object.keys(cm.temperaturas).length) {
      y += 3;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text('Temperaturas (°C):', 22, y); y += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
      const tempEntries = Object.entries(cm.temperaturas);
      for (let i = 0; i < tempEntries.length; i += 4) {
        const row = tempEntries.slice(i, i + 4).map(([k, v]) => `${k}: ${v}°C`).join('   |   ');
        doc.setTextColor(30, 41, 59); doc.text(row, 22, y); y += 4;
      }
      y += 2;
    }
    if (cm.observaciones_maq) addRow('Obs. Máquina:', cm.observaciones_maq);
  }
  if (traz.observaciones) addRow('Observaciones:', traz.observaciones);

  // Check if we need a new page
  if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 30; }

  // QR code — non-fatal if it fails (PDF still generates without QR)
  const qrImg = await generateQR(`${window.location.origin}#trace/${bobina.id}`, { width: 200 });
  if (qrImg) {
    doc.addImage(qrImg, 'PNG', pw - 55, y + 5, 35, 35);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text('Escanear para trazabilidad', pw - 55, y + 43);
  }

  // Certification statement
  y += 8;
  doc.setFillColor(240, 253, 244);
  doc.roundedRect(20, y, pw - 40, 25, 3, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(30, 70, 50);
  doc.text('DECLARACIÓN DE CONFORMIDAD', 25, y + 8);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
  doc.text('Por medio del presente se certifica que el producto descrito cumple con las', 25, y + 15);
  doc.text('especificaciones técnicas acordadas y los estándares de calidad de Kattegat Industries.', 25, y + 20);

  // Footer
  const fy = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(16, 185, 129); doc.line(20, fy - 5, pw - 20, fy - 5);
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Kattegat Industries — CoC ${bobina.codigo} — ${new Date().toLocaleDateString('es-MX')}`, 20, fy);
  doc.text('Documento confidencial', pw - 20, fy, { align: 'right' });

  doc.save(`CoC_${bobina.codigo || bobina.lote || 'bobina'}.pdf`);
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// TDS de Cotización (compuesto con materiales usados)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza ficha técnica compuesta a partir de los materiales usados en una
 * cotización. Combina datos de fichas previamente registradas.
 *
 * @param {{ resinas?: Array, papeles?: Array }} materialesUsados
 * @param {{ resinas: Array<object>, papeles: Array<object> }} fichas — catálogo
 *        completo de fichas técnicas (ej: state.fichasResinas / fichasPapeles)
 * @returns {Promise<void>}
 */
export async function buildCotizacionTDS(materialesUsados, fichas) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(11, 15, 26);
  doc.rect(0, 0, pw, 35, 'F');
  doc.setFillColor(139, 92, 246);
  doc.rect(0, 33, pw, 3, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
  doc.text('K', 15, 23);
  doc.setFontSize(14); doc.text('KATTEGAT INDUSTRIES', 28, 18);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
  doc.text('Extrusión y Laminación de Polietileno | México', 28, 25);

  doc.setFont('helvetica', 'bold'); doc.setFontSize(14); doc.setTextColor(30, 41, 59);
  doc.text('FICHA TÉCNICA DE PRODUCTO', pw / 2, 48, { align: 'center' });
  doc.setFontSize(9); doc.setTextColor(100, 116, 139);
  doc.text('Generada desde cotización — Material compuesto', pw / 2, 55, { align: 'center' });

  doc.setDrawColor(139, 92, 246); doc.setLineWidth(0.5);
  doc.line(20, 59, pw - 20, 59);

  let y = 69;
  const addRow = (label, value) => {
    if (!value && value !== 0) return;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); doc.text(label, 22, y);
    doc.setTextColor(30, 41, 59); doc.text(String(value), 90, y);
    y += 7;
  };

  // Find matching fichas for each material
  materialesUsados.resinas?.forEach((r, i) => {
    y += 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(139, 92, 246);
    doc.text(`RESINA ${i + 1}: ${r.nombre}${r.pct ? ` (${r.pct}%)` : ''}`, 20, y);
    doc.setDrawColor(200, 200, 230); doc.line(20, y + 2, pw - 20, y + 2);
    y += 9;

    const ficha = fichas.resinas.find(f => f.nombre === r.nombre || f.grado === r.nombre);
    if (ficha) {
      addRow('Fabricante:', ficha.fabricante);
      addRow('Grado:', ficha.grado);
      addRow('MFI:', ficha.mfi ? `${ficha.mfi} g/10min` : '');
      addRow('Densidad:', ficha.densidad ? `${ficha.densidad} g/cm³` : '');
      addRow('Punto Fusión:', ficha.punto_fusion ? `${ficha.punto_fusion} °C` : '');
      addRow('Resistencia Tensión:', ficha.resistencia_tension ? `${ficha.resistencia_tension} MPa` : '');
      addRow('Elongación:', ficha.elongacion ? `${ficha.elongacion} %` : '');
      addRow('Temp. Proceso:', ficha.temp_min && ficha.temp_max ? `${ficha.temp_min} - ${ficha.temp_max} °C` : '');
    } else {
      doc.setFontSize(9); doc.setTextColor(200, 100, 100);
      doc.text('Sin ficha técnica registrada para este material', 22, y);
      y += 7;
    }
  });

  materialesUsados.papeles?.forEach((p, i) => {
    y += 2;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(139, 92, 246);
    doc.text(`PAPEL ${i + 1}: ${p.nombre}`, 20, y);
    doc.setDrawColor(200, 200, 230); doc.line(20, y + 2, pw - 20, y + 2);
    y += 9;

    const ficha = fichas.papeles.find(f => f.nombre === p.nombre);
    if (ficha) {
      addRow('Proveedor:', ficha.proveedor);
      addRow('Gramaje:', ficha.gramaje ? `${ficha.gramaje} g/m²` : '');
      addRow('Espesor:', ficha.espesor ? `${ficha.espesor} μm` : '');
      addRow('Brightness:', ficha.brightness ? `${ficha.brightness} %` : '');
      addRow('Opacidad:', ficha.opacidad ? `${ficha.opacidad} %` : '');
      addRow('Humedad:', ficha.humedad ? `${ficha.humedad} %` : '');
      addRow('Resistencia Tensión:', ficha.resistencia_tension ? `${ficha.resistencia_tension} kN/m` : '');
    } else {
      doc.setFontSize(9); doc.setTextColor(200, 100, 100);
      doc.text('Sin ficha técnica registrada para este material', 22, y);
      y += 7;
    }
  });

  // Footer
  const fy = doc.internal.pageSize.getHeight() - 20;
  doc.setDrawColor(139, 92, 246); doc.line(20, fy - 5, pw - 20, fy - 5);
  doc.setFontSize(7); doc.setTextColor(148, 163, 184);
  doc.text(`Kattegat Industries — TDS Cotización — ${new Date().toLocaleDateString('es-MX')}`, 20, fy);

  doc.save(`TDS_Cotizacion_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ─────────────────────────────────────────────────────────────────────────────
// COTIZACIÓN comercial (PDF de la propuesta)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Renderiza PDF de cotización comercial con escenarios de cantidad.
 * Toda la data (cliente, escenarios, parámetros, materiales) entra como objeto.
 *
 * @param {object} data
 * @param {string} data.cliente
 * @param {Array<object>|null|undefined} data.clientes — catálogo de clientes (para encontrar contacto/email)
 * @param {Array<{ q:number, m2:number, pk:number, pm2:number, pv:number }>} data.escenarios
 * @param {{ nombre:string, gramaje:number|string }} data.resinaActual
 * @param {{ nombre:string, gramaje:number|string }} data.papelActual
 * @param {object} data.calc — { mermaRefil, totalGrM2 }
 * @param {'maquila'|'propio'} data.tipo
 * @param {string|number} data.anchoMaestro
 * @param {string|number} data.anchoUtil
 * @param {string|number} data.merma
 * @param {string|number} data.margen
 * @param {string} data.condPago
 * @param {string|number} data.validez
 * @param {string} data.numero — ej: "KP-0007"
 * @returns {Promise<{ filename:string }>}
 */
export async function buildCotizacionPdf(data) {
  const {
    cliente, clientes = [], escenarios, resinaActual, papelActual, calc,
    tipo, anchoMaestro, anchoUtil, merma, margen, condPago, validez, numero,
  } = data;

  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
  const w = doc.internal.pageSize.getWidth();
  const margin = 15;
  let y = 15;
  const navy = [11, 15, 26];
  const blue = [59, 130, 246];
  const gray = [100, 116, 139];
  const green = [16, 185, 129];

  // Logo
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = '/kattegat_99d-logo-template.jpg';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    doc.addImage(img, 'JPEG', margin, y, 35, 35);
  } catch (e) { console.warn('[Cotización PDF] logo no disponible:', e); }

  // Header
  doc.setFontSize(18); doc.setTextColor(...navy); doc.setFont('helvetica', 'bold');
  doc.text('KATTEGAT INDUSTRIES', margin + 40, y + 12);
  doc.setFontSize(9); doc.setTextColor(...gray); doc.setFont('helvetica', 'normal');
  doc.text('Soluciones en laminado y extrusión de polietileno', margin + 40, y + 18);
  doc.text('fernando@kattegatindustries.com', margin + 40, y + 23);

  // Cotización title
  y = 55;
  doc.setFillColor(11, 15, 26); doc.rect(margin, y, w - margin * 2, 10, 'F');
  doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('COTIZACIÓN', margin + 4, y + 7);
  doc.setFontSize(11);
  doc.text(numero, w - margin - 4, y + 7, { align: 'right' });

  // Info boxes
  y += 16;
  doc.setTextColor(...navy); doc.setFontSize(9);

  // Left box: Client
  doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, y, (w - margin * 2) / 2 - 3, 28, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue);
  doc.text('CLIENTE', margin + 4, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...navy);
  doc.setFontSize(10); doc.text(cliente, margin + 4, y + 13);
  const cl = clientes.find(c => c.nombre.toLowerCase() === cliente.toLowerCase());
  if (cl) {
    doc.setFontSize(8); doc.setTextColor(...gray);
    if (cl.contacto) doc.text(cl.contacto, margin + 4, y + 18);
    if (cl.email) doc.text(cl.email, margin + 4, y + 23);
  }

  // Right box: Details
  const rx = margin + (w - margin * 2) / 2 + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(rx, y, (w - margin * 2) / 2 - 3, 28, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.setFontSize(9);
  doc.text('DETALLES', rx + 4, y + 6);
  doc.setFont('helvetica', 'normal'); doc.setTextColor(...navy); doc.setFontSize(8);
  doc.text(`Fecha: ${today()}`, rx + 4, y + 12);
  doc.text(`Validez: ${validez} días`, rx + 4, y + 17);
  doc.text(`Pago: ${condPago}`, rx + 4, y + 22);

  // Specs
  y += 34;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.setFontSize(9);
  doc.text('ESPECIFICACIONES', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...navy);
  const esMaq = tipo === 'maquila';
  doc.text(`Tipo: ${esMaq ? 'Maquila' : 'Propio'}`, margin, y);
  doc.text(`Resina: ${resinaActual.nombre} (${resinaActual.gramaje}g/m²)`, margin, y + 5);
  if (!esMaq) doc.text(`Papel: ${papelActual.nombre} (${papelActual.gramaje}g/m²)`, margin, y + 10);
  doc.text(
    `Estructura: ${esMaq ? resinaActual.gramaje + 'g PE' : papelActual.gramaje + 'g + ' + resinaActual.gramaje + 'g = ' + calc.totalGrM2 + 'g/m²'}`,
    esMaq ? margin + 80 : margin, esMaq ? y + 5 : y + 15
  );
  doc.text(`Ancho: ${anchoMaestro}mm maestro → ${anchoUtil}mm útil (Refil: ${fmt(calc.mermaRefil, 1)}%)`, margin + 80, y);
  doc.text(`Merma proceso: ${merma}%  |  Margen: ${margen}%`, margin + 80, y + 5);

  // Table header
  y += (esMaq ? 16 : 22);
  doc.setFillColor(11, 15, 26); doc.rect(margin, y, w - margin * 2, 8, 'F');
  doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  const cols = [margin + 4, margin + 22, margin + 50, margin + 80, margin + 110, margin + 140];
  doc.text('#', cols[0], y + 5.5);
  doc.text('Cantidad (kg)', cols[1], y + 5.5);
  doc.text('m²', cols[2], y + 5.5);
  doc.text('$/kg', cols[3], y + 5.5);
  doc.text('$/m²', cols[4], y + 5.5);
  doc.text('Total', cols[5], y + 5.5);

  // Table rows
  y += 8;
  escenarios.forEach((e, i) => {
    const fill = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...fill); doc.rect(margin, y, w - margin * 2, 8, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...navy);
    doc.text(`${i + 1}`, cols[0], y + 5.5);
    doc.text(`${fmtI(e.q)}`, cols[1], y + 5.5);
    doc.text(`${fmtI(e.m2)}`, cols[2], y + 5.5);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${fmt(e.pk)}`, cols[3], y + 5.5);
    doc.text(`$${fmt(e.pm2)}`, cols[4], y + 5.5);
    doc.setTextColor(...green);
    doc.text(`$${fmtI(e.pv)}`, cols[5], y + 5.5);
    y += 8;
  });

  // Divider
  doc.setDrawColor(200, 200, 200); doc.line(margin, y + 2, w - margin, y + 2);

  // Notes
  y += 8;
  doc.setFont('helvetica', 'bold'); doc.setTextColor(...blue); doc.setFontSize(9);
  doc.text('NOTAS', margin, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...gray);
  const notas = [
    '• Precios en MXN, no incluyen IVA',
    `• Condiciones de pago: ${condPago}`,
    `• Cotización válida por ${validez} días a partir de la fecha de emisión`,
    `• Tipo: ${esMaq ? 'Servicio de maquila (cliente proporciona papel)' : 'Producto completo (papel + polietileno)'}`,
  ];
  notas.forEach(n => { doc.text(n, margin, y); y += 5; });

  // Footer
  y = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y);
  doc.setFontSize(7); doc.setTextColor(...gray);
  doc.text('Kattegat Industries  |  fernando@kattegatindustries.com', w / 2, y + 5, { align: 'center' });
  doc.text(`Generado el ${new Date().toLocaleDateString('es-MX')} — ${numero}`, w / 2, y + 9, { align: 'center' });

  const filename = `Cotizacion_${numero}_${cliente.replace(/\s+/g, '_')}.pdf`;
  doc.save(filename);
  return { filename };
}
