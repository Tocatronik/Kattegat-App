import { C } from '../utils/constants';
import { fmtI, daysDiff, today } from '../utils/helpers';
import { Inp, TxtInp, DateInp, Sel, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

export default function Contabilidad({
  contTab, setContTab, contMetrics, facturas, gastos,
  showAddFactura, setShowAddFactura, newFact, setNewFact, addFactura,
  showAddGasto, setShowAddGasto, newGasto, setNewGasto, addGasto,
  markFacturaCobrada, saving,
}) {
  return <>
    <Tab tabs={[{ id: "dashboard", ico: "📊", l: "Cierre" }, { id: "cxc", ico: "📄", l: "CxC" }, { id: "gastos", ico: "💸", l: "Gastos" }]} active={contTab} set={setContTab} />
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
