import { useMemo, useState } from 'react';
import { C } from '../utils/constants';
import { fmtI, daysDiff, today } from '../utils/helpers';
import { Inp, TxtInp, DateInp, Sel, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

export default function Contabilidad({
  contTab, setContTab, contMetrics, facturas, gastos,
  showAddFactura, setShowAddFactura, newFact, setNewFact, addFactura,
  showAddGasto, setShowAddGasto, newGasto, setNewGasto, addGasto,
  markFacturaCobrada, saving,
}) {
  const [plMonths, setPlMonths] = useState(12);
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];

  const plData = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth();
    const yearActual = now.getFullYear();
    const rows = [];
    let acumVentas = 0, acumGastos = 0;
    for (let i = plMonths - 1; i >= 0; i--) {
      const d = new Date(yearActual, mesActual - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const facM = facturas.filter(f => { const fd = new Date(f.fecha_emision); return fd.getMonth() === m && fd.getFullYear() === y; });
      const gasM = gastos.filter(g => { const gd = new Date(g.fecha); return gd.getMonth() === m && gd.getFullYear() === y; });
      const ventas = facM.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
      const gasto = gasM.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
      acumVentas += ventas;
      acumGastos += gasto;
      rows.push({ label: `${meses[m]} ${String(y).slice(2)}`, ventas, gasto, util: ventas - gasto, nFac: facM.length, nGas: gasM.length });
    }
    return { rows, acumVentas, acumGastos, acumUtil: acumVentas - acumGastos };
  }, [facturas, gastos, plMonths]);

  const maxPL = Math.max(...plData.rows.map(r => Math.max(r.ventas, r.gasto)), 1);

  return <>
    <Tab tabs={[{ id: "dashboard", ico: "📊", l: "Cierre" }, { id: "pl", ico: "📈", l: "P&L" }, { id: "cxc", ico: "📄", l: "CxC" }, { id: "gastos", ico: "💸", l: "Gastos" }]} active={contTab} set={setContTab} />
    <div style={{ marginTop: 12 }}>
      {contTab === "dashboard" && <>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card v={`$${fmtI(contMetrics.totalCxC)}`} l="CxC Pendiente" c={C.acc} ico="📄" />
          <Card v={`$${fmtI(contMetrics.totalVencido)}`} l="Vencido" c={C.red} ico="⚠️" />
          <Card v={`$${fmtI(contMetrics.totalGastosMes)}`} l="Gastos" c={C.amb} ico="💸" />
          <Card v={`$${fmtI(contMetrics.totalCxC - contMetrics.totalGastosMes)}`} l="Flujo Est." c={contMetrics.totalCxC > contMetrics.totalGastosMes ? C.grn : C.red} ico="💰" />
        </div>
        {contMetrics.facVencidas.length > 0 && <Sec t={`⚠️ Vencidas (${contMetrics.facVencidas.length})`} ico="🔴" col={C.red} ch={<>
          {contMetrics.facVencidas.map(f => (
            <div key={f.id} style={{ padding: 8, background: `${C.red}08`, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.red}30` }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontWeight: 700 }}>{f.cliente_nombre}</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.red, fontFamily: "monospace" }}>${fmtI(f.total || f.monto)}</span>
              </div>
            </div>
          ))}
        </>} />}
      </>}
      {contTab === "pl" && <>
        {/* Period selector */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 11, color: C.t2, fontWeight: 600 }}>Estado de Resultados</div>
          <div style={{ display: "flex", gap: 4 }}>
            {[6, 12, 18].map(n => (
              <button key={n} onClick={() => setPlMonths(n)}
                style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
                  border: `1px solid ${plMonths === n ? C.acc : C.brd}`,
                  background: plMonths === n ? `${C.acc}20` : "transparent",
                  color: plMonths === n ? C.acc : C.t3
                }}>{n}m</button>
            ))}
          </div>
        </div>
        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 12 }}>
          <div style={{ background: `${C.grn}12`, borderRadius: 8, padding: 10, textAlign: "center", border: `1px solid ${C.grn}30` }}>
            <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase" }}>Ventas</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.grn, fontFamily: "monospace" }}>${fmtI(plData.acumVentas)}</div>
          </div>
          <div style={{ background: `${C.red}12`, borderRadius: 8, padding: 10, textAlign: "center", border: `1px solid ${C.red}30` }}>
            <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase" }}>Gastos</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.red, fontFamily: "monospace" }}>${fmtI(plData.acumGastos)}</div>
          </div>
          <div style={{ background: plData.acumUtil >= 0 ? `${C.grn}12` : `${C.red}12`, borderRadius: 8, padding: 10, textAlign: "center", border: `1px solid ${plData.acumUtil >= 0 ? C.grn : C.red}30` }}>
            <div style={{ fontSize: 9, color: C.t3, textTransform: "uppercase" }}>Utilidad</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: plData.acumUtil >= 0 ? C.grn : C.red, fontFamily: "monospace" }}>${fmtI(plData.acumUtil)}</div>
          </div>
        </div>
        {/* Monthly table */}
        <div style={{ background: C.bg, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.brd}` }}>
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", padding: "8px 10px", background: C.s2, borderBottom: `1px solid ${C.brd}` }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.t3 }}>MES</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.grn, textAlign: "right" }}>VENTAS</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.red, textAlign: "right" }}>GASTOS</span>
            <span style={{ fontSize: 9, fontWeight: 700, color: C.acc, textAlign: "right" }}>UTILIDAD</span>
          </div>
          {plData.rows.map((r, i) => (
            <div key={i} style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", padding: "7px 10px", borderBottom: i < plData.rows.length - 1 ? `1px solid ${C.brd}` : "none", background: r.util < 0 ? `${C.red}06` : "transparent" }}>
              <span style={{ fontSize: 10, fontWeight: 600, color: C.t2 }}>{r.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.grn, textAlign: "right", fontFamily: "monospace" }}>
                {r.ventas > 0 ? `$${fmtI(r.ventas)}` : "—"}
                {r.nFac > 0 && <span style={{ fontSize: 8, color: C.t3, marginLeft: 3 }}>({r.nFac})</span>}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.red, textAlign: "right", fontFamily: "monospace" }}>
                {r.gasto > 0 ? `$${fmtI(r.gasto)}` : "—"}
                {r.nGas > 0 && <span style={{ fontSize: 8, color: C.t3, marginLeft: 3 }}>({r.nGas})</span>}
              </span>
              <span style={{ fontSize: 11, fontWeight: 800, color: r.util >= 0 ? C.grn : C.red, textAlign: "right", fontFamily: "monospace" }}>
                {r.ventas > 0 || r.gasto > 0 ? `$${fmtI(r.util)}` : "—"}
              </span>
            </div>
          ))}
          {/* Totals row */}
          <div style={{ display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr", padding: "8px 10px", background: C.s2, borderTop: `2px solid ${C.brd}` }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.t1 }}>TOTAL</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.grn, textAlign: "right", fontFamily: "monospace" }}>${fmtI(plData.acumVentas)}</span>
            <span style={{ fontSize: 11, fontWeight: 800, color: C.red, textAlign: "right", fontFamily: "monospace" }}>${fmtI(plData.acumGastos)}</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: plData.acumUtil >= 0 ? C.grn : C.red, textAlign: "right", fontFamily: "monospace" }}>${fmtI(plData.acumUtil)}</span>
          </div>
        </div>
        {/* Margin bar */}
        {plData.acumVentas > 0 && <div style={{ marginTop: 10, padding: 10, background: C.s2, borderRadius: 8, border: `1px solid ${C.brd}` }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: C.t3 }}>Margen de utilidad</span>
            <span style={{ fontSize: 12, fontWeight: 800, color: plData.acumUtil >= 0 ? C.grn : C.red }}>{((plData.acumUtil / plData.acumVentas) * 100).toFixed(1)}%</span>
          </div>
          <div style={{ height: 8, background: `${C.red}30`, borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.max(Math.min((plData.acumUtil / plData.acumVentas) * 100, 100), 0)}%`, background: C.grn, borderRadius: 4, transition: "width 0.5s" }} />
          </div>
        </div>}
      </>}
      {contTab === "cxc" && <>
        <Sec t="CxC" ico="📄" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddFactura(true)} />}
          ch={<>{facturas.slice(0, 20).map((f, i) => {
            const diasRest = daysDiff(f.fecha_vencimiento, today());
            const color = f.status === "cobrada" ? C.grn : diasRest < 0 ? C.red : diasRest <= 7 ? C.amb : C.acc;
            return (
              <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${color}30` }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{f.codigo}</span>
                    <Badge text={f.status} color={color} />
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 800, color, fontFamily: "monospace" }}>${fmtI(f.total || f.monto)}</span>
                </div>
                <div style={{ fontSize: 11, color: C.t2 }}>{f.cliente_nombre}</div>
                <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>Vence: {f.fecha_vencimiento}</div>
                {f.status !== "cobrada" && (
                  <div style={{ marginTop: 6 }}>
                    <Btn text="Marcar Cobrada" sm outline color={C.grn} onClick={() => markFacturaCobrada(f.id)} />
                  </div>
                )}
              </div>
            );
          })}</>}
        />
        {showAddFactura && <Modal title="+ Factura" onClose={() => setShowAddFactura(false)} ch={<>
          <R ch={<><F l="Cliente" w="58%" ch={<TxtInp v={newFact.cliente} set={v => setNewFact(p => ({...p, cliente: v}))} />} /><F l="Monto" w="38%" ch={<Inp v={newFact.monto} set={v => setNewFact(p => ({...p, monto: v}))} pre="$" />} /></>} />
          <R ch={<F l="Concepto" w="100%" ch={<TxtInp v={newFact.concepto} set={v => setNewFact(p => ({...p, concepto: v}))} />} />} />
          <R ch={<><F l="Fecha" w="48%" ch={<DateInp v={newFact.fechaEmision} set={v => setNewFact(p => ({...p, fechaEmision: v}))} />} /><F l="Días crédito" w="48%" ch={<Inp v={newFact.diasCredito} set={v => setNewFact(p => ({...p, diasCredito: v}))} />} /></>} />
          <Btn text={saving ? "Creando..." : "Crear"} ico="✓" color={C.grn} full onClick={addFactura} disabled={saving} />
        </>} />}
      </>}
      {contTab === "gastos" && <>
        <Sec t="Gastos" ico="💸" right={<Btn text="+" sm color={C.amb} onClick={() => setShowAddGasto(true)} />}
          ch={<>{gastos.slice(0, 20).map((g, i) => (
            <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{g.codigo}</span>
                  <Badge text={g.categoria?.replace("_", " ")} color={C.pur} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 800, color: C.red, fontFamily: "monospace" }}>${fmtI(g.total || g.monto)}</span>
              </div>
              <div style={{ fontSize: 11, color: C.t2 }}>{g.concepto}</div>
              <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{g.fecha}</div>
            </div>
          ))}</>}
        />
        {showAddGasto && <Modal title="+ Gasto" onClose={() => setShowAddGasto(false)} ch={<>
          <R ch={<F l="Concepto" w="100%" ch={<TxtInp v={newGasto.concepto} set={v => setNewGasto(p => ({...p, concepto: v}))} />} />} />
          <R ch={<><F l="Categoría" w="48%" ch={<Sel v={newGasto.categoria} set={v => setNewGasto(p => ({...p, categoria: v}))} opts={[{v:"materia_prima",l:"MP"},{v:"nomina",l:"Nómina"},{v:"renta",l:"Renta"},{v:"luz",l:"Luz"},{v:"mantenimiento",l:"Mant."},{v:"otros",l:"Otros"}]} />} /><F l="Monto" w="48%" ch={<Inp v={newGasto.monto} set={v => setNewGasto(p => ({...p, monto: v}))} pre="$" />} /></>} />
          <R ch={<><F l="Fecha" w="48%" ch={<DateInp v={newGasto.fecha} set={v => setNewGasto(p => ({...p, fecha: v}))} />} /><F l="Comprobante" w="48%" ch={<TxtInp v={newGasto.comprobante} set={v => setNewGasto(p => ({...p, comprobante: v}))} />} /></>} />
          <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.amb} full onClick={addGasto} disabled={saving} />
        </>} />}
      </>}
    </div>
  </>;
}
