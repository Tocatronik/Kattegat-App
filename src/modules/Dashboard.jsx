import { useMemo, useState } from 'react';
import { C, STAGES } from '../utils/constants';
import { fmtI } from '../utils/helpers';
import { Sec, Card, RR, Btn, Badge } from '../components/ui';

export default function Dashboard({ ots, bobinas, facturas, gastos, clientes, cotCRM, solicitudes, actividades, resinas, papeles, empleados, setMod }) {
  const [chartMonths, setChartMonths] = useState(12);
  const [showProdDetail, setShowProdDetail] = useState(false);
  const [prodDetailView, setProdDetailView] = useState("mes"); // mes | semestre | año

  const {
    otsActivas, otsCompletadas, otsPendientes, otsPausadas, facturasTotal, facturasCobradas,
    facturasPendientes, gastosTotal, clientesTotal, cotTotal, solicitudesPend,
    prodByMonth, maxKg, revByMonth, maxRev, pipeline, prodDetailData
  } = useMemo(() => {
    const now = new Date();
    const mesActual = now.getMonth();
    const yearActual = now.getFullYear();
    const otsActivas = ots.filter(o => o.status === "en_proceso").length;
    const otsCompletadas = ots.filter(o => o.status === "completada").length;
    const otsPausadas = ots.filter(o => o.status === "pausada").length;
    const otsPendientes = ots.filter(o => o.status === "pendiente").length;
    const facturasTotal = facturas.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
    const facturasCobradas = facturas.filter(f => f.status === "cobrada").reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
    const facturasPendientes = facturasTotal - facturasCobradas;
    const gastosTotal = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
    const clientesTotal = clientes.length;
    const cotTotal = cotCRM.reduce((s, q) => s + (q.total || 0), 0);
    const solicitudesPend = solicitudes.filter(s => s.status === "pendiente").length;
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const prodByMonth = [];
    for (let i = chartMonths - 1; i >= 0; i--) {
      const d = new Date(yearActual, mesActual - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const otsM = ots.filter(o => { const od = new Date(o.fecha_creacion); return od.getMonth() === m && od.getFullYear() === y; });
      const bobM = bobinas.filter(b => { const bd = new Date(b.fecha_produccion); return bd.getMonth() === m && bd.getFullYear() === y; });
      const kgProd = bobM.reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
      prodByMonth.push({ label: `${meses[m]} ${String(y).slice(2)}`, ots: otsM.length, kg: kgProd });
    }
    const maxKg = Math.max(...prodByMonth.map(p => p.kg), 1);
    const revByMonth = [];
    for (let i = chartMonths - 1; i >= 0; i--) {
      const d = new Date(yearActual, mesActual - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const facM = facturas.filter(f => { const fd = new Date(f.fecha_emision); return fd.getMonth() === m && fd.getFullYear() === y; });
      const gasM = gastos.filter(g => { const gd = new Date(g.fecha); return gd.getMonth() === m && gd.getFullYear() === y; });
      const rev = facM.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
      const gas = gasM.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
      revByMonth.push({ label: `${meses[m]} ${String(y).slice(2)}`, rev, gas, util: rev - gas });
    }
    const maxRev = Math.max(...revByMonth.map(r => r.rev), 1);
    const pipeline = STAGES.map(st => ({ ...st, count: clientes.filter(c => c.etapa === st.id).length }));

    // Full production history for detail view
    const prodHistory = {};
    ots.filter(o => o.status === "completada").forEach(o => {
      const d = new Date(o.fecha_creacion || o.fecha_fin);
      if (isNaN(d)) return;
      const y = d.getFullYear(); const m = d.getMonth();
      const key = `${y}-${String(m+1).padStart(2,"0")}`;
      if (!prodHistory[key]) prodHistory[key] = { year: y, month: m, metros: 0, kg: 0, ots: 0, productos: {} };
      const metros = parseFloat(o.metros_producidos) || 0;
      prodHistory[key].metros += metros;
      prodHistory[key].ots += 1;
      // Get kg from bobinas for this OT
      const otBobs = bobinas.filter(b => b.ot_id === o.id || b.ot_codigo === o.codigo);
      prodHistory[key].kg += otBobs.reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
      // Track product types
      const prod = (o.producto || "Otro").substring(0, 30);
      prodHistory[key].productos[prod] = (prodHistory[key].productos[prod] || 0) + metros;
    });
    const prodDetailData = Object.entries(prodHistory)
      .sort(([a],[b]) => a.localeCompare(b))
      .map(([key, v]) => ({ key, ...v, topProducts: Object.entries(v.productos).sort((a,b) => b[1]-a[1]).slice(0,3) }));

    return { otsActivas, otsCompletadas, otsPendientes, otsPausadas, facturasTotal, facturasCobradas, facturasPendientes, gastosTotal, clientesTotal, cotTotal, solicitudesPend, prodByMonth, maxKg, revByMonth, maxRev, pipeline, prodDetailData };
  }, [ots, bobinas, facturas, gastos, clientes, cotCRM, solicitudes, chartMonths]);

  const Bar = ({ value, max, color, label, sub, onClick }) => (
    <div style={{ flex: 1, textAlign: "center", cursor: onClick ? "pointer" : "default" }} onClick={onClick}>
      <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 2px" }}>
        <div style={{ width: "100%", maxWidth: 32, background: `${color}30`, borderRadius: "4px 4px 0 0", height: `${Math.max((value / max) * 100, 4)}%`, position: "relative", transition: "height 0.5s" }}>
          <div style={{ position: "absolute", top: -18, width: "100%", textAlign: "center", fontSize: 10, fontWeight: 700, color }}>{value > 0 ? (value > 999 ? `${(value/1000).toFixed(0)}k` : Math.round(value)) : ""}</div>
          <div style={{ width: "100%", height: "100%", background: color, borderRadius: "4px 4px 0 0", opacity: 0.8 }} />
        </div>
      </div>
      <div style={{ fontSize: chartMonths > 6 ? 7 : 9, color: C.t3, marginTop: 4 }}>{label}</div>
      {sub && <div style={{ fontSize: 8, color: C.t3 }}>{sub}</div>}
    </div>
  );

  const MonthToggle = () => (
    <div style={{ display: "flex", gap: 4 }}>
      {[6, 12, 18].map(n => (
        <button key={n} onClick={() => setChartMonths(n)}
          style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, cursor: "pointer",
            border: `1px solid ${chartMonths === n ? C.acc : C.brd}`,
            background: chartMonths === n ? `${C.acc}20` : "transparent",
            color: chartMonths === n ? C.acc : C.t3
          }}>{n}m</button>
      ))}
    </div>
  );

  const ProdDetail = ({ data, view, setView }) => {
    const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
    const fmt = n => n > 999999 ? `${(n/1000000).toFixed(2)}M` : n > 999 ? `${(n/1000).toFixed(1)}k` : String(Math.round(n));

    // Aggregate by view
    let rows = [];
    if (view === "mes") {
      rows = data.map(d => ({
        label: `${meses[d.month]} ${d.year}`,
        metros: d.metros, kg: d.kg, ots: d.ots, topProducts: d.topProducts
      }));
    } else if (view === "semestre") {
      const sems = {};
      data.forEach(d => {
        const sem = d.month < 6 ? "H1" : "H2";
        const key = `${d.year}-${sem}`;
        if (!sems[key]) sems[key] = { label: `${sem} ${d.year}`, metros: 0, kg: 0, ots: 0, productos: {} };
        sems[key].metros += d.metros;
        sems[key].kg += d.kg;
        sems[key].ots += d.ots;
        Object.entries(d.productos).forEach(([p, m]) => { sems[key].productos[p] = (sems[key].productos[p] || 0) + m; });
      });
      rows = Object.values(sems).map(s => ({ ...s, topProducts: Object.entries(s.productos).sort((a,b) => b[1]-a[1]).slice(0,3) }));
    } else {
      const years = {};
      data.forEach(d => {
        const key = String(d.year);
        if (!years[key]) years[key] = { label: key, metros: 0, kg: 0, ots: 0, productos: {} };
        years[key].metros += d.metros;
        years[key].kg += d.kg;
        years[key].ots += d.ots;
        Object.entries(d.productos).forEach(([p, m]) => { years[key].productos[p] = (years[key].productos[p] || 0) + m; });
      });
      rows = Object.values(years).map(y => ({ ...y, topProducts: Object.entries(y.productos).sort((a,b) => b[1]-a[1]).slice(0,3) }));
    }

    const maxMetros = Math.max(...rows.map(r => r.metros), 1);
    const totalMetros = rows.reduce((s, r) => s + r.metros, 0);
    const totalOTs = rows.reduce((s, r) => s + r.ots, 0);

    return (
      <div style={{ marginTop: 12, borderTop: `1px solid ${C.brd}`, paddingTop: 10 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 10, justifyContent: "center" }}>
          {[["mes","Mes"],["semestre","Semestre"],["año","Año"]].map(([v, l]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ fontSize: 10, padding: "3px 12px", borderRadius: 12, cursor: "pointer",
                border: `1px solid ${view === v ? C.acc : C.brd}`,
                background: view === v ? `${C.acc}20` : "transparent",
                color: view === v ? C.acc : C.t3, fontWeight: view === v ? 700 : 400
              }}>{l}</button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.t3, textAlign: "center", marginBottom: 8 }}>
          Total: <b style={{ color: C.acc }}>{fmt(totalMetros)} metros</b> · {totalOTs} corridas
        </div>
        <div style={{ maxHeight: 350, overflowY: "auto" }}>
          {rows.map((r, i) => (
            <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${C.brd}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 65, fontSize: 11, fontWeight: 700, color: C.t1 }}>{r.label}</div>
                <div style={{ flex: 1, height: 18, background: C.bg, borderRadius: 8, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(r.metros / maxMetros) * 100}%`, background: `linear-gradient(90deg, ${C.acc}90, ${C.acc}50)`, borderRadius: 8, transition: "width 0.5s" }} />
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.acc, minWidth: 55, textAlign: "right" }}>{fmt(r.metros)}m</div>
              </div>
              <div style={{ display: "flex", gap: 12, paddingLeft: 65, fontSize: 9, color: C.t3 }}>
                <span>{r.ots} OTs</span>
                {r.kg > 0 && <span>{fmt(r.kg)} kg</span>}
              </div>
              {r.topProducts?.length > 0 && (
                <div style={{ paddingLeft: 65, marginTop: 3 }}>
                  {r.topProducts.map(([prod, mts], j) => (
                    <div key={j} style={{ fontSize: 8, color: C.t3, display: "flex", gap: 4, alignItems: "center" }}>
                      <div style={{ width: 4, height: 4, borderRadius: 2, background: [C.acc, C.grn, C.amb][j] || C.t3 }} />
                      <span style={{ flex: 1 }}>{prod}</span>
                      <span style={{ fontWeight: 600 }}>{fmt(mts)}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const totalRevAll = revByMonth.reduce((s, r) => s + r.rev, 0);
  const totalGasAll = revByMonth.reduce((s, r) => s + r.gas, 0);
  const totalUtilAll = totalRevAll - totalGasAll;

  return <>
    {/* KPI Cards — clickable */}
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
      <div onClick={() => setMod("produccion")} style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.acc}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.acc}40`, cursor: "pointer" }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>OTs Activas</div>
        <div style={{ fontSize: 28, fontWeight: 800, color: C.acc }}>{otsActivas}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>{otsPausadas > 0 ? `${otsPausadas} pausadas · ` : ''}{otsPendientes} pendientes · {otsCompletadas} completadas</div>
      </div>
      <div onClick={() => setMod("contabilidad")} style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.grn}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.grn}40`, cursor: "pointer" }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>Facturado</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.grn }}>${fmtI(facturasTotal)}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>Cobrado: ${fmtI(facturasCobradas)}</div>
      </div>
      <div onClick={() => setMod("contabilidad")} style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.amb}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.amb}40`, cursor: "pointer" }}>
        <div style={{ fontSize: 10, color: C.t3, textTransform: "uppercase" }}>Por Cobrar</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.amb }}>${fmtI(facturasPendientes)}</div>
        <div style={{ fontSize: 10, color: C.t2 }}>{facturas.filter(f => f.status !== "cobrada").length} facturas</div>
      </div>
      <div onClick={() => setMod("crm")} style={{ background: `linear-gradient(135deg, ${C.s2}, ${C.pur}15)`, borderRadius: 10, padding: 14, border: `1px solid ${C.pur}40`, cursor: "pointer" }}>
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
    <Sec t="Producción" ico="🏭" right={<MonthToggle />} ch={<>
      <div onClick={() => setShowProdDetail(p => !p)} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          {prodByMonth.map((p, i) => <Bar key={i} value={p.kg} max={maxKg} color={C.acc} label={p.label} sub={`${p.ots} OTs`} />)}
        </div>
        <div style={{ textAlign: "center", fontSize: 9, color: C.acc, marginTop: 6, opacity: 0.7 }}>{showProdDetail ? "▲ Cerrar detalle" : "▼ Tap para ver detalle completo"}</div>
      </div>
      {showProdDetail && <ProdDetail data={prodDetailData} view={prodDetailView} setView={setProdDetailView} />}
    </>} />
    {/* Revenue vs Expenses Chart */}
    <Sec t="Ventas vs Gastos" ico="💰" col={C.grn} right={<div style={{fontSize:10,color:C.t2}}>Utilidad: <b style={{color: totalUtilAll >= 0 ? C.grn : C.red}}>${fmtI(totalUtilAll)}</b></div>} ch={
      <div onClick={() => setMod("contabilidad")} style={{ cursor: "pointer" }}>
        <div style={{ display: "flex", gap: 2, alignItems: "flex-end" }}>
          {revByMonth.map((r, i) => (
            <div key={i} style={{ flex: 1, textAlign: "center" }}>
              <div style={{ height: 120, display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "0 2px", gap: 1 }}>
                <div style={{ width: "48%", maxWidth: 16, background: C.grn, borderRadius: "3px 3px 0 0", height: `${Math.max((r.rev / maxRev) * 100, 4)}%`, opacity: 0.7, transition: "height 0.5s", position: "relative" }}>
                  {r.rev > 0 && <div style={{ position: "absolute", top: -14, width: "200%", textAlign: "center", fontSize: 7, fontWeight: 700, color: C.grn }}>{r.rev > 999 ? `${(r.rev/1000).toFixed(0)}k` : Math.round(r.rev)}</div>}
                </div>
                <div style={{ width: "48%", maxWidth: 16, background: C.red, borderRadius: "3px 3px 0 0", height: `${Math.max((r.gas / maxRev) * 100, 2)}%`, opacity: 0.7, transition: "height 0.5s" }} />
              </div>
              <div style={{ fontSize: chartMonths > 6 ? 7 : 9, color: C.t3, marginTop: 4 }}>{r.label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 8, fontSize: 9 }}>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.grn, borderRadius: 2, marginRight: 4 }} />Ventas: ${fmtI(totalRevAll)}</span>
          <span><span style={{ display: "inline-block", width: 8, height: 8, background: C.red, borderRadius: 2, marginRight: 4 }} />Gastos: ${fmtI(totalGasAll)}</span>
        </div>
      </div>
    } />
    {/* Pipeline Funnel */}
    <Sec t="Pipeline CRM" ico="🎯" col={C.pur} ch={
      <div onClick={() => setMod("crm")} style={{ cursor: "pointer" }}>
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
    <Sec t="Inventario Rápido" ico="📦" ch={
      <div onClick={() => setMod("produccion")} style={{ cursor: "pointer" }}>
        <RR l="Resinas en almacén" v={`${resinas.length} lotes`} />
        <RR l="Papel/Bobinas MP" v={`${papeles.length} lotes`} />
        <RR l="Bobinas PT" v={`${bobinas.length} bobinas`} />
        <RR l="Empleados activos" v={`${empleados.length}`} />
      </div>
    } />
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
