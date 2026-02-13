import { useMemo } from 'react';
import { C, STAGES } from '../utils/constants';
import { fmtI } from '../utils/helpers';
import { Sec, Card, RR, Btn, Badge } from '../components/ui';

export default function Dashboard({ ots, bobinas, facturas, gastos, clientes, cotCRM, solicitudes, actividades, resinas, papeles, empleados, setMod }) {
  // ─── Memoized dashboard metrics ───
  const {
    otsActivas, otsCompletadas, otsPendientes, facturasTotal, facturasCobradas,
    facturasPendientes, gastosTotal, clientesTotal, cotTotal, solicitudesPend,
    prodByMonth, maxKg, revByMonth, maxRev, pipeline
  } = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth();
    const yearActual = now.getFullYear();
    const otsActivas = ots.filter(o => o.status === "en_proceso").length;
    const otsCompletadas = ots.filter(o => o.status === "completada").length;
    const otsPendientes = ots.filter(o => o.status === "pendiente").length;
    const facturasTotal = facturas.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
    const facturasCobradas = facturas.filter(f => f.cobrada).reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
    const facturasPendientes = facturasTotal - facturasCobradas;
    const gastosTotal = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
    const clientesTotal = clientes.length;
    const cotTotal = cotCRM.reduce((s, q) => s + (q.total || 0), 0);
    const solicitudesPend = solicitudes.filter(s => s.status === "pendiente").length;
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const prodByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(yearActual, mesActual - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const otsM = ots.filter(o => { const od = new Date(o.fecha_creacion); return od.getMonth() === m && od.getFullYear() === y; });
      const bobM = bobinas.filter(b => { const bd = new Date(b.fecha_produccion); return bd.getMonth() === m && bd.getFullYear() === y; });
      const kgProd = bobM.reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
      prodByMonth.push({ label: `${meses[m]} ${String(y).slice(2)}`, ots: otsM.length, kg: kgProd });
    }
    const maxKg = Math.max(...prodByMonth.map(p => p.kg), 1);
    const revByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(yearActual, mesActual - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const facM = facturas.filter(f => { const fd = new Date(f.fecha_emision); return fd.getMonth() === m && fd.getFullYear() === y; });
      const rev = facM.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
      revByMonth.push({ label: `${meses[m]} ${String(y).slice(2)}`, rev });
    }
    const maxRev = Math.max(...revByMonth.map(r => r.rev), 1);
    const pipeline = STAGES.map(st => ({ ...st, count: clientes.filter(c => c.etapa === st.id).length }));
    return { otsActivas, otsCompletadas, otsPendientes, facturasTotal, facturasCobradas, facturasPendientes, gastosTotal, clientesTotal, cotTotal, solicitudesPend, prodByMonth, maxKg, revByMonth, maxRev, pipeline };
  }, [ots, bobinas, facturas, gastos, clientes, cotCRM, solicitudes]);

  const Bar = ({ value, max, color, label, sub }) => (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 2px" }}>
        <div style={{ width: "100%", maxWidth: 32, background: `${color}30`, borderRadius: "4px 4px 0 0", height: `${Math.max((value / max) * 100, 4)}%`, position: "relative", transition: "height 0.5s" }}>
          <div style={{ position: "absolute", top: -18, width: "100%", textAlign: "center", fontSize: 10, fontWeight: 700, color }}>{value > 0 ? (value > 999 ? `${(value/1000).toFixed(0)}k` : value) : ""}</div>
          <div style={{ width: "100%", height: "100%", background: color, borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
        </div>
      </div>
      <div style={{ fontSize: 9, color: C.t3, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: C.t3 }}>{sub}</div>}
    </div>
  );

  return <>
    {/* KPI Cards */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      <div style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.acc}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.acc}40` }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>OTs Activas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.acc }}>{otsActivas}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>{otsPendientes} pendientes · {otsCompletadas} completadas</div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.grn}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.grn}40` }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>Facturado</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.grn }}>${fmtI(facturasTotal)}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>Cobrado: ${fmtI(facturasCobradas)}</div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.amb}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.amb}40` }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>Por Cobrar</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.amb }}>${fmtI(facturasPendientes)}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>{facturas.filter(f=>!f.cobrada).length} facturas</div>
      </div>
      <div style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.pur}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.pur}40` }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>CRM Pipeline</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.pur }}>${fmtI(cotTotal)}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>{clientesTotal} clientes · {cotCRM.length} cots</div>
      </div>
    </div>
    {/* Alerts */}
    {solicitudesPend > 0 && <div style={{ background: `${C.red}15`, border: `1px solid ${C.red}40`, borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ fontSize: 16 }}>🔴</span>
      <span style={{ fontSize: 11, color: C.red, fontWeight: 600 }}>{solicitudesPend} solicitud(es) de corrección pendiente(s)</span>
      <Btn text="Ver" sm color={C.red} onClick={() => setMod("solicitudes")} />
    </div>}
    {/* Production Chart */}
    <Sec t="Producción (últimos 6 meses)" ico="🏭" ch={
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
        {prodByMonth.map((p, i) => <Bar key={i} value={p.kg} max={maxKg} color={C.acc} label={p.label} sub={`${p.ots} OTs`} />)}
      </div>
    } />
    {/* Revenue Chart */}
    <Sec t="Facturación (últimos 6 meses)" ico="💰" col={C.grn} ch={
      <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
        {revByMonth.map((r, i) => <Bar key={i} value={r.rev} max={maxRev} color={C.grn} label={r.label} />)}
      </div>
    } />
    {/* Pipeline Funnel */}
    <Sec t="Pipeline CRM" ico="🎯" col={C.pur} ch={
      <div>
        {pipeline.map((st, i) => (
          <div key={st.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: i < pipeline.length - 1 ? `1px solid ${C.brd}` : "none" }}>
            <span style={{ fontSize: 14 }}>{st.ico}</span>
            <span style={{ fontSize: 11, color: C.t2, width: 90 }}>{st.l}</span>
            <div style={{ flex: 1, height: 20, background: C.bg, borderRadius: 10, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.max((st.count / Math.max(clientesTotal, 1)) * 100, st.count > 0 ? 8 : 0)}%`, background: `${st.c}80`, borderRadius: 10, transition: "width 0.5s", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {st.count > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{st.count}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    } />
    {/* Inventory Quick View */}
    <Sec t="Inventario Rápido" ico="📦" ch={<>
      <RR l="Resinas en almacén" v={`${resinas.length} lotes`} />
      <RR l="Papel/Bobinas MP" v={`${papeles.length} lotes`} />
      <RR l="Bobinas PT" v={`${bobinas.length} bobinas`} />
      <RR l="Empleados activos" v={`${empleados.length}`} />
    </>} />
    {/* Recent Activity */}
    <Sec t="Actividad Reciente" ico="📝" right={<Btn text="Ver todo" sm outline onClick={() => setMod("actividad")} />} ch={
      <div>{actividades.slice(0, 5).map((a, i) => (
        <div key={i} style={{ padding: "6px 0", borderBottom: i < 4 ? `1px solid ${C.brd}` : "none", display: "flex", gap: 8, alignItems: "flex-start" }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: a.texto?.includes("eliminad") ? C.red : a.texto?.includes("Cotización") ? C.grn : C.acc, marginTop: 5, flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: 11, color: C.t1 }}>{a.texto}</div>
            <div style={{ fontSize: 9, color: C.t3 }}>{new Date(a.fecha).toLocaleString("es-MX")}</div>
          </div>
        </div>
      ))}</div>
    } />
  </>;
}
