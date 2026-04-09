import { useState, useMemo } from 'react';
import { C } from '../utils/constants';
import { fmtI, genId, today } from '../utils/helpers';
import { Inp, TxtInp, Sel, DateInp, F, R, Sec, Badge, Btn, Tab, Modal, Card } from '../components/ui';

const PO_STATUS = [
  { id: "borrador", l: "Borrador", ico: "📝", c: C.t3 },
  { id: "enviada", l: "Enviada", ico: "📤", c: C.acc },
  { id: "confirmada", l: "Confirmada", ico: "✅", c: C.grn },
  { id: "en_produccion", l: "En Producción", ico: "🏭", c: C.amb },
  { id: "entregada", l: "Entregada", ico: "📦", c: C.pur },
  { id: "facturada", l: "Facturada", ico: "💰", c: C.cyn },
  { id: "cancelada", l: "Cancelada", ico: "❌", c: C.red },
];

export default function OrdenesCompra({
  clientes, ots, pos, setPos, supabase,
  saving, setSaving, showToast, logActivity, currentUser,
  notifyTelegram,
}) {
  const [poTab, setPoTab] = useState("activas");
  const [showAddPO, setShowAddPO] = useState(false);
  const [showPODetail, setShowPODetail] = useState(null);
  const [editingPO, setEditingPO] = useState(false);

  const [newPO, setNewPO] = useState({
    cliente_id: "", contacto_nombre: "", contacto_email: "",
    fecha_entrega: "", dias_credito: "30", condiciones_pago: "30 días",
    moneda: "MXN", notas: "",
    items: [{ descripcion: "", producto: "", cantidad: "1000", unidad: "kg", precio_unitario: "0" }],
  });

  // Metrics
  const metrics = useMemo(() => {
    const activas = (pos || []).filter(p => !["facturada", "cancelada"].includes(p.status));
    const pendPago = (pos || []).filter(p => p.status === "entregada");
    const totalActivo = activas.reduce((s, p) => s + (parseFloat(p.total) || 0), 0);
    return { activas: activas.length, pendPago: pendPago.length, totalActivo };
  }, [pos]);

  const activePOs = useMemo(() =>
    (pos || []).filter(p => !["facturada", "cancelada"].includes(p.status))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  [pos]);

  const allPOs = useMemo(() =>
    (pos || []).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)),
  [pos]);

  const addPO = async () => {
    if (!newPO.cliente_id) { showToast("Selecciona un cliente", "error"); return; }
    setSaving(true);
    try {
      const cliente = clientes.find(c => c.id === newPO.cliente_id);
      const maxNum = (pos || []).reduce((mx, p) => {
        const n = parseInt(p.codigo?.replace("PO-", "")); return n > mx ? n : mx;
      }, 0);
      const codigo = `PO-${String(maxNum + 1).padStart(4, "0")}`;

      const items = newPO.items.filter(it => it.descripcion || it.producto).map((it, i) => ({
        ...it,
        cantidad: parseFloat(it.cantidad) || 0,
        precio_unitario: parseFloat(it.precio_unitario) || 0,
        orden: i,
      }));
      const subtotal = items.reduce((s, it) => s + (it.cantidad * it.precio_unitario), 0);
      const iva = subtotal * 0.16;
      const total = subtotal + iva;

      const poData = {
        codigo,
        cliente_id: newPO.cliente_id,
        cliente_nombre: cliente?.nombre || "",
        contacto_nombre: newPO.contacto_nombre || cliente?.contacto || "",
        contacto_email: newPO.contacto_email || cliente?.email || "",
        fecha_emision: today(),
        fecha_entrega: newPO.fecha_entrega || null,
        dias_credito: parseInt(newPO.dias_credito) || 30,
        condiciones_pago: newPO.condiciones_pago,
        moneda: newPO.moneda,
        notas: newPO.notas,
        subtotal, iva, total,
        status: "borrador",
        created_by: currentUser?.nombre || "Sistema",
      };

      const { data, error } = await supabase.from('ordenes_compra').insert(poData).select();
      if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }

      if (data?.[0]) {
        // Insert line items
        if (items.length) {
          await supabase.from('ordenes_compra_items').insert(
            items.map(it => ({ po_id: data[0].id, ...it }))
          );
        }
        // Save with items embedded for local state
        setPos(prev => [{ ...data[0], items }, ...(prev || [])]);
        showToast(`${codigo} creada — ${fmtMoney(total)}`);
        logActivity(`PO ${codigo} creada para ${cliente?.nombre} — ${fmtMoney(total)}`);
        notifyTelegram(`Nueva PO: *${codigo}*\nCliente: ${cliente?.nombre}\nTotal: ${fmtMoney(total)}\nCreada por: ${currentUser?.nombre}`, "production");
      }

      setShowAddPO(false);
      setNewPO({ cliente_id: "", contacto_nombre: "", contacto_email: "", fecha_entrega: "", dias_credito: "30", condiciones_pago: "30 días", moneda: "MXN", notas: "", items: [{ descripcion: "", producto: "", cantidad: "1000", unidad: "kg", precio_unitario: "0" }] });
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const updatePOStatus = async (poId, newStatus) => {
    setSaving(true);
    const po = (pos || []).find(p => p.id === poId);
    const { error } = await supabase.from('ordenes_compra').update({ status: newStatus }).eq('id', poId);
    if (error) { showToast("Error: " + error.message, "error"); setSaving(false); return; }
    setPos(prev => (prev || []).map(p => p.id === poId ? { ...p, status: newStatus } : p));
    const stg = PO_STATUS.find(s => s.id === newStatus);
    showToast(`${po?.codigo} → ${stg?.l}`);
    logActivity(`PO ${po?.codigo} cambiada a ${stg?.l}`);
    notifyTelegram(`PO *${po?.codigo}* → ${stg?.ico} ${stg?.l}`, "production");
    setSaving(false);
  };

  const fmtMoney = (n) => `$${(parseFloat(n) || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const fmtDate = (d) => d ? new Date(d + 'T00:00:00').toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '—';

  return <>
    <Tab tabs={[{ id: "activas", ico: "📋", l: "Activas" }, { id: "todas", ico: "📁", l: "Todas" }]} active={poTab} set={v => { setPoTab(v); setShowPODetail(null); }} />

    <div style={{ marginTop: 12 }}>
      {/* Metrics */}
      {!showPODetail && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
        <Card v={metrics.activas} l="POs Activas" c={C.acc} ico="📋" />
        <Card v={fmtMoney(metrics.totalActivo)} l="Total Activo" c={C.grn} ico="💰" />
        <Card v={metrics.pendPago} l="Pend. Pago" c={C.amb} ico="⏳" />
      </div>}

      {/* Action bar */}
      {!showPODetail && <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
        <Btn text="+ Orden de Compra" ico="🛒" sm color={C.grn} onClick={() => setShowAddPO(true)} />
      </div>}

      {/* PO List */}
      {!showPODetail && <>
        {(poTab === "activas" ? activePOs : allPOs).map(po => {
          const stg = PO_STATUS.find(s => s.id === po.status);
          return <div key={po.id} onClick={() => setShowPODetail(po.id)} style={{
            padding: 12, background: C.s2, borderRadius: 8, border: `1px solid ${stg?.c || C.brd}20`,
            marginBottom: 6, cursor: "pointer"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.acc, fontFamily: "monospace" }}>{po.codigo}</span>
                  <Badge text={stg?.l} color={stg?.c} />
                </div>
                <div style={{ fontSize: 12, color: C.t1, marginTop: 2 }}>{po.cliente_nombre}</div>
                <div style={{ fontSize: 10, color: C.t3 }}>{fmtDate(po.fecha_emision)}{po.fecha_entrega && ` → ${fmtDate(po.fecha_entrega)}`}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.grn, fontFamily: "monospace" }}>{fmtMoney(po.total)}</div>
                <div style={{ fontSize: 9, color: C.t3 }}>{po.condiciones_pago}</div>
              </div>
            </div>
          </div>;
        })}
        {(poTab === "activas" ? activePOs : allPOs).length === 0 &&
          <div style={{ textAlign: "center", padding: 30, color: C.t3 }}>🛒 Sin órdenes de compra</div>}
      </>}

      {/* PO Detail */}
      {showPODetail && (() => {
        const po = (pos || []).find(p => p.id === showPODetail);
        if (!po) return <div style={{ textAlign: "center", padding: 30, color: C.t3 }}>PO no encontrada</div>;
        const stg = PO_STATUS.find(s => s.id === po.status);
        const items = po.items || [];

        return <>
          <button onClick={() => setShowPODetail(null)} style={{ background: "transparent", border: "none", color: C.acc, cursor: "pointer", fontSize: 11, marginBottom: 8, padding: 0 }}>← Volver</button>

          <Sec t={`${po.codigo} — ${po.cliente_nombre}`} ico={stg?.ico || "📋"} col={stg?.c} right={
            <Badge text={stg?.l} color={stg?.c} />
          } ch={<>
            {/* Status flow buttons */}
            <div style={{ display: "flex", gap: 4, marginBottom: 12, flexWrap: "wrap" }}>
              {PO_STATUS.filter(s => s.id !== "cancelada").map(s =>
                <button key={s.id} onClick={() => updatePOStatus(po.id, s.id)} disabled={saving} style={{
                  padding: "4px 8px", borderRadius: 6, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  background: po.status === s.id ? s.c : "transparent",
                  color: po.status === s.id ? "#fff" : s.c,
                  border: `1px solid ${s.c}40`, opacity: saving ? 0.5 : 1
                }}>{s.ico} {s.l}</button>
              )}
            </div>

            {/* PO Info */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 11, marginBottom: 12 }}>
              <div><span style={{ color: C.t3 }}>Contacto:</span> {po.contacto_nombre || "—"}</div>
              <div><span style={{ color: C.t3 }}>Email:</span> {po.contacto_email || "—"}</div>
              <div><span style={{ color: C.t3 }}>Emisión:</span> {fmtDate(po.fecha_emision)}</div>
              <div><span style={{ color: C.t3 }}>Entrega:</span> {fmtDate(po.fecha_entrega)}</div>
              <div><span style={{ color: C.t3 }}>Crédito:</span> {po.dias_credito} días</div>
              <div><span style={{ color: C.t3 }}>Moneda:</span> {po.moneda}</div>
            </div>

            {/* Line Items */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, marginBottom: 6 }}>Productos:</div>
              {items.map((it, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 8px", background: C.bg, borderRadius: 6, marginBottom: 3, fontSize: 11 }}>
                  <div>
                    <span style={{ color: C.t1 }}>{it.descripcion || it.producto || `Item ${i + 1}`}</span>
                    <span style={{ color: C.t3, marginLeft: 8 }}>{it.cantidad} {it.unidad}</span>
                  </div>
                  <div style={{ fontFamily: "monospace", color: C.grn }}>
                    {fmtMoney((parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0))}
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div style={{ background: `${C.grn}10`, borderRadius: 8, padding: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2 }}>
                <span>Subtotal:</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(po.subtotal)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2 }}>
                <span>IVA (16%):</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(po.iva)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: C.grn, marginTop: 4 }}>
                <span>Total:</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(po.total)}</span>
              </div>
            </div>

            {po.notas && <div style={{ marginTop: 8, padding: 8, background: C.bg, borderRadius: 6, fontSize: 11, color: C.t2 }}>{po.notas}</div>}

            {/* Actions */}
            <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
              {po.status === "borrador" && <Btn text="📤 Enviar" color={C.acc} sm onClick={() => updatePOStatus(po.id, "enviada")} />}
              {po.status === "enviada" && <Btn text="✅ Confirmar" color={C.grn} sm onClick={() => updatePOStatus(po.id, "confirmada")} />}
              {po.status === "confirmada" && <Btn text="🏭 Producción" color={C.amb} sm onClick={() => updatePOStatus(po.id, "en_produccion")} />}
              {po.status === "en_produccion" && <Btn text="📦 Entregada" color={C.pur} sm onClick={() => updatePOStatus(po.id, "entregada")} />}
              {po.status === "entregada" && <Btn text="💰 Facturar" color={C.cyn} sm onClick={() => updatePOStatus(po.id, "facturada")} />}
              {po.status !== "cancelada" && po.status !== "facturada" &&
                <Btn text="❌ Cancelar" color={C.red} sm outline onClick={() => { if (confirm("¿Cancelar esta PO?")) updatePOStatus(po.id, "cancelada"); }} />}
            </div>

            <div style={{ marginTop: 8, fontSize: 9, color: C.t3 }}>
              Creada por {po.created_by} — {fmtDate(po.created_at?.split("T")[0])}
            </div>
          </>} />
        </>;
      })()}
    </div>

    {/* Add PO Modal */}
    {showAddPO && <Modal title="+ Orden de Compra" onClose={() => setShowAddPO(false)} ch={<>
      <R ch={<F l="Cliente *" w="100%" ch={<Sel v={newPO.cliente_id} set={v => {
        const cl = clientes.find(c => c.id === v);
        setNewPO(p => ({ ...p, cliente_id: v, contacto_nombre: cl?.contacto || "", contacto_email: cl?.email || "" }));
      }} opts={clientes.map(c => ({ v: c.id, l: c.nombre }))} ph="Seleccionar..." />} />} />

      <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={newPO.contacto_nombre} set={v => setNewPO(p => ({ ...p, contacto_nombre: v }))} />} /><F l="Email" w="48%" ch={<TxtInp v={newPO.contacto_email} set={v => setNewPO(p => ({ ...p, contacto_email: v }))} />} /></>} />

      <R ch={<><F l="Fecha Entrega" w="48%" ch={<DateInp v={newPO.fecha_entrega} set={v => setNewPO(p => ({ ...p, fecha_entrega: v }))} />} /><F l="Crédito" w="48%" ch={<Sel v={newPO.condiciones_pago} set={v => setNewPO(p => ({ ...p, condiciones_pago: v, dias_credito: v === "Anticipo 50%" ? "0" : v.replace(/[^0-9]/g, "") || "30" }))} opts={["Anticipo 50%", "30 días", "60 días", "90 días", "Contra entrega"]} />} /></>} />

      <div style={{ fontSize: 11, fontWeight: 700, color: C.t2, marginTop: 8, marginBottom: 6 }}>Productos:</div>
      {newPO.items.map((it, i) => {
        const sub = (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0);
        return <div key={i} style={{ marginBottom: 8, padding: 8, background: C.bg, borderRadius: 6 }}>
          <R ch={<F l="Descripción" w="100%" ch={<TxtInp v={it.descripcion} set={v => { const ni = [...newPO.items]; ni[i] = { ...ni[i], descripcion: v }; setNewPO(p => ({ ...p, items: ni })); }} ph="Ej: PEBD 15g sobre Bond 60g" />} />} />
          <R ch={<>
            <F l="Cantidad" w="30%" ch={<Inp v={it.cantidad} set={v => { const ni = [...newPO.items]; ni[i] = { ...ni[i], cantidad: v }; setNewPO(p => ({ ...p, items: ni })); }} />} />
            <F l="Unidad" w="20%" ch={<Sel v={it.unidad} set={v => { const ni = [...newPO.items]; ni[i] = { ...ni[i], unidad: v }; setNewPO(p => ({ ...p, items: ni })); }} opts={["kg", "m²", "m", "pza", "rollo"]} />} />
            <F l="Precio Unit." w="30%" ch={<Inp v={it.precio_unitario} set={v => { const ni = [...newPO.items]; ni[i] = { ...ni[i], precio_unitario: v }; setNewPO(p => ({ ...p, items: ni })); }} pre="$" />} />
          </>} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ textAlign: "right", fontSize: 11, color: C.grn, fontFamily: "monospace", fontWeight: 700, flex: 1 }}>= {fmtMoney(sub)}</div>
            {newPO.items.length > 1 && <button onClick={() => setNewPO(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} style={{ background: "transparent", border: "none", color: C.red, cursor: "pointer", fontSize: 14 }}>🗑️</button>}
          </div>
        </div>;
      })}
      <Btn text="+ Producto" sm outline color={C.acc} onClick={() => setNewPO(p => ({ ...p, items: [...p.items, { descripcion: "", producto: "", cantidad: "1000", unidad: "kg", precio_unitario: "0" }] }))} />

      <R ch={<F l="Notas" w="100%" ch={<TxtInp v={newPO.notas} set={v => setNewPO(p => ({ ...p, notas: v }))} ph="Instrucciones especiales, specs..." />} />} />

      {/* Totals */}
      {(() => {
        const sub = newPO.items.reduce((s, it) => s + (parseFloat(it.cantidad) || 0) * (parseFloat(it.precio_unitario) || 0), 0);
        const iva = sub * 0.16;
        return <div style={{ padding: 10, background: `${C.grn}10`, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2 }}>
            <span>Subtotal:</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(sub)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.t2 }}>
            <span>IVA (16%):</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(iva)}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 800, color: C.grn, marginTop: 4 }}>
            <span>Total:</span><span style={{ fontFamily: "monospace" }}>{fmtMoney(sub + iva)}</span>
          </div>
        </div>;
      })()}

      <Btn text={saving ? "Creando..." : "🛒 Crear Orden de Compra"} color={C.grn} full onClick={addPO} disabled={saving} />
    </>} />}
  </>;
}
