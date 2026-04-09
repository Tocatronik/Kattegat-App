import { useState, useMemo } from 'react';
import { C } from '../utils/constants';
import { fmt, fmtI, today } from '../utils/helpers';
import { Inp, TxtInp, Sel, DateInp, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

const MOV_TIPOS = [
  { id: "entrada", l: "Entrada", ico: "📥", c: C.grn },
  { id: "salida", l: "Salida", ico: "📤", c: C.red },
  { id: "ajuste", l: "Ajuste", ico: "🔧", c: C.amb },
  { id: "consumo", l: "Consumo", ico: "🏭", c: C.pur },
  { id: "devolucion", l: "Devolución", ico: "↩️", c: C.cyn },
];

const MAT_TIPOS = [
  { id: "resina", l: "Resina", ico: "🧪" },
  { id: "papel", l: "Papel", ico: "📜" },
  { id: "producto_terminado", l: "Producto Term.", ico: "📦" },
];

export default function Inventario({
  resinas, papeles, bobinas, supabase,
  saving, setSaving, showToast, logActivity, currentUser,
  notifyTelegram,
}) {
  const [invTab, setInvTab] = useState("stock");
  const [movimientos, setMovimientos] = useState([]);
  const [movsLoaded, setMovsLoaded] = useState(false);
  const [showAddMov, setShowAddMov] = useState(false);
  const [filterMat, setFilterMat] = useState("todos");
  const [filterTipo, setFilterTipo] = useState("todos");
  const [alertas, setAlertas] = useState([]);

  const [newMov, setNewMov] = useState({
    tipo: "entrada", material_tipo: "resina", material_id: "",
    cantidad: "", unidad: "kg", motivo: "",
  });

  // Load movimientos when tab switches
  const loadMovimientos = async () => {
    if (movsLoaded) return;
    const { data } = await supabase.from('movimientos_inventario')
      .select('*').order('created_at', { ascending: false }).limit(200);
    setMovimientos(data || []);
    setMovsLoaded(true);
  };

  const loadAlertas = async () => {
    const alerts = [];
    // Check resinas below minimum
    (resinas || []).forEach(r => {
      const stock = parseFloat(r.stock_kg || r.peso_kg) || 0;
      const min = parseFloat(r.stock_minimo) || 50;
      if (stock <= min) {
        alerts.push({
          tipo: "stock_bajo", material: "resina",
          nombre: r.nombre || r.tipo || r.codigo,
          stock, minimo: min, pct: min > 0 ? Math.round((stock / min) * 100) : 0,
        });
      }
    });
    // Check papeles below minimum
    (papeles || []).forEach(p => {
      const stock = parseFloat(p.stock_kg || p.peso_kg) || 0;
      const min = parseFloat(p.stock_minimo) || 100;
      if (stock <= min) {
        alerts.push({
          tipo: "stock_bajo", material: "papel",
          nombre: p.nombre || p.tipo || p.codigo,
          stock, minimo: min, pct: min > 0 ? Math.round((stock / min) * 100) : 0,
        });
      }
    });
    setAlertas(alerts);
  };

  // Metrics
  const metrics = useMemo(() => {
    const totalResinas = (resinas || []).length;
    const resinasKg = (resinas || []).reduce((s, r) => s + (parseFloat(r.stock_kg || r.peso_kg) || 0), 0);
    const totalPapeles = (papeles || []).length;
    const papelesKg = (papeles || []).reduce((s, p) => s + (parseFloat(p.stock_kg || p.peso_kg) || 0), 0);
    const totalBobinas = (bobinas || []).filter(b => b.status === "disponible" || !b.status).length;
    const bobinasKg = (bobinas || []).reduce((s, b) => s + (parseFloat(b.peso_kg) || 0), 0);
    const valorResinas = (resinas || []).reduce((s, r) => s + ((parseFloat(r.stock_kg || r.peso_kg) || 0) * (parseFloat(r.precio_kg) || 0)), 0);
    const valorPapeles = (papeles || []).reduce((s, p) => s + ((parseFloat(p.stock_kg || p.peso_kg) || 0) * (parseFloat(p.precio_kg) || 0)), 0);
    return { totalResinas, resinasKg, totalPapeles, papelesKg, totalBobinas, bobinasKg, valorResinas, valorPapeles, valorTotal: valorResinas + valorPapeles };
  }, [resinas, papeles, bobinas]);

  // Material options for the movement form
  const materialOpts = useMemo(() => {
    if (newMov.material_tipo === "resina") {
      return (resinas || []).map(r => ({ v: r.id, l: `${r.codigo || ''} ${r.nombre || r.tipo || ''} (${fmtI(r.stock_kg || r.peso_kg)}kg)` }));
    }
    if (newMov.material_tipo === "papel") {
      return (papeles || []).map(p => ({ v: p.id, l: `${p.codigo || ''} ${p.nombre || p.tipo || ''} (${fmtI(p.stock_kg || p.peso_kg)}kg)` }));
    }
    return (bobinas || []).map(b => ({ v: b.id, l: `${b.codigo || ''} (${fmtI(b.peso_kg)}kg)` }));
  }, [newMov.material_tipo, resinas, papeles, bobinas]);

  const getMaterialName = (mov) => {
    if (mov.material_nombre) return mov.material_nombre;
    if (mov.material_tipo === "resina") {
      const r = (resinas || []).find(x => x.id === mov.material_id);
      return r?.nombre || r?.tipo || r?.codigo || "Resina";
    }
    if (mov.material_tipo === "papel") {
      const p = (papeles || []).find(x => x.id === mov.material_id);
      return p?.nombre || p?.tipo || p?.codigo || "Papel";
    }
    const b = (bobinas || []).find(x => x.id === mov.material_id);
    return b?.codigo || "PT";
  };

  const addMovimiento = async () => {
    if (!newMov.material_id) { showToast("Selecciona un material", "error"); return; }
    if (!newMov.cantidad || parseFloat(newMov.cantidad) === 0) { showToast("Indica la cantidad", "error"); return; }
    setSaving(true);
    try {
      const mat = newMov.material_tipo === "resina"
        ? (resinas || []).find(r => r.id === newMov.material_id)
        : newMov.material_tipo === "papel"
          ? (papeles || []).find(p => p.id === newMov.material_id)
          : (bobinas || []).find(b => b.id === newMov.material_id);

      const nombre = mat?.nombre || mat?.tipo || mat?.codigo || "";
      let cantidad = parseFloat(newMov.cantidad) || 0;
      // Salida y consumo son negativos
      if (["salida", "consumo"].includes(newMov.tipo)) cantidad = -Math.abs(cantidad);
      // Devolución es positiva
      if (newMov.tipo === "devolucion") cantidad = Math.abs(cantidad);

      const movData = {
        tipo: newMov.tipo,
        material_tipo: newMov.material_tipo,
        material_id: newMov.material_id,
        material_nombre: nombre,
        cantidad,
        unidad: newMov.unidad,
        motivo: newMov.motivo || null,
        usuario: currentUser?.nombre || "Sistema",
      };

      const { data, error } = await supabase.from('movimientos_inventario').insert(movData).select();
      if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }

      // Update stock in the material table
      if (newMov.material_tipo === "resina" && mat) {
        const currentStock = parseFloat(mat.stock_kg || mat.peso_kg) || 0;
        const newStock = Math.max(0, currentStock + cantidad);
        await supabase.from('resinas').update({ stock_kg: newStock }).eq('id', mat.id);
      }
      if (newMov.material_tipo === "papel" && mat) {
        const currentStock = parseFloat(mat.stock_kg || mat.peso_kg) || 0;
        const newStock = Math.max(0, currentStock + cantidad);
        await supabase.from('papel_bobinas').update({ stock_kg: newStock }).eq('id', mat.id);
      }

      if (data?.[0]) setMovimientos(prev => [data[0], ...prev]);

      const tipoInfo = MOV_TIPOS.find(t => t.id === newMov.tipo);
      showToast(`${tipoInfo?.ico} ${tipoInfo?.l}: ${Math.abs(cantidad)} ${newMov.unidad} de ${nombre}`);
      logActivity(`Movimiento ${newMov.tipo}: ${Math.abs(cantidad)} ${newMov.unidad} de ${nombre} — ${newMov.motivo || "sin motivo"}`);

      // Alert if stock is low after movement
      if (["salida", "consumo"].includes(newMov.tipo) && mat) {
        const stock = (parseFloat(mat.stock_kg || mat.peso_kg) || 0) + cantidad;
        const min = parseFloat(mat.stock_minimo) || 50;
        if (stock <= min) {
          notifyTelegram(`⚠️ *ALERTA STOCK BAJO*\n${nombre}: ${fmtI(stock)} ${newMov.unidad} (mínimo: ${fmtI(min)})`, "production");
        }
      }

      setShowAddMov(false);
      setNewMov({ tipo: "entrada", material_tipo: "resina", material_id: "", cantidad: "", unidad: "kg", motivo: "" });
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const fmtMoney = (n) => `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

  return <>
    <Tab tabs={[
      { id: "stock", ico: "📦", l: "Stock" },
      { id: "movimientos", ico: "📊", l: "Movimientos" },
      { id: "alertas", ico: "🔔", l: `Alertas${alertas.length ? ` (${alertas.length})` : ''}` },
    ]} active={invTab} set={v => {
      setInvTab(v);
      if (v === "movimientos") loadMovimientos();
      if (v === "alertas") loadAlertas();
    }} />

    <div style={{ marginTop: 12 }}>
      {/* ═══ STOCK TAB ═══ */}
      {invTab === "stock" && <>
        {/* Overview metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
          <Card v={fmtI(metrics.resinasKg)} l="Resinas" s={`${metrics.totalResinas} lotes`} c={C.acc} ico="🧪" />
          <Card v={fmtI(metrics.papelesKg)} l="Papeles" s={`${metrics.totalPapeles} bobinas`} c={C.pur} ico="📜" />
          <Card v={fmtMoney(metrics.valorTotal)} l="Valor Total" s="inventario" c={C.grn} ico="💰" />
        </div>

        {/* Action bar */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Sel v={filterMat} set={setFilterMat} opts={[{ v: "todos", l: "Todos" }, { v: "resinas", l: "🧪 Resinas" }, { v: "papeles", l: "📜 Papeles" }, { v: "pt", l: "📦 Producto Term." }]} />
          <Btn text="+ Movimiento" ico="📊" sm color={C.grn} onClick={() => setShowAddMov(true)} />
        </div>

        {/* Resinas List */}
        {(filterMat === "todos" || filterMat === "resinas") && <>
          <Sec t="Resinas" ico="🧪" col={C.acc} right={<Badge text={`${metrics.totalResinas} lotes`} color={C.acc} />} ch={
            (resinas || []).length === 0
              ? <div style={{ textAlign: "center", padding: 20, color: C.t3, fontSize: 11 }}>Sin resinas registradas</div>
              : (resinas || []).map(r => {
                const stock = parseFloat(r.stock_kg || r.peso_kg) || 0;
                const min = parseFloat(r.stock_minimo) || 50;
                const pct = min > 0 ? Math.min(100, Math.round((stock / min) * 100)) : 100;
                const isLow = stock <= min;
                return <div key={r.id} style={{
                  padding: 10, background: C.bg, borderRadius: 8, marginBottom: 4,
                  border: `1px solid ${isLow ? C.red + '40' : C.brd}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{r.nombre || r.tipo || r.codigo}</div>
                      <div style={{ fontSize: 10, color: C.t3 }}>{r.proveedor_nombre || r.proveedor || '—'} {r.folio_packing && `• ${r.folio_packing}`}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: isLow ? C.red : C.grn }}>
                        {fmtI(stock)} <span style={{ fontSize: 10, fontWeight: 400 }}>kg</span>
                      </div>
                      {r.precio_kg && <div style={{ fontSize: 9, color: C.t3 }}>${fmt(r.precio_kg)}/kg</div>}
                    </div>
                  </div>
                  {/* Stock bar */}
                  <div style={{ marginTop: 6, height: 4, background: C.s3, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: isLow ? C.red : pct > 200 ? C.grn : C.acc, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                  {isLow && <div style={{ fontSize: 9, color: C.red, marginTop: 2 }}>⚠️ Bajo mínimo ({fmtI(min)} kg)</div>}
                </div>;
              })
          } />
        </>}

        {/* Papeles List */}
        {(filterMat === "todos" || filterMat === "papeles") && <>
          <Sec t="Papeles" ico="📜" col={C.pur} right={<Badge text={`${metrics.totalPapeles} bobinas`} color={C.pur} />} ch={
            (papeles || []).length === 0
              ? <div style={{ textAlign: "center", padding: 20, color: C.t3, fontSize: 11 }}>Sin papeles registrados</div>
              : (papeles || []).map(p => {
                const stock = parseFloat(p.stock_kg || p.peso_kg) || 0;
                const min = parseFloat(p.stock_minimo) || 100;
                const pct = min > 0 ? Math.min(100, Math.round((stock / min) * 100)) : 100;
                const isLow = stock <= min;
                return <div key={p.id} style={{
                  padding: 10, background: C.bg, borderRadius: 8, marginBottom: 4,
                  border: `1px solid ${isLow ? C.red + '40' : C.brd}`,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: C.t1 }}>{p.nombre || p.tipo || p.codigo}</div>
                      <div style={{ fontSize: 10, color: C.t3 }}>{p.proveedor || '—'} • {p.gramaje || '?'}g {p.ancho_cm && `• ${p.ancho_cm}cm`}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace", color: isLow ? C.red : C.grn }}>
                        {fmtI(stock)} <span style={{ fontSize: 10, fontWeight: 400 }}>kg</span>
                      </div>
                      {p.precio_kg && <div style={{ fontSize: 9, color: C.t3 }}>${fmt(p.precio_kg)}/kg</div>}
                    </div>
                  </div>
                  <div style={{ marginTop: 6, height: 4, background: C.s3, borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ width: `${Math.min(pct, 100)}%`, height: "100%", background: isLow ? C.red : pct > 200 ? C.grn : C.pur, borderRadius: 2, transition: "width 0.3s" }} />
                  </div>
                  {isLow && <div style={{ fontSize: 9, color: C.red, marginTop: 2 }}>⚠️ Bajo mínimo ({fmtI(min)} kg)</div>}
                </div>;
              })
          } />
        </>}

        {/* Producto Terminado */}
        {(filterMat === "todos" || filterMat === "pt") && <>
          <Sec t="Producto Terminado" ico="📦" col={C.cyn} right={<Badge text={`${metrics.totalBobinas} bobinas`} color={C.cyn} />} ch={
            (bobinas || []).length === 0
              ? <div style={{ textAlign: "center", padding: 20, color: C.t3, fontSize: 11 }}>Sin producto terminado</div>
              : (bobinas || []).slice(0, 20).map(b => (
                <div key={b.id} style={{ padding: 8, background: C.bg, borderRadius: 6, marginBottom: 3, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.acc, fontFamily: "monospace" }}>{b.codigo}</span>
                    <span style={{ fontSize: 10, color: C.t3, marginLeft: 6 }}>{b.ancho_mm}mm × {b.metros_lineales}m</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: "monospace", color: C.cyn }}>{fmtI(b.peso_kg)} kg</div>
                </div>
              ))
          } />
        </>}
      </>}

      {/* ═══ MOVIMIENTOS TAB ═══ */}
      {invTab === "movimientos" && <>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <Sel v={filterTipo} set={setFilterTipo} opts={[{ v: "todos", l: "Todos" }, ...MOV_TIPOS.map(t => ({ v: t.id, l: `${t.ico} ${t.l}` }))]} />
          <Btn text="+ Movimiento" ico="📊" sm color={C.grn} onClick={() => setShowAddMov(true)} />
        </div>

        {/* Movements timeline */}
        {(movimientos || [])
          .filter(m => filterTipo === "todos" || m.tipo === filterTipo)
          .map(mov => {
            const tipoInfo = MOV_TIPOS.find(t => t.id === mov.tipo);
            const matInfo = MAT_TIPOS.find(t => t.id === mov.material_tipo);
            const isPositive = parseFloat(mov.cantidad) >= 0;
            return <div key={mov.id} style={{
              padding: 10, background: C.s2, borderRadius: 8, marginBottom: 4,
              borderLeft: `3px solid ${tipoInfo?.c || C.brd}`,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                    <Badge text={`${tipoInfo?.ico || ''} ${tipoInfo?.l || mov.tipo}`} color={tipoInfo?.c || C.t3} />
                    <span style={{ fontSize: 10, color: C.t3 }}>{matInfo?.ico} {matInfo?.l}</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.t1 }}>{getMaterialName(mov)}</div>
                  {mov.motivo && <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}>{mov.motivo}</div>}
                  <div style={{ fontSize: 9, color: C.t3, marginTop: 2 }}>{mov.usuario} • {fmtDate(mov.created_at)}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{
                    fontSize: 16, fontWeight: 800, fontFamily: "monospace",
                    color: isPositive ? C.grn : C.red,
                  }}>
                    {isPositive ? "+" : ""}{fmtI(mov.cantidad)} <span style={{ fontSize: 10, fontWeight: 400 }}>{mov.unidad}</span>
                  </div>
                </div>
              </div>
            </div>;
          })
        }
        {movimientos.length === 0 && <div style={{ textAlign: "center", padding: 30, color: C.t3 }}>📊 Sin movimientos registrados</div>}
      </>}

      {/* ═══ ALERTAS TAB ═══ */}
      {invTab === "alertas" && <>
        {alertas.length === 0 && <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>✅</div>
          <div style={{ fontSize: 13 }}>Sin alertas — todo en orden</div>
        </div>}

        {alertas.map((a, i) => (
          <div key={i} style={{
            padding: 12, background: `${C.red}10`, borderRadius: 8, marginBottom: 6,
            border: `1px solid ${C.red}30`,
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.red }}>⚠️ Stock bajo: {a.nombre}</div>
                <div style={{ fontSize: 11, color: C.t2, marginTop: 2 }}>
                  {a.material === "resina" ? "🧪 Resina" : "📜 Papel"} — {fmtI(a.stock)} kg de {fmtI(a.minimo)} kg mínimo
                </div>
              </div>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, fontFamily: "monospace", color: a.pct <= 25 ? C.red : C.amb }}>{a.pct}%</div>
              </div>
            </div>
            {/* Stock bar */}
            <div style={{ marginTop: 6, height: 6, background: C.s3, borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${a.pct}%`, height: "100%", background: a.pct <= 25 ? C.red : C.amb, borderRadius: 3 }} />
            </div>
          </div>
        ))}

        {alertas.length > 0 && <div style={{ marginTop: 12 }}>
          <Btn text="📲 Enviar alertas por Telegram" color={C.amb} full onClick={() => {
            const msg = alertas.map(a => `⚠️ *${a.nombre}*: ${fmtI(a.stock)}kg / ${fmtI(a.minimo)}kg mínimo (${a.pct}%)`).join("\n");
            notifyTelegram(`🔔 *ALERTAS DE INVENTARIO*\n\n${msg}`, "production");
            showToast("Alertas enviadas por Telegram");
          }} />
        </div>}
      </>}
    </div>

    {/* Add Movement Modal */}
    {showAddMov && <Modal title="+ Registrar Movimiento" onClose={() => setShowAddMov(false)} ch={<>
      <R ch={<F l="Tipo de Movimiento *" w="100%" ch={
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {MOV_TIPOS.map(t => (
            <button key={t.id} onClick={() => setNewMov(p => ({ ...p, tipo: t.id }))} style={{
              padding: "6px 10px", borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: "pointer",
              background: newMov.tipo === t.id ? t.c : "transparent",
              color: newMov.tipo === t.id ? "#fff" : t.c,
              border: `1px solid ${t.c}40`,
            }}>{t.ico} {t.l}</button>
          ))}
        </div>
      } />} />

      <R ch={<F l="Tipo de Material *" w="100%" ch={
        <Sel v={newMov.material_tipo} set={v => setNewMov(p => ({ ...p, material_tipo: v, material_id: "" }))}
          opts={MAT_TIPOS.map(t => ({ v: t.id, l: `${t.ico} ${t.l}` }))} />
      } />} />

      <R ch={<F l="Material *" w="100%" ch={
        <Sel v={newMov.material_id} set={v => setNewMov(p => ({ ...p, material_id: v }))}
          opts={materialOpts} ph="Seleccionar..." />
      } />} />

      <R ch={<>
        <F l="Cantidad" w="60%" ch={<Inp v={newMov.cantidad} set={v => setNewMov(p => ({ ...p, cantidad: v }))} ph="0" />} />
        <F l="Unidad" w="35%" ch={<Sel v={newMov.unidad} set={v => setNewMov(p => ({ ...p, unidad: v }))} opts={["kg", "m²", "m", "pza", "rollo"]} />} />
      </>} />

      <R ch={<F l="Motivo / Referencia" w="100%" ch={
        <TxtInp v={newMov.motivo} set={v => setNewMov(p => ({ ...p, motivo: v }))} ph="Ej: OT-023 producción, Ajuste inventario físico..." />
      } />} />

      {/* Preview */}
      {newMov.material_id && newMov.cantidad && <div style={{ padding: 10, background: `${MOV_TIPOS.find(t => t.id === newMov.tipo)?.c || C.acc}10`, borderRadius: 8, marginBottom: 10, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Vista previa:</div>
        <div style={{ fontSize: 14, fontWeight: 700, color: ["salida", "consumo"].includes(newMov.tipo) ? C.red : C.grn }}>
          {["salida", "consumo"].includes(newMov.tipo) ? "−" : "+"}{newMov.cantidad} {newMov.unidad}
        </div>
      </div>}

      <Btn text={saving ? "Registrando..." : `${MOV_TIPOS.find(t => t.id === newMov.tipo)?.ico} Registrar Movimiento`}
        color={MOV_TIPOS.find(t => t.id === newMov.tipo)?.c || C.grn} full onClick={addMovimiento} disabled={saving} />
    </>} />}
  </>;
}
