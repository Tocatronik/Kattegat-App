import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase";
import { jsPDF } from "jspdf";

// ─── DESIGN SYSTEM ───
const C = {
  bg: "#0B0F1A", s1: "#111827", s2: "#1A2236", s3: "#232D45",
  brd: "#2A3550", acc: "#3B82F6", grn: "#10B981",
  amb: "#F59E0B", red: "#EF4444", pur: "#8B5CF6",
  cyn: "#06B6D4", pnk: "#EC4899",
  t1: "#F1F5F9", t2: "#94A3B8", t3: "#64748B",
};
const genId = () => Math.random().toString(36).substring(2, 10);

// ─── PIPELINE STAGES ───
const STAGES = [
  { id: "lead", l: "Lead", ico: "🎯", c: C.t3 },
  { id: "contactado", l: "Contactado", ico: "📞", c: C.acc },
  { id: "cotizado", l: "Cotizado", ico: "📋", c: C.amb },
  { id: "negociacion", l: "Negociación", ico: "🤝", c: C.pur },
  { id: "ganado", l: "Ganado", ico: "✅", c: C.grn },
  { id: "perdido", l: "Perdido", ico: "❌", c: C.red },
];
const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }) : "0.00";
const fmtI = (n) => n != null && !isNaN(n) ? Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 }) : "0";
const today = () => new Date().toISOString().split("T")[0];
const daysDiff = (d1, d2) => Math.ceil((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24));

// ─── COMPONENTS ───
const Inp = ({ v, set, ph = "", pre, suf, w = "100%", type = "num" }) => (
  <div style={{ display: "flex", alignItems: "center", background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, overflow: "hidden", width: w }}>
    {pre && <span style={{ padding: "0 8px", fontSize: 11, color: C.t3 }}>{pre}</span>}
    <input value={v} onChange={e => set(type === "num" ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)} placeholder={ph}
      style={{ flex: 1, background: "transparent", border: "none", color: C.t1, padding: "8px", fontSize: 13, outline: "none", fontFamily: "monospace", minWidth: 0 }} />
    {suf && <span style={{ padding: "0 8px", fontSize: 10, color: C.t3 }}>{suf}</span>}
  </div>
);
const TxtInp = ({ v, set, ph, w = "100%" }) => (
  <input value={v} onChange={e => set(e.target.value)} placeholder={ph}
    style={{ width: w, background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "8px", fontSize: 13, outline: "none" }} />
);
const DateInp = ({ v, set, w = "100%" }) => (
  <input type="date" value={v} onChange={e => set(e.target.value)}
    style={{ width: w, background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "8px", fontSize: 13, outline: "none" }} />
);
const Sel = ({ v, set, opts, w = "100%" }) => (
  <select value={v} onChange={e => set(e.target.value)}
    style={{ width: w, background: C.bg, border: `1px solid ${C.brd}`, borderRadius: 6, color: C.t1, padding: "8px", fontSize: 13, outline: "none" }}>
    {opts.map(o => <option key={typeof o === "string" ? o : o.v} value={typeof o === "string" ? o : o.v}>{typeof o === "string" ? o : o.l}</option>)}
  </select>
);
const F = ({ l, ch, u, w = "100%", h }) => (
  <div style={{ width: w, minWidth: 0 }}>
    <div style={{ fontSize: 10, color: C.t3, marginBottom: 3, textTransform: "uppercase" }}>{l} {u && <span style={{ color: C.acc, fontSize: 9 }}>({u})</span>}</div>
    {ch}
    {h && <div style={{ fontSize: 9, color: C.t3, marginTop: 2, fontStyle: "italic" }}>{h}</div>}
  </div>
);
const R = ({ ch, gap = 10 }) => <div style={{ display: "flex", gap, marginBottom: 10, flexWrap: "wrap" }}>{ch}</div>;
const RR = ({ l, v, u = "", b, c, sm }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: sm ? "2px 0" : "4px 0" }}>
    <span style={{ fontSize: sm ? 10 : 11, color: b ? C.t1 : C.t2 }}>{l}</span>
    <span style={{ fontSize: sm ? 11 : 13, fontWeight: b ? 700 : 400, color: c || (b ? C.acc : C.t1), fontFamily: "monospace" }}>
      {typeof v === "number" ? `$${fmt(v)}` : v} {u && <span style={{ fontSize: 9, color: C.t3 }}>{u}</span>}
    </span>
  </div>
);
const Sec = ({ t, ico, ch, col, right }) => (
  <div style={{ background: C.s2, borderRadius: 10, border: `1px solid ${col || C.brd}`, overflow: "hidden", marginBottom: 12 }}>
    <div style={{ padding: "10px 14px", borderBottom: `1px solid ${col || C.brd}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 16 }}>{ico}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.t1, textTransform: "uppercase" }}>{t}</span>
      </div>
      {right}
    </div>
    <div style={{ padding: 14 }}>{ch}</div>
  </div>
);
const Badge = ({ text, color }) => (
  <span style={{ fontSize: 9, padding: "2px 8px", borderRadius: 10, background: `${color}20`, color, fontWeight: 600, textTransform: "uppercase" }}>{text}</span>
);
const Btn = ({ text, ico, onClick, color = C.acc, sm, full, outline, disabled }) => (
  <button onClick={onClick} disabled={disabled} style={{
    background: outline ? "transparent" : color, color: outline ? color : "#fff",
    border: outline ? `1px solid ${color}` : "none", borderRadius: 6,
    padding: sm ? "5px 10px" : "8px 16px", fontSize: sm ? 11 : 12, fontWeight: 600,
    cursor: disabled ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 6,
    width: full ? "100%" : "auto", justifyContent: "center", opacity: disabled ? 0.5 : 1,
  }}>{ico && <span>{ico}</span>}{text}</button>
);
const Tab = ({ tabs, active, set }) => (
  <div style={{ display: "flex", gap: 2, background: C.s1, borderRadius: 8, padding: 3, overflowX: "auto" }}>
    {tabs.map(t => (
      <button key={t.id} onClick={() => set(t.id)} style={{
        flex: "0 0 auto", padding: "8px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 600,
        background: active === t.id ? C.acc : "transparent", color: active === t.id ? "#fff" : C.t3,
        display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
      }}><span style={{ fontSize: 13 }}>{t.ico}</span><span>{t.l}</span></button>
    ))}
  </div>
);
const Modal = ({ title, onClose, ch }) => (
  <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }} onClick={onClose}>
    <div style={{ background: C.s2, borderRadius: 12, border: `1px solid ${C.brd}`, width: "100%", maxWidth: 500, maxHeight: "90vh", overflow: "auto" }} onClick={e => e.stopPropagation()}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, background: C.s2 }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.t1 }}>{title}</span>
        <button onClick={onClose} style={{ background: "none", border: "none", color: C.t3, fontSize: 18, cursor: "pointer" }}>✕</button>
      </div>
      <div style={{ padding: 16 }}>{ch}</div>
    </div>
  </div>
);
const Card = ({ v, l, s, c, ico }) => (
  <div style={{ padding: 12, borderRadius: 8, background: `${c}08`, border: `1px solid ${c}20` }}>
    <div style={{ fontSize: 14, marginBottom: 4 }}>{ico}</div>
    <div style={{ fontSize: 18, fontWeight: 800, color: c, fontFamily: "monospace" }}>{v}</div>
    <div style={{ fontSize: 10, color: C.t2 }}>{l}</div>
    {s && <div style={{ fontSize: 9, color: C.t3 }}>{s}</div>}
  </div>
);
const Loading = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
    <div style={{ width: 30, height: 30, border: `3px solid ${C.brd}`, borderTopColor: C.acc, borderRadius: "50%", animation: "spin 1s linear infinite" }} />
    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
  </div>
);

// ─── NÓMINA CALC ───
const calcNomina = (sueldoNeto) => {
  const sn = parseFloat(sueldoNeto) || 0;
  const factorISR = 0.88;
  const sueldoBruto = sn / factorISR;
  const isr = sueldoBruto - sn;
  const sbc = sueldoBruto * 1.0493;
  const imssPatronal = sbc * 0.267;
  const rcv = sbc * 0.0575;
  const infonavit = sbc * 0.05;
  const isn = sueldoBruto * 0.03;
  const costoTotal = sueldoBruto + imssPatronal + rcv + infonavit + isn;
  const aguinaldo = sueldoBruto * 15 / 365;
  const primaVac = (sueldoBruto * 12 / 365) * 0.25;
  const provMensual = aguinaldo + primaVac;
  const costoConProv = costoTotal + provMensual;
  return { sn, sueldoBruto, isr, imssPatronal, rcv, infonavit, isn, costoTotal, aguinaldo, primaVac, provMensual, costoConProv };
};

// ═══════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════
export default function App() {
  const [loading, setLoading] = useState(true);
  const [mod, setMod] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState(null);

  // CRM states
  const [clientes, setClientes] = useState([]);
  const [cotCRM, setCotCRM] = useState([]);
  const [actividades, setActividades] = useState([]);
  const [crmTab, setCrmTab] = useState("pipeline");
  const [showClienteDetail, setShowClienteDetail] = useState(null);
  const [showAddCliente, setShowAddCliente] = useState(false);
  const [showAddCotCRM, setShowAddCotCRM] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre:"", contacto:"", email:"", telefono:"", ciudad:"", etapa:"lead", notas:"", tons_potenciales:"0" });
  const [newCotCRM, setNewCotCRM] = useState({ cliente_id:"", items:[{producto:"PE 60/15",cantidad:"1000",precio_kg:"39"}], pago:"90 días", notas:"" });
  const [editingCliente, setEditingCliente] = useState(false);
  const [editClienteData, setEditClienteData] = useState({});
  const [actLogFilter, setActLogFilter] = useState({ buscar: "", cliente: "", fecha: "" });
  const [editCot, setEditCot] = useState(null); // cotización en edición

  // Solicitudes de corrección
  const [solicitudes, setSolicitudes] = useState([]);
  const [showSolicitud, setShowSolicitud] = useState(null); // { tipo, id, registro }
  const [solicitudMotivo, setSolicitudMotivo] = useState("");

  const showToast = useCallback((msg, type="ok") => { setToast({msg,type}); setTimeout(()=>setToast(null), 3000); }, []);
  const logActivity = useCallback(async (texto, clienteId=null) => {
    const act = { texto, cliente_id: clienteId, fecha: new Date().toISOString(), usuario: currentUser?.nombre||"Sistema" };
    setActividades(prev => [{...act, id: genId()}, ...prev].slice(0, 200));
    try { await supabase.from('actividades').insert(act); } catch {}
  }, [currentUser]);

  // Data states
  const [resinas, setResinas] = useState([]);
  const [papeles, setPapeles] = useState([]);
  const [ots, setOts] = useState([]);
  const [bobinas, setBobinas] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [facturas, setFacturas] = useState([]);
  const [gastos, setGastos] = useState([]);
  const [config, setConfig] = useState({ overhead: {} });

  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing] = useState(false);

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh when tab becomes visible (solves phone→desktop sync)
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') { loadData(); } };
    document.addEventListener('visibilitychange', handleVisibility);
    // Also auto-refresh every 2 minutes
    const interval = setInterval(() => { if (document.visibilityState === 'visible') loadData(); }, 120000);
    return () => { document.removeEventListener('visibilitychange', handleVisibility); clearInterval(interval); };
  }, []);

  const loadData = async () => {
    if (!loading) setSyncing(true); else setLoading(true);
    try {
      const [usersRes, resinasRes, papelesRes, otsRes, bobinasRes, empleadosRes, facturasRes, gastosRes, configRes] = await Promise.all([
        supabase.from('usuarios').select('*').eq('activo', true),
        supabase.from('resinas').select('*').order('fecha_entrada', { ascending: false }),
        supabase.from('papel_bobinas').select('*').order('fecha_entrada', { ascending: false }),
        supabase.from('ordenes_trabajo').select('*').order('fecha_creacion', { ascending: false }),
        supabase.from('bobinas_pt').select('*').order('fecha_produccion', { ascending: false }),
        supabase.from('empleados').select('*').eq('activo', true),
        supabase.from('facturas').select('*').order('fecha_emision', { ascending: false }),
        supabase.from('gastos').select('*').order('fecha', { ascending: false }),
        supabase.from('configuracion').select('*'),
      ]);

      setUsers(usersRes.data || []);
      setResinas(resinasRes.data || []);
      setPapeles(papelesRes.data || []);
      setOts(otsRes.data || []);
      setBobinas(bobinasRes.data || []);
      setEmpleados(empleadosRes.data || []);
      setFacturas(facturasRes.data || []);
      setGastos(gastosRes.data || []);
      
      const ohConfig = configRes.data?.find(c => c.clave === 'overhead');
      if (ohConfig) setConfig({ overhead: ohConfig.valor });

      // Set default user
      const defaultUser = usersRes.data?.find(u => u.rol === 'admin') || usersRes.data?.[0];
      setCurrentUser(defaultUser);

      // Load CRM data (graceful fail if tables don't exist yet)
      try { const r = await supabase.from('clientes').select('*').order('created_at',{ascending:false}); if(r.data) setClientes(r.data); } catch {}
      try { const r = await supabase.from('cotizaciones_crm').select('*').order('fecha',{ascending:false}); if(r.data) setCotCRM(r.data); } catch {}
      try { const r = await supabase.from('actividades').select('*').order('fecha',{ascending:false}).limit(200); if(r.data) setActividades(r.data); } catch {}
      try { const r = await supabase.from('solicitudes_correccion').select('*').order('created_at',{ascending:false}); if(r.data) setSolicitudes(r.data); } catch {}
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
    setSyncing(false);
    setLastSync(new Date().toLocaleTimeString("es-MX"));
  };

  const user = currentUser || { nombre: 'Usuario', rol: 'operador' };
  const isAdmin = user.rol === 'admin';

  const modules = [
    { id: "dashboard", l: "Dashboard", ico: "📈", admin: true },
    { id: "produccion", l: "Producción", ico: "🏭", admin: false },
    { id: "cotizador", l: "Cotizador", ico: "⚖️", admin: true },
    { id: "crm", l: "CRM", ico: "🎯", admin: true },
    { id: "solicitudes", l: "Solicitudes", ico: "📩", admin: true },
    { id: "nominas", l: "Nóminas", ico: "👥", admin: true },
    { id: "contabilidad", l: "Contabilidad", ico: "📊", admin: true },
    { id: "actividad", l: "Log", ico: "📝", admin: true },
  ];
  const accessibleMods = modules.filter(m => isAdmin || !m.admin);

  // ═══════════════════════════════════════════
  // PRODUCTION TABS & STATE
  // ═══════════════════════════════════════════
  const [prodTab, setProdTab] = useState("dashboard");
  const [turno, setTurno] = useState(false);
  const [turnoInicio, setTurnoInicio] = useState(null);
  const [showAddResina, setShowAddResina] = useState(false);
  const [showAddPapel, setShowAddPapel] = useState(false);
  const [showAddOT, setShowAddOT] = useState(false);
  const [showAddBobina, setShowAddBobina] = useState(false);
  const [newResina, setNewResina] = useState({ tipo: "PEBD", peso: "25", proveedor: "SM Resinas Mexico", costo: "32", folio_packing: "" });
  const [newPapel, setNewPapel] = useState({ cliente: "Arpapel", tipo: "Bond", gramaje: "80", ancho: "980", metros: "2500", peso: "196", proveedor: "Productos Arpapel", folio_packing: "" });
  const [newOT, setNewOT] = useState({ cliente: "Arpapel", tipo: "maquila", producto: "", diasCredito: "30" });
  const [newBobina, setNewBobina] = useState({ ot_id: "", ancho: "980", metros: "2000", peso: "180", gramaje: "95" });
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => ({
    resinasDisp: resinas.filter(r => r.status === "disponible").length,
    resinasKg: resinas.filter(r => r.status === "disponible").reduce((s, r) => s + (r.peso_kg || 0), 0),
    papelBobinas: papeles.length,
    otsActivas: ots.filter(o => o.status === "en_proceso").length,
    otsPendientes: ots.filter(o => o.status === "pendiente").length,
    totalBobinas: bobinas.length,
    totalMetros: bobinas.reduce((s, b) => s + (b.metros_lineales || 0), 0),
    totalKg: bobinas.reduce((s, b) => s + (b.peso_kg || 0), 0),
  }), [resinas, papeles, ots, bobinas]);

  // Telegram notifications
  const notifyTelegram = async (message, type = "info") => {
    try { await fetch("/api/notify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, type }) }); } catch {}
  };

  // DB Operations
  const addResina = async () => {
    setSaving(true);
    const codigo = `RES-${String(resinas.length + 1).padStart(3, "0")}`;
    const { data, error } = await supabase.from('resinas').insert({
      codigo,
      tipo: newResina.tipo,
      peso_kg: parseFloat(newResina.peso) || 25,
      proveedor_nombre: newResina.proveedor,
      costo_kg: parseFloat(newResina.costo) || 32,
      status: 'disponible',
      folio_packing: newResina.folio_packing || null,
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    if (!error && data) setResinas(prev => [data[0], ...prev]);
    setShowAddResina(false);
    setSaving(false);
  };

  const addPapel = async () => {
    setSaving(true);
    const codigo = `PAP-${String(papeles.length + 1).padStart(3, "0")}`;
    const { data, error } = await supabase.from('papel_bobinas').insert({
      codigo,
      cliente_nombre: newPapel.cliente,
      tipo: newPapel.tipo,
      gramaje: parseInt(newPapel.gramaje) || 80,
      ancho_mm: parseInt(newPapel.ancho) || 980,
      metros_lineales: parseFloat(newPapel.metros) || 2500,
      peso_kg: parseFloat(newPapel.peso) || 196,
      proveedor: newPapel.proveedor,
      status: 'disponible',
      folio_packing: newPapel.folio_packing || null,
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    if (!error && data) setPapeles(prev => [data[0], ...prev]);
    setShowAddPapel(false);
    setSaving(false);
  };

  const addOT = async () => {
    setSaving(true);
    const codigo = `OT-${String(ots.length + 1).padStart(3, "0")}`;
    const { data, error } = await supabase.from('ordenes_trabajo').insert({
      codigo,
      cliente_nombre: newOT.cliente,
      tipo: newOT.tipo,
      producto: newOT.producto,
      dias_credito: parseInt(newOT.diasCredito) || 30,
      status: 'pendiente',
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    if (!error && data) {
      setOts(prev => [data[0], ...prev]);
      notifyTelegram(`Nueva OT: *${codigo}*\nCliente: ${newOT.cliente}\nProducto: ${newOT.producto || newOT.tipo}\nCreada por: ${currentUser?.nombre}`, "ot");
    }
    setShowAddOT(false);
    setNewOT({ cliente: "Arpapel", tipo: "maquila", producto: "", diasCredito: "30" });
    setSaving(false);
  };

  const updateOTStatus = async (id, newStatus) => {
    const updates = { status: newStatus, updated_by: currentUser?.nombre || "Sistema", updated_at: new Date().toISOString() };
    if (newStatus === 'en_proceso') updates.fecha_inicio = today();
    if (newStatus === 'completada') updates.fecha_fin = today();

    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
    if (!error) {
      const ot = ots.find(o => o.id === id);
      setOts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      if (newStatus === 'completada' && ot) notifyTelegram(`OT Completada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}\n${ot.kg_producidos || 0}kg producidos`, "production");
      if (newStatus === 'en_proceso' && ot) notifyTelegram(`OT En Proceso: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}`, "ot");
    }
  };

  const addBobina = async () => {
    setSaving(true);
    const codigo = `BOB-${String(bobinas.length + 1).padStart(3, "0")}`;
    const ot = ots.find(o => o.id === newBobina.ot_id);
    const { data, error } = await supabase.from('bobinas_pt').insert({
      codigo,
      ot_id: newBobina.ot_id,
      ot_codigo: ot?.codigo,
      ancho_mm: parseInt(newBobina.ancho) || 980,
      metros_lineales: parseFloat(newBobina.metros) || 2000,
      peso_kg: parseFloat(newBobina.peso) || 180,
      gramaje_total: parseInt(newBobina.gramaje) || 95,
      status: 'terminada',
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    
    if (!error && data) {
      setBobinas(prev => [data[0], ...prev]);
      // Update OT counters
      if (ot) {
        const newMetros = (ot.metros_producidos || 0) + parseFloat(newBobina.metros);
        const newKg = (ot.kg_producidos || 0) + parseFloat(newBobina.peso);
        const newBobCount = (ot.bobinas_producidas || 0) + 1;
        await supabase.from('ordenes_trabajo').update({
          metros_producidos: newMetros,
          kg_producidos: newKg,
          bobinas_producidas: newBobCount
        }).eq('id', ot.id);
        setOts(prev => prev.map(o => o.id === ot.id ? { ...o, metros_producidos: newMetros, kg_producidos: newKg, bobinas_producidas: newBobCount } : o));
      }
    }
    setShowAddBobina(false);
    setSaving(false);
  };

  // ═══════════════════════════════════════════
  // COTIZADOR STATE
  // ═══════════════════════════════════════════
  const [cotTab, setCotTab] = useState("cotizar");
  const [tipo, setTipo] = useState("maquila");
  const [cliente, setCliente] = useState("Arpapel");
  const [producto, setProducto] = useState("");
  const [anchoMaestro, setAnchoMaestro] = useState("1000");
  const [anchoUtil, setAnchoUtil] = useState("980");
  const [velMaq, setVelMaq] = useState("80");
  const [merma, setMerma] = useState("5");
  const [margen, setMargen] = useState("35");
  const [q1, setQ1] = useState("1000");
  const [q2, setQ2] = useState("5000");
  const [q3, setQ3] = useState("10000");
  const [oh, setOh] = useState(config.overhead || { renta: 25000, luz: 35000, gas: 5000, agua: 2000, mantenimiento: 30000, mo_directa: 45000, socios: 60000, otros: 10000, horas_mes: 176 });
  const [condPago, setCondPago] = useState("90 días");
  const [validez, setValidez] = useState("15");
  const [setupHrs, setSetupHrs] = useState("3");

  // Materiales catalog
  const DEFAULT_RESINAS = [
    { id: "r1", nombre: "PEBD SM Resinas", tipo: "PEBD", precio: 32, gramaje: 15 },
    { id: "r2", nombre: "PEAD Consorcio DQ", tipo: "PEAD", precio: 35, gramaje: 15 },
    { id: "r3", nombre: "Supreme Promaplast", tipo: "Supreme", precio: 42, gramaje: 12 },
  ];
  const DEFAULT_PAPELES = [
    { id: "p1", nombre: "Bond Arpapel 60g", tipo: "Bond", precio: 18, gramaje: 60 },
    { id: "p2", nombre: "Bond Arpapel 75g", tipo: "Bond", precio: 20, gramaje: 75 },
    { id: "p3", nombre: "Bond Arpapel 80g", tipo: "Bond", precio: 22, gramaje: 80 },
    { id: "p4", nombre: "Couché 90g", tipo: "Couché", precio: 28, gramaje: 90 },
    { id: "p5", nombre: "Kraft 80g", tipo: "Kraft", precio: 16, gramaje: 80 },
  ];
  const [matResinas, setMatResinas] = useState(DEFAULT_RESINAS);
  const [matPapeles, setMatPapeles] = useState(DEFAULT_PAPELES);
  const [selResina, setSelResina] = useState("r1");
  const [selPapel, setSelPapel] = useState("p1");
  const [showAddMatResina, setShowAddMatResina] = useState(false);
  const [showAddMatPapel, setShowAddMatPapel] = useState(false);
  const [newMatR, setNewMatR] = useState({ nombre: "", tipo: "PEBD", precio: "32", gramaje: "15" });
  const [newMatP, setNewMatP] = useState({ nombre: "", tipo: "Bond", precio: "20", gramaje: "80" });

  useEffect(() => {
    if (config.overhead) setOh(config.overhead);
  }, [config]);

  // Load materiales from config
  useEffect(() => {
    const loadMats = async () => {
      try {
        const r = await supabase.from('configuracion').select('*');
        const mats = r.data?.find(c => c.clave === 'materiales');
        if (mats?.valor) {
          if (mats.valor.resinas?.length) setMatResinas(mats.valor.resinas);
          if (mats.valor.papeles?.length) setMatPapeles(mats.valor.papeles);
        }
      } catch {}
    };
    loadMats();
  }, []);

  const saveMateriales = async () => {
    if (!confirm("¿Guardar cambios en materiales?")) return;
    try {
      await supabase.from('configuracion').upsert({ clave: 'materiales', valor: { resinas: matResinas, papeles: matPapeles }, updated_by: currentUser?.nombre || "Sistema", updated_at: new Date().toISOString() });
      showToast(`Materiales guardados por ${currentUser?.nombre || "Sistema"}`);
      logActivity("Catálogo de materiales actualizado");
    } catch {}
  };

  const saveOverhead = async () => {
    if (!confirm("¿Guardar cambios en overhead?")) return;
    try {
      await supabase.from('configuracion').upsert({ clave: 'overhead', valor: oh, updated_by: currentUser?.nombre || "Sistema", updated_at: new Date().toISOString() });
      showToast(`Overhead guardado por ${currentUser?.nombre || "Sistema"}`);
      logActivity("Overhead actualizado");
    } catch {}
  };

  const resinaActual = matResinas.find(r => r.id === selResina) || matResinas[0] || { precio: 32, gramaje: 15 };
  const papelActual = matPapeles.find(p => p.id === selPapel) || matPapeles[0] || { precio: 20, gramaje: 80 };

  const calc = useMemo(() => {
    const pGr = parseFloat(resinaActual.gramaje) || 15;
    const papGrV = parseFloat(papelActual.gramaje) || 80;
    const rP = parseFloat(resinaActual.precio) || 32;
    const pP = parseFloat(papelActual.precio) || 20;
    const aMaestro = (parseFloat(anchoMaestro) || 1000) / 1000;
    const aUtil = (parseFloat(anchoUtil) || 980) / 1000;
    const mermaRefil = aMaestro > 0 ? ((aMaestro - aUtil) / aMaestro) * 100 : 0;
    const vel = parseFloat(velMaq) || 80;
    const merm = (parseFloat(merma) || 5) / 100;
    const marg = (parseFloat(margen) || 35) / 100;
    const esMaq = tipo === "maquila";
    // Costos se calculan sobre ancho maestro (lo que realmente consume la máquina)
    const peKgPorM = (pGr * aMaestro) / 1000;
    const papKgPorM = (papGrV * aMaestro) / 1000;
    // Producto útil se calcula sobre ancho útil (lo que entrega al cliente)
    const totalGrM2 = papGrV + pGr;
    const kgUtilPorM = (totalGrM2 * aUtil) / 1000;
    const mPorHr = vel * 60;
    const ohTotal = (oh.renta||0)+(oh.luz||0)+(oh.gas||0)+(oh.agua||0)+(oh.mantenimiento||0)+(oh.mo_directa||0)+(oh.socios||0)+(oh.otros||0);
    const ohHr = ohTotal / (oh.horas_mes || 176);
    const sHrs = parseFloat(setupHrs) || 3;
    const calcQ = (qKg) => {
      if (!qKg || qKg <= 0) return null;
      // Metros lineales necesarios para entregar qKg de producto útil
      const mLin = qKg / kgUtilPorM;
      const m2Util = mLin * aUtil;
      const m2Maestro = mLin * aMaestro;
      const hrs = mLin / mPorHr;
      // Consumo real de materiales (sobre ancho maestro, incluye refil)
      const resinaKg = (peKgPorM * mLin) * (1 + merm);
      const papelKg = esMaq ? 0 : papKgPorM * mLin;
      const costoResina = resinaKg * rP;
      const costoPapel = papelKg * pP;
      const costoOH = hrs * ohHr;
      // Setup fijo: se cobra una vez y se diluye en la cantidad
      const costoSetup = sHrs * ohHr;
      const costoTotal = costoResina + costoPapel + costoOH + costoSetup;
      const precioVenta = costoTotal / (1 - marg);
      const utilidad = precioVenta - costoTotal;
      const pk = precioVenta / qKg;
      const pm2 = precioVenta / m2Util;
      const setupPorKg = costoSetup / qKg;
      return { q: qKg, mLin, m2: m2Util, m2Maestro, hrs, resinaKg, papelKg, costoResina, costoPapel, costoOH, costoSetup, setupPorKg, costoTotal, precioVenta, utilidad, pk, pm2, pv: precioVenta, ut: utilidad };
    };
    return { e1: calcQ(parseFloat(q1)||0), e2: calcQ(parseFloat(q2)||0), e3: calcQ(parseFloat(q3)||0), ohTotal, ohHr, totalGrM2, esMaq, pGr, papGrV, rP, pP, mermaRefil, aMaestro, aUtil };
  }, [resinaActual, papelActual, anchoMaestro, anchoUtil, velMaq, merma, margen, q1, q2, q3, tipo, oh, setupHrs]);

  const guardarCotizacion = async () => {
    const escenarios = [calc.e1, calc.e2, calc.e3].filter(Boolean);
    if (!escenarios.length || !cliente) { showToast("Completa cliente y cantidades", "warn"); return; }
    setSaving(true);
    const numero = `KP-${String(cotCRM.length + 1).padStart(4, "0")}`;
    const cl = clientes.find(c => c.nombre.toLowerCase() === cliente.toLowerCase());
    const items = escenarios.map(e => ({
      producto: `${papelActual.nombre} + ${resinaActual.nombre}`,
      cantidad: e.q,
      precio_kg: Math.round(e.pk * 100) / 100,
      precio_m2: Math.round(e.pm2 * 100) / 100,
      subtotal: Math.round(e.pv * 100) / 100,
    }));
    const cotData = {
      numero, cliente_id: cl?.id || null, cliente_nombre: cliente,
      items, total: Math.round(escenarios[0].pv * 100) / 100,
      pago: condPago, notas: `${papelActual.gramaje}g + ${resinaActual.gramaje}µ PE | Maestro ${anchoMaestro}mm → Útil ${anchoUtil}mm (refil ${fmt(calc.mermaRefil,1)}%) | Merma proceso ${merma}% | Margen ${margen}% | Validez ${validez} días`,
      fecha: today(), status: "borrador",
      resina: resinaActual.nombre, papel: papelActual.nombre,
      estructura: `${papelActual.gramaje}/${resinaActual.gramaje}`,
    };
    let data; try { const r = await supabase.from('cotizaciones_crm').insert(cotData).select(); data = r.data; } catch { data = [{ ...cotData, id: genId() }]; }
    if (data?.[0]) {
      setCotCRM(prev => [data[0], ...prev]);
      if (cl && ["lead", "contactado"].includes(cl.etapa)) updateCliente(cl.id, { etapa: "cotizado" });
      showToast(`Cotización ${numero} guardada`);
      notifyTelegram(`Nueva Cotización: *${numero}*\nCliente: ${cliente}\nPrecio: $${fmtI(escenarios[0].pv)}\nEscenarios: ${escenarios.map(e=>`${fmtI(e.q)}kg`).join(", ")}`, "crm");
      logActivity(`Cotización ${numero} — $${fmtI(escenarios[0].pv)} para ${cliente}`, cl?.id);
    }
    setSaving(false);
  };

  const exportarPDF = async () => {
    const escenarios = [calc.e1, calc.e2, calc.e3].filter(Boolean);
    if (!escenarios.length || !cliente) { showToast("Completa cliente y cantidades", "warn"); return; }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "letter" });
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
      img.crossOrigin = "anonymous";
      img.src = "/kattegat_99d-logo-template.jpg";
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
      doc.addImage(img, "JPEG", margin, y, 35, 35);
    } catch { /* logo no disponible */ }

    // Header
    doc.setFontSize(18); doc.setTextColor(...navy); doc.setFont("helvetica", "bold");
    doc.text("KATTEGAT INDUSTRIES", margin + 40, y + 12);
    doc.setFontSize(9); doc.setTextColor(...gray); doc.setFont("helvetica", "normal");
    doc.text("Soluciones en laminado y extrusión de polietileno", margin + 40, y + 18);
    doc.text("fernando@kattegatindustries.com", margin + 40, y + 23);

    // Cotización title
    y = 55;
    doc.setFillColor(11, 15, 26); doc.rect(margin, y, w - margin * 2, 10, "F");
    doc.setFontSize(13); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text("COTIZACIÓN", margin + 4, y + 7);
    const numero = `KP-${String(cotCRM.length + 1).padStart(4, "0")}`;
    doc.setFontSize(11);
    doc.text(numero, w - margin - 4, y + 7, { align: "right" });

    // Info boxes
    y += 16;
    doc.setTextColor(...navy); doc.setFontSize(9);

    // Left box: Client
    doc.setDrawColor(200, 200, 200); doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, y, (w - margin * 2) / 2 - 3, 28, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setTextColor(...blue);
    doc.text("CLIENTE", margin + 4, y + 6);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...navy);
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
    doc.roundedRect(rx, y, (w - margin * 2) / 2 - 3, 28, 2, 2, "FD");
    doc.setFont("helvetica", "bold"); doc.setTextColor(...blue); doc.setFontSize(9);
    doc.text("DETALLES", rx + 4, y + 6);
    doc.setFont("helvetica", "normal"); doc.setTextColor(...navy); doc.setFontSize(8);
    doc.text(`Fecha: ${today()}`, rx + 4, y + 12);
    doc.text(`Validez: ${validez} días`, rx + 4, y + 17);
    doc.text(`Pago: ${condPago}`, rx + 4, y + 22);

    // Specs
    y += 34;
    doc.setFont("helvetica", "bold"); doc.setTextColor(...blue); doc.setFontSize(9);
    doc.text("ESPECIFICACIONES", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...navy);
    const esMaq = tipo === "maquila";
    doc.text(`Tipo: ${esMaq ? "Maquila" : "Propio"}`, margin, y);
    doc.text(`Resina: ${resinaActual.nombre} (${resinaActual.gramaje}g/m²)`, margin, y + 5);
    if (!esMaq) doc.text(`Papel: ${papelActual.nombre} (${papelActual.gramaje}g/m²)`, margin, y + 10);
    doc.text(`Estructura: ${esMaq ? resinaActual.gramaje + "g PE" : papelActual.gramaje + "g + " + resinaActual.gramaje + "g = " + calc.totalGrM2 + "g/m²"}`, esMaq ? margin + 80 : margin, esMaq ? y + 5 : y + 15);
    doc.text(`Ancho: ${anchoMaestro}mm maestro → ${anchoUtil}mm útil (Refil: ${fmt(calc.mermaRefil, 1)}%)`, margin + 80, y);
    doc.text(`Merma proceso: ${merma}%  |  Margen: ${margen}%`, margin + 80, y + 5);

    // Table header
    y += (esMaq ? 16 : 22);
    doc.setFillColor(11, 15, 26); doc.rect(margin, y, w - margin * 2, 8, "F");
    doc.setFontSize(8); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    const cols = [margin + 4, margin + 22, margin + 50, margin + 80, margin + 110, margin + 140];
    doc.text("#", cols[0], y + 5.5);
    doc.text("Cantidad (kg)", cols[1], y + 5.5);
    doc.text("m²", cols[2], y + 5.5);
    doc.text("$/kg", cols[3], y + 5.5);
    doc.text("$/m²", cols[4], y + 5.5);
    doc.text("Total", cols[5], y + 5.5);

    // Table rows
    y += 8;
    escenarios.forEach((e, i) => {
      const fill = i % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
      doc.setFillColor(...fill); doc.rect(margin, y, w - margin * 2, 8, "F");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...navy);
      doc.text(`${i + 1}`, cols[0], y + 5.5);
      doc.text(`${fmtI(e.q)}`, cols[1], y + 5.5);
      doc.text(`${fmtI(e.m2)}`, cols[2], y + 5.5);
      doc.setFont("helvetica", "bold");
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
    doc.setFont("helvetica", "bold"); doc.setTextColor(...blue); doc.setFontSize(9);
    doc.text("NOTAS", margin, y);
    y += 5;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
    const notas = [
      "• Precios en MXN, no incluyen IVA",
      `• Condiciones de pago: ${condPago}`,
      `• Cotización válida por ${validez} días a partir de la fecha de emisión`,
      `• Tipo: ${esMaq ? "Servicio de maquila (cliente proporciona papel)" : "Producto completo (papel + polietileno)"}`,
    ];
    notas.forEach(n => { doc.text(n, margin, y); y += 5; });

    // Footer
    y = doc.internal.pageSize.getHeight() - 15;
    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5); doc.line(margin, y, w - margin, y);
    doc.setFontSize(7); doc.setTextColor(...gray);
    doc.text("Kattegat Industries  |  fernando@kattegatindustries.com", w / 2, y + 5, { align: "center" });
    doc.text(`Generado el ${new Date().toLocaleDateString("es-MX")} — ${numero}`, w / 2, y + 9, { align: "center" });

    doc.save(`Cotizacion_${numero}_${cliente.replace(/\s+/g, "_")}.pdf`);
    showToast(`PDF ${numero} descargado`);
    logActivity(`PDF cotización ${numero} exportado para ${cliente}`);
  };

  // ═══════════════════════════════════════════
  // NOMINAS STATE
  // ═══════════════════════════════════════════
  const [nomTab, setNomTab] = useState("empleados");
  const [showAddEmpleado, setShowAddEmpleado] = useState(false);
  const [newEmp, setNewEmp] = useState({ nombre: "", puesto: "Operador Extrusora", sueldo_neto: "12000" });

  const nominaTotal = useMemo(() => {
    const activos = empleados.filter(e => e.activo);
    const detalles = activos.map(e => ({ ...e, calc: calcNomina(e.sueldo_neto) }));
    const totalNeto = detalles.reduce((s, e) => s + e.calc.sn, 0);
    const totalCosto = detalles.reduce((s, e) => s + e.calc.costoConProv, 0);
    return { detalles, totalNeto, totalCosto, count: activos.length };
  }, [empleados]);

  const addEmpleado = async () => {
    if (!newEmp.nombre) return;
    setSaving(true);
    const { data, error } = await supabase.from('empleados').insert({
      nombre: newEmp.nombre,
      puesto: newEmp.puesto,
      sueldo_neto: parseFloat(newEmp.sueldo_neto) || 12000,
      activo: true
    }).select();
    if (!error && data) setEmpleados(prev => [...prev, data[0]]);
    setShowAddEmpleado(false);
    setNewEmp({ nombre: "", puesto: "Operador Extrusora", sueldo_neto: "12000" });
    setSaving(false);
  };

  // ═══════════════════════════════════════════
  // CONTABILIDAD STATE
  // ═══════════════════════════════════════════
  const [contTab, setContTab] = useState("dashboard");
  const [showAddFactura, setShowAddFactura] = useState(false);
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [newFact, setNewFact] = useState({ cliente: "", concepto: "", monto: "", diasCredito: "30", fechaEmision: today() });
  const [newGasto, setNewGasto] = useState({ concepto: "", categoria: "materia_prima", monto: "", fecha: today(), comprobante: "" });

  const contMetrics = useMemo(() => {
    const hoy = today();
    const facPendientes = facturas.filter(f => f.status === "pendiente" || f.status === "vencida");
    const facVencidas = facturas.filter(f => f.status === "vencida" || (f.status === "pendiente" && f.fecha_vencimiento < hoy));
    const facPorVencer = facturas.filter(f => f.status === "pendiente" && f.fecha_vencimiento >= hoy && daysDiff(f.fecha_vencimiento, hoy) <= 7);
    const totalCxC = facPendientes.reduce((s, f) => s + (f.total || f.monto || 0), 0);
    const totalVencido = facVencidas.reduce((s, f) => s + (f.total || f.monto || 0), 0);
    const totalGastosMes = gastos.reduce((s, g) => s + (g.total || g.monto || 0), 0);
    return { facPendientes, facVencidas, facPorVencer, totalCxC, totalVencido, totalGastosMes };
  }, [facturas, gastos]);

  const addFactura = async () => {
    if (!newFact.cliente || !newFact.monto) return;
    setSaving(true);
    const codigo = `FAC-${String(facturas.length + 1).padStart(3, "0")}`;
    const monto = parseFloat(newFact.monto);
    const iva = monto * 0.16;
    const total = monto + iva;
    const fechaVence = new Date(newFact.fechaEmision);
    fechaVence.setDate(fechaVence.getDate() + parseInt(newFact.diasCredito));
    
    const { data, error } = await supabase.from('facturas').insert({
      codigo,
      cliente_nombre: newFact.cliente,
      concepto: newFact.concepto,
      monto,
      iva,
      total,
      fecha_emision: newFact.fechaEmision,
      dias_credito: parseInt(newFact.diasCredito),
      fecha_vencimiento: fechaVence.toISOString().split("T")[0],
      status: 'pendiente',
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    if (!error && data) setFacturas(prev => [data[0], ...prev]);
    setShowAddFactura(false);
    setNewFact({ cliente: "", concepto: "", monto: "", diasCredito: "30", fechaEmision: today() });
    setSaving(false);
  };

  const markFacturaCobrada = async (id) => {
    const updates = { status: 'cobrada', fecha_cobro: today(), updated_by: currentUser?.nombre || "Sistema", updated_at: new Date().toISOString() };
    const { error } = await supabase.from('facturas').update(updates).eq('id', id);
    if (!error) setFacturas(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const addGasto = async () => {
    if (!newGasto.concepto || !newGasto.monto) return;
    setSaving(true);
    const codigo = `GAS-${String(gastos.length + 1).padStart(3, "0")}`;
    const monto = parseFloat(newGasto.monto);
    
    const { data, error } = await supabase.from('gastos').insert({
      codigo,
      concepto: newGasto.concepto,
      categoria: newGasto.categoria,
      monto,
      total: monto,
      fecha: newGasto.fecha,
      comprobante: newGasto.comprobante,
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();
    if (!error && data) setGastos(prev => [data[0], ...prev]);
    setShowAddGasto(false);
    setNewGasto({ concepto: "", categoria: "materia_prima", monto: "", fecha: today(), comprobante: "" });
    setSaving(false);
  };

  // Solicitudes de corrección
  const pendingSolicitudes = solicitudes.filter(s => s.status === "pendiente");

  const crearSolicitud = async (tipo, registroId, registroCodigo, motivo) => {
    if (!motivo.trim()) { showToast("Escribe un motivo", "warn"); return; }
    const sol = { tipo, registro_id: registroId, registro_codigo: registroCodigo, motivo, solicitante: currentUser?.nombre || "Operador", status: "pendiente", created_at: new Date().toISOString() };
    let data; try { const r = await supabase.from('solicitudes_correccion').insert(sol).select(); data = r.data; } catch { data = [{ ...sol, id: genId() }]; }
    if (data?.[0]) { setSolicitudes(prev => [data[0], ...prev]); showToast("Solicitud enviada"); logActivity(`Solicitud corrección: ${registroCodigo} — ${motivo}`); notifyTelegram(`Solicitud de Corrección\nRegistro: *${registroCodigo}*\nMotivo: ${motivo}\nSolicitante: ${currentUser?.nombre}`, "alert"); }
    setShowSolicitud(null); setSolicitudMotivo("");
  };

  const resolverSolicitud = async (id, accion) => {
    const updates = { status: accion, resuelto_por: currentUser?.nombre || "Admin", resuelto_at: new Date().toISOString() };
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    try { await supabase.from('solicitudes_correccion').update(updates).eq('id', id); } catch {}
    const sol = solicitudes.find(s => s.id === id);
    showToast(`Solicitud ${accion === "aprobada" ? "aprobada" : "rechazada"}`);
    logActivity(`Solicitud ${sol?.registro_codigo}: ${accion} por ${currentUser?.nombre}`);
  };

  // CRM DB Operations
  const updateCliente = async (id, updates) => {
    const tracked = { ...updates, updated_at: new Date().toISOString(), updated_by: currentUser?.nombre || "Sistema" };
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...tracked } : c));
    try { await supabase.from('clientes').update(tracked).eq('id', id); } catch {}
    if (updates.etapa) { const cl = clientes.find(c => c.id === id); const stg = STAGES.find(s => s.id === updates.etapa); logActivity(`${cl?.nombre} → ${stg?.l}`, id); showToast(`${cl?.nombre} → ${stg?.l}`); }
  };
  const deleteCliente = async (id) => {
    const cl = clientes.find(c => c.id === id);
    setClientes(prev => prev.filter(c => c.id !== id));
    try { await supabase.from('clientes').delete().eq('id', id); } catch {}
    logActivity(`Cliente eliminado: ${cl?.nombre}`);
    showToast("Cliente eliminado", "warn");
    setShowClienteDetail(null);
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  if (loading) return (
    <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <div style={{ width: 50, height: 50, borderRadius: 12, background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 24, color: "#fff" }}>K</div>
      <Loading />
      <div style={{ color: C.t3, fontSize: 12 }}>Cargando sistema...</div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.t1, fontFamily: "system-ui, sans-serif" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { font-family: inherit; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: ${C.brd}; border-radius: 2px; }
        @keyframes slideIn { from { opacity:0; transform:translateY(-10px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* SOLICITUD MODAL */}
      {showSolicitud && <Modal title="Solicitar Corrección" onClose={()=>{setShowSolicitud(null);setSolicitudMotivo("");}} ch={<>
        <div style={{padding:8,background:C.bg,borderRadius:6,marginBottom:10}}>
          <div style={{fontSize:11,color:C.t3}}>Registro:</div>
          <div style={{fontSize:13,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{showSolicitud.codigo}</div>
          <div style={{fontSize:10,color:C.t3}}>{showSolicitud.tipo}</div>
        </div>
        <F l="Motivo de la corrección *" w="100%" ch={<TxtInp v={solicitudMotivo} set={setSolicitudMotivo} ph="Explica qué necesita corrección y por qué..." />} />
        <div style={{marginTop:10}}>
          <Btn text="📩 Enviar Solicitud" color={C.amb} full onClick={()=>crearSolicitud(showSolicitud.tipo, showSolicitud.id, showSolicitud.codigo, solicitudMotivo)} />
        </div>
      </>} />}

      {/* TOAST */}
      {toast && <div style={{ position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:999,background:toast.type==="warn"?C.amb:C.grn,color:"#fff",padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:600,animation:"slideIn 0.2s ease",boxShadow:"0 4px 20px rgba(0,0,0,0.4)" }}>
        {toast.type==="warn"?"⚠️":"✓"} {toast.msg}
      </div>}

      {/* HEADER */}
      <div style={{ background: C.s1, borderBottom: `1px solid ${C.brd}`, padding: "8px 10px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 12, color: "#fff" }}>K</div>
            <div style={{ fontSize: 12, fontWeight: 700 }}>Kattegat</div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:4}}>
            <button onClick={()=>loadData()} style={{background:C.s2,border:`1px solid ${C.brd}`,borderRadius:6,padding:"3px 8px",color:syncing?C.acc:C.t3,fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",gap:3}} title={lastSync?`Última sync: ${lastSync}`:""}>
              <span style={{display:"inline-block",animation:syncing?"spin 1s linear infinite":"none"}}>🔄</span>
              {lastSync && <span style={{fontSize:8,color:C.t3}}>{lastSync}</span>}
            </button>
            <button onClick={() => setShowUserModal(true)} style={{
              background: C.s2, border: `1px solid ${C.brd}`, borderRadius: 6, padding: "3px 8px",
              color: C.t1, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
            }}>👤 {user.nombre?.split(" ")[0]} <Badge text={isAdmin ? "A" : "O"} color={isAdmin ? C.acc : C.amb} /></button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
          {accessibleMods.map(m => (
            <button key={m.id} onClick={() => setMod(m.id)} style={{
              padding: "5px 10px", borderRadius: 6, border: mod === m.id ? `1px solid ${C.acc}` : "none",
              background: mod === m.id ? `${C.acc}15` : "transparent", color: mod === m.id ? C.acc : C.t3,
              fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap", position: "relative",
            }}><span>{m.ico}</span>{m.l}
              {m.id === "solicitudes" && pendingSolicitudes.length > 0 && <span style={{position:"absolute",top:-2,right:-2,background:C.red,color:"#fff",fontSize:8,fontWeight:800,borderRadius:"50%",width:14,height:14,display:"flex",alignItems:"center",justifyContent:"center"}}>{pendingSolicitudes.length}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* USER MODAL */}
      {showUserModal && <Modal title="Usuario" onClose={() => setShowUserModal(false)} ch={<>
        {users.map(u => (
          <button key={u.id} onClick={() => { setCurrentUser(u); setShowUserModal(false); if (u.rol !== "admin" && mod !== "produccion") setMod("produccion"); }}
            style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px", background: currentUser?.id === u.id ? `${C.acc}15` : C.bg, border: `1px solid ${currentUser?.id === u.id ? C.acc : C.brd}`, borderRadius: 6, marginBottom: 4, cursor: "pointer", color: C.t1 }}>
            <span style={{ fontSize: 12 }}>👤 {u.nombre}</span>
            <Badge text={u.rol} color={u.rol === "admin" ? C.acc : C.amb} />
          </button>
        ))}
      </>} />}

      {/* CONTENT */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "10px 10px 80px" }}>
        
        {/* DASHBOARD */}
        {mod === "dashboard" && isAdmin && (() => {
          // Calculate dashboard metrics from real data
          const now = new Date();
          const mesActual = now.getMonth();
          const yearActual = now.getFullYear();
          const otsActivas = ots.filter(o => o.status === "en_proceso").length;
          const otsCompletadas = ots.filter(o => o.status === "completada").length;
          const otsPendientes = ots.filter(o => o.status === "pendiente").length;
          const totalOts = ots.length;
          const facturasTotal = facturas.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
          const facturasCobradas = facturas.filter(f => f.cobrada).reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
          const facturasPendientes = facturasTotal - facturasCobradas;
          const gastosTotal = gastos.reduce((s, g) => s + (parseFloat(g.monto) || 0), 0);
          const clientesTotal = clientes.length;
          const clientesGanados = clientes.filter(c => c.etapa === "ganado").length;
          const cotTotal = cotCRM.reduce((s, q) => s + (q.total || 0), 0);
          const solicitudesPend = solicitudes.filter(s => s.status === "pendiente").length;
          // Production by month (last 6 months)
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
          const maxOts = Math.max(...prodByMonth.map(p => p.ots), 1);
          // Revenue by month
          const revByMonth = [];
          for (let i = 5; i >= 0; i--) {
            const d = new Date(yearActual, mesActual - i, 1);
            const m = d.getMonth(); const y = d.getFullYear();
            const facM = facturas.filter(f => { const fd = new Date(f.fecha_emision); return fd.getMonth() === m && fd.getFullYear() === y; });
            const rev = facM.reduce((s, f) => s + (parseFloat(f.monto) || 0), 0);
            revByMonth.push({ label: `${meses[m]} ${String(y).slice(2)}`, rev });
          }
          const maxRev = Math.max(...revByMonth.map(r => r.rev), 1);
          // Pipeline
          const pipeline = STAGES.map(st => ({ ...st, count: clientes.filter(c => c.etapa === st.id).length }));
          // Mini bar chart component
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
        })()}

        {/* PRODUCCIÓN */}
        {mod === "produccion" && <>
          <Tab tabs={[
            { id: "dashboard", ico: "📊", l: "Inicio" }, { id: "resinas", ico: "🧪", l: "Resinas" },
            { id: "papel", ico: "📜", l: "Papel" }, { id: "ots", ico: "📋", l: "OTs" }, { id: "bobinas", ico: "📦", l: "Bobinas" },
          ]} active={prodTab} set={setProdTab} />
          <div style={{ marginTop: 12 }}>
            {prodTab === "dashboard" && <>
              <div style={{ padding: 12, borderRadius: 10, marginBottom: 12, background: turno ? `${C.grn}10` : C.s2, border: `1px solid ${turno ? C.grn : C.brd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: turno ? C.grn : C.t3 }}>{turno ? "🟢 Turno Activo" : "⚪ Sin turno"}</div>
                  {turno && turnoInicio && <div style={{ fontSize: 10, color: C.t2 }}>Inicio: {turnoInicio}</div>}
                </div>
                <Btn text={turno ? "Cerrar" : "Iniciar"} color={turno ? C.red : C.grn}
                  onClick={() => { setTurno(!turno); setTurnoInicio(turno ? null : new Date().toLocaleTimeString("es-MX")); }} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <Card v={`${fmtI(metrics.resinasKg)}kg`} l="Resina" s={`${metrics.resinasDisp} sacos`} c={C.acc} ico="🧪" />
                <Card v={metrics.papelBobinas} l="Papel" s="bobinas" c={C.grn} ico="📜" />
                <Card v={metrics.otsActivas} l="OTs Activas" s={`${metrics.otsPendientes} pend.`} c={C.amb} ico="📋" />
                <Card v={`${fmtI(metrics.totalMetros)}m`} l="Producción" s={`${metrics.totalBobinas} bob.`} c={C.pur} ico="📦" />
              </div>
            </>}

            {prodTab === "resinas" && <>
              <Sec t={`Resinas (${fmtI(metrics.resinasKg)}kg)`} ico="🧪" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddResina(true)} />}
                ch={<>{resinas.slice(0, 20).map((r, i) => (
                  <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "wrap" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{r.codigo}</span>
                        <Badge text={r.tipo} color={C.acc} />
                        <Badge text={r.status} color={r.status === "disponible" ? C.grn : C.amb} />
                      </div>
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}><b style={{ color: C.t2 }}>{r.proveedor_nombre}</b> • ${r.costo_kg}/kg{r.folio_packing && <span style={{color:C.cyn}}> • PL:{r.folio_packing}</span>}</div>
                      {r.updated_by && <div style={{fontSize:9,color:C.t3,marginTop:1,fontStyle:"italic"}}>Editado: {r.updated_by}</div>}
                    </div>
                    <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}>
                      <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{r.peso_kg}kg</div>
                      {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"resina",id:r.id,codigo:r.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📩 Corrección</button>}
                    </div>
                  </div>
                ))}</>}
              />
              {showAddResina && <Modal title="+ Resina" onClose={() => setShowAddResina(false)} ch={<>
                <R ch={<F l="Material del catálogo" w="100%" ch={<Sel v={newResina.tipo} set={v => {
                  const mat = matResinas.find(r=>r.nombre===v);
                  if(mat) setNewResina(p=>({...p, tipo: mat.tipo, proveedor: mat.nombre, costo: String(mat.precio)}));
                  else setNewResina(p=>({...p, tipo: v}));
                }} opts={matResinas.map(r=>({v:r.nombre,l:`${r.nombre} (${r.tipo} $${r.precio}/kg)`}))} />} />} />
                <R ch={<><F l="Peso" u="kg" w="48%" ch={<Inp v={newResina.peso} set={v => setNewResina(p => ({...p, peso: v}))} />} /><F l="Costo" u="$/kg" w="48%" ch={<Inp v={newResina.costo} set={v => setNewResina(p => ({...p, costo: v}))} pre="$" />} /></>} />
                <R ch={<F l="Folio Packing List" w="100%" ch={<TxtInp v={newResina.folio_packing} set={v => setNewResina(p => ({...p, folio_packing: v}))} ph="Folio del packing list del proveedor" />} />} />
                <div style={{fontSize:10,color:C.t3,padding:"4px 0",fontStyle:"italic"}}>💡 Los materiales se configuran en Cotizador → Materiales</div>
                <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.grn} full onClick={addResina} disabled={saving} />
              </>} />}
            </>}

            {prodTab === "papel" && <>
              <Sec t={`Papel (${papeles.length})`} ico="📜" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddPapel(true)} />}
                ch={<>{papeles.slice(0, 20).map((p, i) => (
                  <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{p.codigo}</span>
                        <Badge text={p.tipo} color={C.pur} />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: C.t2 }}>{p.cliente_nombre} • {p.proveedor}{p.folio_packing && <span style={{color:C.cyn}}> • PL:{p.folio_packing}</span>}</div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 2, flexWrap:"wrap", alignItems:"center" }}>
                      <span>{p.gramaje}g/m²</span><span>↔{p.ancho_mm}mm</span><span>📏{fmtI(p.metros_lineales)}m</span><span>⚖️{p.peso_kg}kg</span>
                      {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"papel",id:p.id,codigo:p.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer",marginLeft:"auto"}}>📩 Corrección</button>}
                    </div>
                  </div>
                ))}</>}
              />
              {showAddPapel && <Modal title="+ Papel" onClose={() => setShowAddPapel(false)} ch={<>
                <R ch={<><F l="Cliente" w="48%" ch={<TxtInp v={newPapel.cliente} set={v => setNewPapel(p => ({...p, cliente: v}))} />} /><F l="Tipo" w="48%" ch={<Sel v={newPapel.tipo} set={v => setNewPapel(p => ({...p, tipo: v}))} opts={["Bond", "Recubierto", "Kraft", "Couché"]} />} /></>} />
                <R ch={<F l="Proveedor" w="100%" ch={<TxtInp v={newPapel.proveedor} set={v => setNewPapel(p => ({...p, proveedor: v}))} />} />} />
                <R ch={<><F l="Gramaje" w="32%" ch={<Inp v={newPapel.gramaje} set={v => setNewPapel(p => ({...p, gramaje: v}))} />} /><F l="Ancho" u="mm" w="32%" ch={<Inp v={newPapel.ancho} set={v => setNewPapel(p => ({...p, ancho: v}))} />} /><F l="Metros" w="32%" ch={<Inp v={newPapel.metros} set={v => setNewPapel(p => ({...p, metros: v}))} />} /></>} />
                <R ch={<><F l="Peso" u="kg" w="48%" ch={<Inp v={newPapel.peso} set={v => setNewPapel(p => ({...p, peso: v}))} />} /><F l="Folio Packing" w="48%" ch={<TxtInp v={newPapel.folio_packing} set={v => setNewPapel(p => ({...p, folio_packing: v}))} ph="Folio proveedor" />} /></>} />
                <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.grn} full onClick={addPapel} disabled={saving} />
              </>} />}
            </>}

            {prodTab === "ots" && <>
              <Sec t="OTs" ico="📋" right={<Btn text="+" sm color={C.acc} onClick={() => setShowAddOT(true)} />}
                ch={<>{ots.slice(0, 20).map((ot, i) => (
                  <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${ot.status === "en_proceso" ? C.grn + "40" : C.brd}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                        <span style={{ fontSize: 12, fontWeight: 800 }}>{ot.codigo}</span>
                        <Badge text={ot.status?.replace("_", " ")} color={ot.status === "en_proceso" ? C.grn : ot.status === "completada" ? C.acc : C.amb} />
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {ot.status === "pendiente" && <Btn text="▶" sm color={C.grn} onClick={() => updateOTStatus(ot.id, "en_proceso")} />}
                        {ot.status === "en_proceso" && <Btn text="✓" sm color={C.acc} onClick={() => updateOTStatus(ot.id, "completada")} />}
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: C.t2 }}>{ot.cliente_nombre} — {ot.producto}</div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 4, flexWrap:"wrap", alignItems:"center" }}>
                      <span>📦 {ot.bobinas_producidas || 0}</span><span>📏 {fmtI(ot.metros_producidos || 0)}m</span><span>💳 {ot.dias_credito}d</span>
                      {ot.updated_by && <span style={{fontStyle:"italic"}}>✏️ {ot.updated_by}</span>}
                      {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"OT",id:ot.id,codigo:ot.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer",marginLeft:"auto"}}>📩 Corrección</button>}
                    </div>
                  </div>
                ))}</>}
              />
              {showAddOT && <Modal title="+ OT" onClose={() => setShowAddOT(false)} ch={<>
                <R ch={<><F l="Cliente" w="58%" ch={<TxtInp v={newOT.cliente} set={v => setNewOT(p => ({...p, cliente: v}))} />} /><F l="Tipo" w="38%" ch={<Sel v={newOT.tipo} set={v => setNewOT(p => ({...p, tipo: v}))} opts={["maquila", "propio"]} />} /></>} />
                <R ch={<F l="Producto" w="100%" ch={<TxtInp v={newOT.producto} set={v => setNewOT(p => ({...p, producto: v}))} ph="Bond 80g + PE 15µ" />} />} />
                <R ch={<F l="Días crédito" w="48%" ch={<Inp v={newOT.diasCredito} set={v => setNewOT(p => ({...p, diasCredito: v}))} />} />} />
                <Btn text={saving ? "Creando..." : "Crear OT"} ico="✓" color={C.acc} full onClick={addOT} disabled={saving} />
              </>} />}
            </>}

            {prodTab === "bobinas" && <>
              <Sec t={`Bobinas (${fmtI(metrics.totalMetros)}m)`} ico="📦" right={<Btn text="+" sm color={C.grn} onClick={() => { setNewBobina(p => ({...p, ot_id: ots.find(o => o.status === "en_proceso")?.id || ""})); setShowAddBobina(true); }} />}
                ch={<>
                  {bobinas.slice(0, 20).map((b, i) => (
                    <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 4, border: `1px solid ${C.brd}`, display: "flex", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                          <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}>{b.codigo}</span>
                          <Badge text={b.ot_codigo} color={C.acc} />
                        </div>
                        <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 2 }}>
                          <span>↔{b.ancho_mm}mm</span><span>📏{fmtI(b.metros_lineales)}m</span><span>{b.gramaje_total}g/m²</span>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", display:"flex", flexDirection:"column", alignItems:"flex-end", gap:2 }}>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>{b.peso_kg}kg</div>
                        <div style={{ fontSize: 9, color: C.t3 }}>{fmtI((b.metros_lineales || 0) * (b.ancho_mm || 0) / 1000)}m²</div>
                        {!isAdmin && <button onClick={()=>setShowSolicitud({tipo:"bobina",id:b.id,codigo:b.codigo})} style={{background:"transparent",border:`1px solid ${C.amb}40`,color:C.amb,fontSize:9,padding:"2px 6px",borderRadius:4,cursor:"pointer"}}>📩</button>}
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: 10, background: `${C.pur}08`, borderRadius: 6 }}>
                    <div style={{ fontSize: 10, color: C.pur, fontWeight: 600, marginBottom: 4 }}>📊 PACKING</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 11, color: C.t2 }}>
                      <span>Bob: <b>{metrics.totalBobinas}</b></span>
                      <span>Metros: <b>{fmtI(metrics.totalMetros)}</b></span>
                      <span>Peso: <b>{fmtI(metrics.totalKg)}kg</b></span>
                    </div>
                  </div>
                </>}
              />
              {showAddBobina && <Modal title="+ Bobina PT" onClose={() => setShowAddBobina(false)} ch={<>
                <R ch={<F l="OT" w="100%" ch={<Sel v={newBobina.ot_id} set={v => setNewBobina(p => ({...p, ot_id: v}))} opts={ots.filter(o => o.status === "en_proceso").map(o => ({ v: o.id, l: `${o.codigo} - ${o.cliente_nombre}` }))} />} />} />
                <R ch={<><F l="Ancho" u="mm" w="32%" ch={<Inp v={newBobina.ancho} set={v => setNewBobina(p => ({...p, ancho: v}))} />} /><F l="Metros" w="32%" ch={<Inp v={newBobina.metros} set={v => setNewBobina(p => ({...p, metros: v}))} />} /><F l="Peso" u="kg" w="32%" ch={<Inp v={newBobina.peso} set={v => setNewBobina(p => ({...p, peso: v}))} />} /></>} />
                <R ch={<F l="Gramaje" u="g/m²" w="48%" ch={<Inp v={newBobina.gramaje} set={v => setNewBobina(p => ({...p, gramaje: v}))} />} />} />
                <Btn text={saving ? "Guardando..." : "Guardar"} ico="✓" color={C.grn} full onClick={addBobina} disabled={saving || !newBobina.ot_id} />
              </>} />}
            </>}
          </div>
        </>}

        {/* COTIZADOR */}
        {mod === "cotizador" && isAdmin && <>
          <Tab tabs={[{ id: "cotizar", ico: "⚖️", l: "Cotizar" }, { id: "materiales", ico: "🧪", l: "Materiales" }, { id: "overhead", ico: "⚙️", l: "Overhead" }]} active={cotTab} set={setCotTab} />
          <div style={{ marginTop: 12 }}>
            {cotTab === "cotizar" && <>
              <Sec t="Specs" ico="📐" ch={<>
                <R ch={<><F l="Tipo" w="32%" ch={<Sel v={tipo} set={setTipo} opts={[{ v: "maquila", l: "Maquila" }, { v: "propio", l: "Propio" }]} />} /><F l="Cliente" w="64%" ch={<TxtInp v={cliente} set={setCliente} ph="Nombre del cliente" />} /></>} />
                <R ch={<><F l="🧪 Resina" w={tipo==="maquila"?"100%":"48%"} ch={<Sel v={selResina} set={setSelResina} opts={matResinas.map(r=>({v:r.id,l:`${r.nombre} ($${r.precio}/kg)`}))} />} />{tipo!=="maquila" && <F l="📜 Papel" w="48%" ch={<Sel v={selPapel} set={setSelPapel} opts={matPapeles.map(p=>({v:p.id,l:`${p.nombre} ($${p.precio}/kg)`}))} />} />}</>} />
                <R ch={<><F l="Ancho Maestro" u="mm" w="32%" ch={<Inp v={anchoMaestro} set={setAnchoMaestro} />} /><F l="Ancho Útil" u="mm" w="32%" ch={<Inp v={anchoUtil} set={setAnchoUtil} />} /><F l="Vel" u="m/min" w="32%" ch={<Inp v={velMaq} set={setVelMaq} />} /></>} />
                <R ch={<><F l="Merma Proceso" u="%" w="24%" ch={<Inp v={merma} set={setMerma} />} /><F l="Margen" u="%" w="24%" ch={<Inp v={margen} set={setMargen} />} /><F l="Setup" u="hrs" w="24%" ch={<Inp v={setupHrs} set={setSetupHrs} />} h="Fijo, se diluye" /><F l="Validez" u="días" w="24%" ch={<Inp v={validez} set={setValidez} />} /></>} />
                <R ch={<F l="Cond. Pago" w="48%" ch={<Sel v={condPago} set={setCondPago} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} />} />
                <div style={{ padding: "8px 10px", background: `${C.grn}10`, borderRadius: 6, fontSize: 11, color: C.t2 }}>
                  {tipo!=="maquila" && <div>📜 {papelActual.nombre}: <b>{papelActual.gramaje}g/m²</b> @ <b style={{color:C.amb}}>${papelActual.precio}/kg</b></div>}
                  <div>🧪 {resinaActual.nombre}: <b>{resinaActual.gramaje}g/m² (µ)</b> @ <b style={{color:C.amb}}>${resinaActual.precio}/kg</b></div>
                  <div style={{marginTop:4}}>
                    {tipo==="maquila"
                      ? <>Estructura: <b style={{color:C.grn}}>{resinaActual.gramaje}g/m² PE</b> <Badge text="Maquila" color={C.amb} /></>
                      : <>Estructura: {papelActual.gramaje}g + {resinaActual.gramaje}g = <b style={{ color: C.grn }}>{calc.totalGrM2}g/m²</b></>}
                  </div>
                  <div style={{marginTop:2}}>Ancho: <b>{anchoMaestro}mm</b> maestro → <b style={{color:C.cyn}}>{anchoUtil}mm</b> útil — <span style={{color: calc.mermaRefil > 3 ? C.red : C.grn}}>Refil: {fmt(calc.mermaRefil,1)}%</span> + Proceso: {merma}%</div>
                </div>
              </>} />
              <Sec t="Cantidades (kg)" ico="📊" col={C.acc} ch={<R ch={<><F l="Cant 1" w="32%" ch={<Inp v={q1} set={setQ1} />} /><F l="Cant 2" w="32%" ch={<Inp v={q2} set={setQ2} />} /><F l="Cant 3" w="32%" ch={<Inp v={q3} set={setQ3} />} /></>} />} />
              {[calc.e1, calc.e2, calc.e3].filter(Boolean).map((e, i) => {
                const cs = [C.grn, C.acc, C.amb];
                return (
                  <Sec key={i} t={`${fmtI(e.q)}kg — ${fmtI(e.m2)}m²`} ico={["🟢", "🔵", "🟡"][i]} col={cs[i]} ch={
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <div style={{ padding: 8, background: C.bg, borderRadius: 6, fontSize: 10 }}>
                        <RR l="Resina" v={e.costoResina} sm />
                        {!calc.esMaq && <RR l="Papel" v={e.costoPapel} sm />}
                        <RR l="Overhead (prod)" v={e.costoOH} sm />
                        <RR l={`Setup ${setupHrs}h fijo`} v={e.costoSetup} sm c={C.amb} />
                        <div style={{ fontSize: 9, color: C.t3, textAlign: "right" }}>= ${fmt(e.setupPorKg)}/kg diluido</div>
                        <div style={{ borderTop: `1px solid ${C.brd}`, marginTop: 4, paddingTop: 4 }}><RR l="Costo Total" v={e.costoTotal} b /></div>
                      </div>
                      <div style={{ padding: 8, background: `${cs[i]}08`, borderRadius: 6, border: `1px solid ${cs[i]}30`, fontSize: 10 }}>
                        <RR l="Precio Total" v={e.pv} b c={cs[i]} />
                        <RR l="$/kg" v={e.pk} sm />
                        <RR l="$/m²" v={e.pm2} sm c={C.cyn} />
                        <div style={{ borderTop: `1px solid ${C.brd}`, marginTop: 4, paddingTop: 4 }}><RR l="Utilidad" v={e.ut} b c={C.grn} /></div>
                      </div>
                    </div>
                  } />
                );
              })}
              {[calc.e1, calc.e2, calc.e3].some(Boolean) && <div style={{ marginTop: 4, display: "flex", gap: 8, flexDirection: "column" }}>
                <Btn text={saving ? "Guardando..." : "💾 Guardar Cotización → CRM"} color={C.grn} full onClick={guardarCotizacion} disabled={saving || !cliente} />
                <Btn text="📄 Descargar PDF" color={C.acc} full outline onClick={exportarPDF} disabled={!cliente} />
              </div>}
            </>}

            {/* MATERIALES TAB */}
            {cotTab === "materiales" && <>
              <Sec t="Resinas" ico="🧪" right={<Btn text="+" sm color={C.grn} onClick={()=>setShowAddMatResina(true)} />} ch={<>
                {matResinas.map((r,i)=>(
                  <div key={r.id} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${selResina===r.id?C.acc:C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSelResina(r.id)}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700}}>{r.nombre}</div>
                      <div style={{fontSize:10,color:C.t3}}>{r.tipo} • {r.gramaje}g/m²</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:14,fontWeight:800,color:C.acc,fontFamily:"monospace"}}>${r.precio}/kg</div>
                      <button onClick={e=>{e.stopPropagation();setMatResinas(p=>p.filter(x=>x.id!==r.id));}} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  </div>
                ))}
              </>} />
              <Sec t="Papeles" ico="📜" right={<Btn text="+" sm color={C.grn} onClick={()=>setShowAddMatPapel(true)} />} ch={<>
                {matPapeles.map((p,i)=>(
                  <div key={p.id} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${selPapel===p.id?C.pur:C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer"}} onClick={()=>setSelPapel(p.id)}>
                    <div>
                      <div style={{fontSize:12,fontWeight:700}}>{p.nombre}</div>
                      <div style={{fontSize:10,color:C.t3}}>{p.tipo} • {p.gramaje}g/m²</div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <div style={{fontSize:14,fontWeight:800,color:C.pur,fontFamily:"monospace"}}>${p.precio}/kg</div>
                      <button onClick={e=>{e.stopPropagation();setMatPapeles(prev=>prev.filter(x=>x.id!==p.id));}} style={{background:"transparent",border:"none",color:C.red,cursor:"pointer",fontSize:14}}>✕</button>
                    </div>
                  </div>
                ))}
              </>} />
              <Btn text="💾 Guardar Materiales" color={C.acc} full onClick={saveMateriales} />

              {showAddMatResina && <Modal title="+ Resina" onClose={()=>setShowAddMatResina(false)} ch={<>
                <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newMatR.nombre} set={v=>setNewMatR(p=>({...p,nombre:v}))} ph="Ej: PEBD SM Resinas" />} />} />
                <R ch={<><F l="Tipo" w="32%" ch={<Sel v={newMatR.tipo} set={v=>setNewMatR(p=>({...p,tipo:v}))} opts={["PEBD","PEAD","Supreme","PELBD"]} />} /><F l="Gramaje" u="g/m²" w="32%" ch={<Inp v={newMatR.gramaje} set={v=>setNewMatR(p=>({...p,gramaje:v}))} />} /><F l="Precio" u="$/kg" w="32%" ch={<Inp v={newMatR.precio} set={v=>setNewMatR(p=>({...p,precio:v}))} pre="$" />} /></>} />
                <Btn text="Agregar" ico="✓" color={C.grn} full onClick={()=>{
                  if(!newMatR.nombre) return;
                  setMatResinas(p=>[...p,{id:genId(),nombre:newMatR.nombre,tipo:newMatR.tipo,precio:parseFloat(newMatR.precio)||32,gramaje:parseFloat(newMatR.gramaje)||15}]);
                  setShowAddMatResina(false);setNewMatR({nombre:"",tipo:"PEBD",precio:"32",gramaje:"15"});
                  showToast("Resina agregada");
                }} />
              </>} />}

              {showAddMatPapel && <Modal title="+ Papel" onClose={()=>setShowAddMatPapel(false)} ch={<>
                <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newMatP.nombre} set={v=>setNewMatP(p=>({...p,nombre:v}))} ph="Ej: Bond Arpapel 60g" />} />} />
                <R ch={<><F l="Tipo" w="32%" ch={<Sel v={newMatP.tipo} set={v=>setNewMatP(p=>({...p,tipo:v}))} opts={["Bond","Couché","Kraft","Recubierto"]} />} /><F l="Gramaje" u="g/m²" w="32%" ch={<Inp v={newMatP.gramaje} set={v=>setNewMatP(p=>({...p,gramaje:v}))} />} /><F l="Precio" u="$/kg" w="32%" ch={<Inp v={newMatP.precio} set={v=>setNewMatP(p=>({...p,precio:v}))} pre="$" />} /></>} />
                <Btn text="Agregar" ico="✓" color={C.grn} full onClick={()=>{
                  if(!newMatP.nombre) return;
                  setMatPapeles(p=>[...p,{id:genId(),nombre:newMatP.nombre,tipo:newMatP.tipo,precio:parseFloat(newMatP.precio)||20,gramaje:parseFloat(newMatP.gramaje)||80}]);
                  setShowAddMatPapel(false);setNewMatP({nombre:"",tipo:"Bond",precio:"20",gramaje:"80"});
                  showToast("Papel agregado");
                }} />
              </>} />}
            </>}

            {cotTab === "overhead" && <Sec t="Overhead Mensual" ico="⚙️" ch={<>
              <R ch={<><F l="Renta" w="48%" ch={<Inp v={oh.renta} set={v => setOh(p => ({...p, renta: parseFloat(v)||0}))} pre="$" />} /><F l="Luz" w="48%" ch={<Inp v={oh.luz} set={v => setOh(p => ({...p, luz: parseFloat(v)||0}))} pre="$" />} /></>} />
              <R ch={<><F l="Gas" w="48%" ch={<Inp v={oh.gas} set={v => setOh(p => ({...p, gas: parseFloat(v)||0}))} pre="$" />} /><F l="Agua" w="48%" ch={<Inp v={oh.agua} set={v => setOh(p => ({...p, agua: parseFloat(v)||0}))} pre="$" />} /></>} />
              <R ch={<><F l="Mant." w="48%" ch={<Inp v={oh.mantenimiento} set={v => setOh(p => ({...p, mantenimiento: parseFloat(v)||0}))} pre="$" />} /><F l="MO" w="48%" ch={<Inp v={oh.mo_directa} set={v => setOh(p => ({...p, mo_directa: parseFloat(v)||0}))} pre="$" />} /></>} />
              <R ch={<><F l="Socios" w="48%" ch={<Inp v={oh.socios} set={v => setOh(p => ({...p, socios: parseFloat(v)||0}))} pre="$" />} /><F l="Otros" w="48%" ch={<Inp v={oh.otros} set={v => setOh(p => ({...p, otros: parseFloat(v)||0}))} pre="$" />} /></>} />
              <R ch={<F l="Horas/mes" w="48%" ch={<Inp v={oh.horas_mes} set={v => setOh(p => ({...p, horas_mes: parseFloat(v)||176}))} />} />} />
              <div style={{ padding: 12, background: `${C.acc}08`, borderRadius: 6, marginTop: 8 }}>
                <RR l="Total/mes" v={calc.ohTotal} b />
                <RR l="OH/hora" v={calc.ohHr} b c={C.grn} />
              </div>
              <div style={{ marginTop: 10 }}><Btn text="💾 Guardar Overhead" color={C.acc} full onClick={saveOverhead} /></div>
            </>} />}
          </div>
        </>}

        {/* NÓMINAS */}
        {mod === "nominas" && isAdmin && <>
          <Tab tabs={[{ id: "empleados", ico: "👥", l: "Empleados" }, { id: "resumen", ico: "📊", l: "Resumen" }]} active={nomTab} set={setNomTab} />
          <div style={{ marginTop: 12 }}>
            {nomTab === "empleados" && <>
              <Sec t={`Plantilla (${nominaTotal.count})`} ico="👥" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddEmpleado(true)} />}
                ch={<>{nominaTotal.detalles.map((emp, i) => (
                  <div key={i} style={{ padding: 10, background: C.bg, borderRadius: 6, marginBottom: 6, border: `1px solid ${C.brd}` }}>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>{emp.nombre}</div>
                    <div style={{ fontSize: 10, color: C.t3, marginBottom: 6 }}>{emp.puesto}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, fontSize: 10 }}>
                      <div style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center" }}>
                        <div style={{ color: C.t3 }}>Neto</div>
                        <div style={{ fontWeight: 700, color: C.grn, fontFamily: "monospace" }}>${fmtI(emp.calc.sn)}</div>
                      </div>
                      <div style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center" }}>
                        <div style={{ color: C.t3 }}>Bruto</div>
                        <div style={{ fontWeight: 700, color: C.amb, fontFamily: "monospace" }}>${fmtI(emp.calc.sueldoBruto)}</div>
                      </div>
                      <div style={{ padding: 6, background: C.s2, borderRadius: 4, textAlign: "center" }}>
                        <div style={{ color: C.t3 }}>Costo</div>
                        <div style={{ fontWeight: 700, color: C.red, fontFamily: "monospace" }}>${fmtI(emp.calc.costoConProv)}</div>
                      </div>
                    </div>
                  </div>
                ))}</>}
              />
              {showAddEmpleado && <Modal title="+ Empleado" onClose={() => setShowAddEmpleado(false)} ch={<>
                <R ch={<F l="Nombre" w="100%" ch={<TxtInp v={newEmp.nombre} set={v => setNewEmp(p => ({...p, nombre: v}))} />} />} />
                <R ch={<><F l="Puesto" w="58%" ch={<Sel v={newEmp.puesto} set={v => setNewEmp(p => ({...p, puesto: v}))} opts={["Operador Extrusora", "Ayudante General", "Supervisor"]} />} /><F l="Neto" w="38%" ch={<Inp v={newEmp.sueldo_neto} set={v => setNewEmp(p => ({...p, sueldo_neto: v}))} pre="$" />} /></>} />
                <Btn text={saving ? "Guardando..." : "Agregar"} ico="✓" color={C.grn} full onClick={addEmpleado} disabled={saving} />
              </>} />}
            </>}
            {nomTab === "resumen" && <Sec t="Resumen Mensual" ico="📊" ch={<>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                <Card v={`$${fmtI(nominaTotal.totalNeto)}`} l="Neto (pago)" c={C.grn} ico="💵" />
                <Card v={`$${fmtI(nominaTotal.totalCosto)}`} l="Costo Real" c={C.red} ico="💰" />
              </div>
              <RR l="Empleados activos" v={nominaTotal.count} b />
              <RR l="Costo anual real" v={nominaTotal.totalCosto * 12} b c={C.red} />
            </>} />}
          </div>
        </>}

        {/* CONTABILIDAD */}
        {mod === "contabilidad" && isAdmin && <>
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
              <Sec t={`CxC`} ico="📄" right={<Btn text="+" sm color={C.grn} onClick={() => setShowAddFactura(true)} />}
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
              <Sec t={`Gastos`} ico="💸" right={<Btn text="+" sm color={C.amb} onClick={() => setShowAddGasto(true)} />}
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
        </>}

        {/* ═══ CRM ═══ */}
        {mod === "crm" && isAdmin && <>
          <Tab tabs={[{id:"pipeline",ico:"🔄",l:"Pipeline"},{id:"clientes",ico:"👥",l:"Clientes"},{id:"cotizaciones",ico:"📋",l:"Cotizaciones"}]} active={crmTab} set={v=>{setCrmTab(v);setShowClienteDetail(null);}} />
          <div style={{ marginTop: 12 }}>
            {/* CRM Metrics */}
            {!showClienteDetail && <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:12 }}>
              <Card v={clientes.filter(c=>c.etapa!=="perdido").length} l="Activos" s={`${clientes.filter(c=>c.etapa==="ganado").length} ganados`} c={C.grn} ico="🎯" />
              <Card v={`${fmtI(clientes.reduce((s,c)=>s+(parseFloat(c.tons_potenciales)||0),0))}`} l="Tons Pot." c={C.pur} ico="📦" />
              <Card v={`$${fmtI(cotCRM.reduce((s,q)=>s+(q.total||0),0))}`} l="Cotizado" s={`${cotCRM.length} cots`} c={C.acc} ico="💰" />
            </div>}

            {/* Pipeline */}
            {crmTab === "pipeline" && !showClienteDetail && <>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cliente" ico="👤" sm color={C.grn} onClick={()=>setShowAddCliente(true)} /></div>
              {STAGES.map(stg => {
                const sc = clientes.filter(c=>c.etapa===stg.id);
                if(!sc.length && stg.id==="perdido") return null;
                return <div key={stg.id} style={{marginBottom:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                    <span style={{fontSize:14}}>{stg.ico}</span>
                    <span style={{fontSize:11,fontWeight:700,color:stg.c,textTransform:"uppercase"}}>{stg.l}</span>
                    <Badge text={sc.length} color={stg.c} />
                  </div>
                  {sc.map(cl=>(
                    <div key={cl.id} onClick={()=>setShowClienteDetail(cl.id)} style={{padding:10,background:C.s2,borderRadius:8,border:`1px solid ${stg.c}20`,marginBottom:4,cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div>
                        <div style={{fontSize:13,fontWeight:700,color:C.t1}}>{cl.nombre}</div>
                        {cl.contacto && <div style={{fontSize:10,color:C.t3}}>{cl.contacto}{cl.ciudad&&` • ${cl.ciudad}`}</div>}
                      </div>
                      <div style={{textAlign:"right"}}>
                        {cl.tons_potenciales>0 && <div style={{fontSize:12,fontWeight:700,color:stg.c,fontFamily:"monospace"}}>{cl.tons_potenciales}t</div>}
                        <div style={{display:"flex",gap:2,marginTop:4}}>
                          {STAGES.filter(s=>s.id!==stg.id&&s.id!=="perdido").slice(0,3).map(s=>(
                            <button key={s.id} onClick={e=>{e.stopPropagation();updateCliente(cl.id,{etapa:s.id});}} style={{background:"transparent",border:`1px solid ${s.c}40`,color:s.c,fontSize:8,padding:"1px 4px",borderRadius:3,cursor:"pointer"}}>{s.ico}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                  {!sc.length && <div style={{padding:8,fontSize:11,color:C.t3,fontStyle:"italic"}}>Sin clientes</div>}
                </div>;
              })}
            </>}

            {/* Clientes List */}
            {crmTab === "clientes" && !showClienteDetail && <>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cliente" ico="👤" sm color={C.grn} onClick={()=>setShowAddCliente(true)} /></div>
              {!clientes.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>👥 Sin clientes</div> :
                clientes.map(cl=>{
                  const stg=STAGES.find(s=>s.id===cl.etapa);
                  return <div key={cl.id} onClick={()=>setShowClienteDetail(cl.id)} style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.brd}`,marginBottom:6,cursor:"pointer"}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div><div style={{fontSize:13,fontWeight:700}}>{cl.nombre}</div><div style={{fontSize:10,color:C.t3}}>{cl.contacto}{cl.ciudad&&` • ${cl.ciudad}`}</div></div>
                      <div style={{textAlign:"right"}}><Badge text={stg?.l} color={stg?.c} /><div style={{fontSize:10,color:C.t3,marginTop:4}}>{cl.tons_potenciales||0}t</div></div>
                    </div>
                  </div>;
                })}
            </>}

            {/* Client Detail */}
            {showClienteDetail && (()=>{
              const cl=clientes.find(c=>c.id===showClienteDetail);
              if(!cl) return <div style={{textAlign:"center",padding:30,color:C.t3}}>Cliente no encontrado</div>;
              const stg=STAGES.find(s=>s.id===cl.etapa);
              const clCots=cotCRM.filter(q=>q.cliente_id===cl.id);
              const clActs=actividades.filter(a=>a.cliente_id===cl.id);
              return <>
                <button onClick={()=>{setShowClienteDetail(null);setEditingCliente(false);}} style={{background:"transparent",border:"none",color:C.acc,cursor:"pointer",fontSize:11,marginBottom:8,padding:0}}>← Volver</button>
                <Sec t={cl.nombre} ico={stg?.ico||"👤"} col={stg?.c} right={<div style={{display:"flex",gap:4}}>
                  <Btn text="✏️" sm color={C.amb} outline onClick={()=>{setEditingCliente(true);setEditClienteData({nombre:cl.nombre||"",contacto:cl.contacto||"",email:cl.email||"",telefono:cl.telefono||"",ciudad:cl.ciudad||"",tons_potenciales:String(cl.tons_potenciales||0),notas:cl.notas||""});}} />
                  <Btn text="🗑️" sm color={C.red} outline onClick={()=>{if(confirm(`¿Eliminar ${cl.nombre}?`)){deleteCliente(cl.id);}}} />
                </div>} ch={<>
                  <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                    {STAGES.map(s=><button key={s.id} onClick={()=>updateCliente(cl.id,{etapa:s.id})} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:cl.etapa===s.id?s.c:"transparent",color:cl.etapa===s.id?"#fff":s.c,border:`1px solid ${s.c}40`}}>{s.ico} {s.l}</button>)}
                  </div>
                  {editingCliente ? <>
                    <R ch={<F l="Empresa" w="100%" ch={<TxtInp v={editClienteData.nombre} set={v=>setEditClienteData(p=>({...p,nombre:v}))} ph="Nombre empresa" />} />} />
                    <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={editClienteData.contacto} set={v=>setEditClienteData(p=>({...p,contacto:v}))} />} /><F l="Email" w="48%" ch={<TxtInp v={editClienteData.email} set={v=>setEditClienteData(p=>({...p,email:v}))} />} /></>} />
                    <R ch={<><F l="Teléfono" w="48%" ch={<TxtInp v={editClienteData.telefono} set={v=>setEditClienteData(p=>({...p,telefono:v}))} />} /><F l="Ciudad" w="48%" ch={<TxtInp v={editClienteData.ciudad} set={v=>setEditClienteData(p=>({...p,ciudad:v}))} />} /></>} />
                    <R ch={<F l="Tons Potenciales/Mes" w="48%" ch={<Inp v={editClienteData.tons_potenciales} set={v=>setEditClienteData(p=>({...p,tons_potenciales:v}))} />} />} />
                    <R ch={<F l="Notas" w="100%" ch={<TxtInp v={editClienteData.notas} set={v=>setEditClienteData(p=>({...p,notas:v}))} ph="Notas sobre el cliente..." />} />} />
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <Btn text="💾 Guardar" color={C.grn} full onClick={async()=>{
                        const updates={nombre:editClienteData.nombre,contacto:editClienteData.contacto,email:editClienteData.email,telefono:editClienteData.telefono,ciudad:editClienteData.ciudad,tons_potenciales:parseFloat(editClienteData.tons_potenciales)||0,notas:editClienteData.notas,updated_at:new Date().toISOString(),updated_by:currentUser?.nombre||"Sistema"};
                        await updateCliente(cl.id,updates);
                        logActivity(`Cliente editado: ${updates.nombre}`,cl.id);
                        setEditingCliente(false);
                        showToast("Cliente actualizado");
                      }} />
                      <Btn text="Cancelar" color={C.t3} outline onClick={()=>setEditingCliente(false)} />
                    </div>
                  </> : <>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                      <div><span style={{color:C.t3}}>Contacto:</span> {cl.contacto||"—"}</div>
                      <div><span style={{color:C.t3}}>Email:</span> {cl.email||"—"}</div>
                      <div><span style={{color:C.t3}}>Tel:</span> {cl.telefono||"—"}</div>
                      <div><span style={{color:C.t3}}>Ciudad:</span> {cl.ciudad||"—"}</div>
                      <div><span style={{color:C.t3}}>Tons:</span> <span style={{color:C.pur,fontWeight:700}}>{cl.tons_potenciales||0}</span></div>
                    </div>
                    {cl.notas && <div style={{marginTop:8,padding:8,background:C.bg,borderRadius:6,fontSize:11,color:C.t2}}>{cl.notas}</div>}
                    {cl.updated_by && <div style={{marginTop:6,fontSize:9,color:C.t3,fontStyle:"italic"}}>Última edición: {cl.updated_by} — {cl.updated_at?.split("T")[0]}</div>}
                  </>}
                </>} />
                <Sec t={`Cotizaciones (${clCots.length})`} ico="📋" right={<Btn text="+" sm color={C.grn} onClick={()=>{setNewCotCRM(p=>({...p,cliente_id:cl.id}));setShowAddCotCRM(true);}} />} ch={<>
                  {!clCots.length ? <div style={{textAlign:"center",padding:20,color:C.t3,fontSize:11}}>Sin cotizaciones</div> :
                    clCots.map(q=><div key={q.id} onClick={()=>setEditCot({...q, items: q.items||[{producto:"",cantidad:"1000",precio_kg:"39"}], pago: q.pago||"90 días", notas: q.notas||""})} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",cursor:"pointer"}}>
                      <div><span style={{fontSize:11,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{q.numero}</span><div style={{fontSize:10,color:C.t3}}>{q.fecha} • {q.pago}</div></div>
                      <div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>${fmtI(q.total)}</div><Badge text={q.status||"borrador"} color={q.status==="aceptada"?C.grn:q.status==="enviada"?C.amb:C.t3} /></div>
                    </div>)}
                </>} />
                {clActs.length>0 && <Sec t="Actividad" ico="📝" ch={<>{clActs.slice(0,10).map(a=><div key={a.id} style={{padding:"4px 0",borderBottom:`1px solid ${C.brd}`,fontSize:11,color:C.t2}}><span style={{color:C.t3,marginRight:6}}>{a.fecha?.split("T")[0]}</span>{a.texto}</div>)}</>} />}
              </>;
            })()}

            {/* Cotizaciones CRM */}
            {crmTab === "cotizaciones" && !showClienteDetail && <>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:8}}><Btn text="+ Cotización" ico="📋" sm color={C.grn} onClick={()=>setShowAddCotCRM(true)} /></div>
              {!cotCRM.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📋 Sin cotizaciones</div> :
                cotCRM.map(q=><div key={q.id} onClick={()=>setEditCot({...q, items: q.items||[{producto:"",cantidad:"1000",precio_kg:"39"}], pago: q.pago||"90 días", notas: q.notas||""})} style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.brd}`,marginBottom:6,cursor:"pointer"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontSize:12,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{q.numero}</span><div style={{fontSize:11,color:C.t2}}>{q.cliente_nombre}</div><div style={{fontSize:10,color:C.t3}}>{q.fecha} • {q.pago}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>${fmtI(q.total)}</div>
                      <Badge text={q.status||"borrador"} color={q.status==="aceptada"?C.grn:q.status==="enviada"?C.amb:q.status==="rechazada"?C.red:C.t3} />
                    </div>
                  </div>
                </div>)}
            </>}
          </div>

          {/* Edit Cotización Modal */}
          {editCot && <Modal title={`Editar ${editCot.numero}`} onClose={()=>setEditCot(null)} ch={<>
            <R ch={<><F l="Cliente" w="58%" ch={<TxtInp v={editCot.cliente_nombre||""} set={v=>setEditCot(p=>({...p,cliente_nombre:v}))} />} /><F l="Status" w="38%" ch={<Sel v={editCot.status||"borrador"} set={v=>setEditCot(p=>({...p,status:v}))} opts={[{v:"borrador",l:"Borrador"},{v:"enviada",l:"Enviada"},{v:"aceptada",l:"Aceptada"},{v:"rechazada",l:"Rechazada"}]} />} /></>} />
            {(editCot.items||[]).map((it,i)=><R key={i} ch={<><F l="Producto" w="40%" ch={<TxtInp v={it.producto||""} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],producto:v};setEditCot(p=>({...p,items:ni}));}} />} /><F l="Kg" w="25%" ch={<Inp v={String(it.cantidad||"")} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],cantidad:v};setEditCot(p=>({...p,items:ni}));}} />} /><F l="$/kg" w="25%" ch={<Inp v={String(it.precio_kg||"")} set={v=>{const ni=[...(editCot.items||[])];ni[i]={...ni[i],precio_kg:v};setEditCot(p=>({...p,items:ni}));}} pre="$" />} /></>} />)}
            <Btn text="+ Producto" sm outline color={C.acc} onClick={()=>setEditCot(p=>({...p,items:[...(p.items||[]),{producto:"",cantidad:"1000",precio_kg:"39"}]}))} />
            <div style={{marginTop:8}}><R ch={<><F l="Pago" w="48%" ch={<Sel v={editCot.pago||"90 días"} set={v=>setEditCot(p=>({...p,pago:v}))} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} /><F l="Notas" w="48%" ch={<TxtInp v={editCot.notas||""} set={v=>setEditCot(p=>({...p,notas:v}))} />} /></>} /></div>
            <div style={{padding:8,background:`${C.grn}10`,borderRadius:6,marginBottom:10,textAlign:"right"}}>
              <span style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>Total: ${fmtI((editCot.items||[]).reduce((s,i)=>s+(parseFloat(i.cantidad)||0)*(parseFloat(i.precio_kg)||0),0))}</span>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn text={saving?"Guardando...":"💾 Guardar Cambios"} color={C.grn} full onClick={async()=>{
                setSaving(true);
                const items=(editCot.items||[]).map(it=>({...it,subtotal:(parseFloat(it.cantidad)||0)*(parseFloat(it.precio_kg)||0)}));
                const total=items.reduce((s,i)=>s+i.subtotal,0);
                const updates={items,total,status:editCot.status,pago:editCot.pago,notas:editCot.notas,cliente_nombre:editCot.cliente_nombre,updated_by:currentUser?.nombre||"Sistema",updated_at:new Date().toISOString()};
                setCotCRM(p=>p.map(c=>c.id===editCot.id?{...c,...updates}:c));
                try{await supabase.from('cotizaciones_crm').update(updates).eq('id',editCot.id);}catch{}
                showToast(`${editCot.numero} actualizada`);
                logActivity(`Cotización ${editCot.numero} editada — $${fmtI(total)}`,editCot.cliente_id);
                setEditCot(null);setSaving(false);
              }} disabled={saving} />
              <Btn text="🗑️" sm color={C.red} outline onClick={async()=>{
                if(!confirm(`¿Eliminar ${editCot.numero}?`)) return;
                setCotCRM(p=>p.filter(c=>c.id!==editCot.id));
                try{await supabase.from('cotizaciones_crm').delete().eq('id',editCot.id);}catch{}
                showToast(`${editCot.numero} eliminada`);
                logActivity(`Cotización ${editCot.numero} eliminada`,editCot.cliente_id);
                setEditCot(null);
              }} />
            </div>
          </>} />}

          {/* Add Cliente Modal */}
          {showAddCliente && <Modal title="+ Cliente" onClose={()=>setShowAddCliente(false)} ch={<>
            <R ch={<F l="Empresa *" w="100%" ch={<TxtInp v={newCliente.nombre} set={v=>setNewCliente(p=>({...p,nombre:v}))} ph="Nombre empresa" />} />} />
            <R ch={<><F l="Contacto" w="48%" ch={<TxtInp v={newCliente.contacto} set={v=>setNewCliente(p=>({...p,contacto:v}))} />} /><F l="Email" w="48%" ch={<TxtInp v={newCliente.email} set={v=>setNewCliente(p=>({...p,email:v}))} />} /></>} />
            <R ch={<><F l="Teléfono" w="48%" ch={<TxtInp v={newCliente.telefono} set={v=>setNewCliente(p=>({...p,telefono:v}))} />} /><F l="Ciudad" w="48%" ch={<TxtInp v={newCliente.ciudad} set={v=>setNewCliente(p=>({...p,ciudad:v}))} />} /></>} />
            <R ch={<><F l="Etapa" w="48%" ch={<Sel v={newCliente.etapa} set={v=>setNewCliente(p=>({...p,etapa:v}))} opts={STAGES.map(s=>({v:s.id,l:`${s.ico} ${s.l}`}))} />} /><F l="Tons Pot./Mes" w="48%" ch={<Inp v={newCliente.tons_potenciales} set={v=>setNewCliente(p=>({...p,tons_potenciales:v}))} />} /></>} />
            <R ch={<F l="Notas" w="100%" ch={<TxtInp v={newCliente.notas} set={v=>setNewCliente(p=>({...p,notas:v}))} ph="Notas sobre el cliente..." />} />} />
            <Btn text={saving?"Guardando...":"Crear Cliente"} ico="✓" color={C.grn} full onClick={async()=>{
              if(!newCliente.nombre) return;
              setSaving(true);
              let data; try { const r = await supabase.from('clientes').insert({...newCliente,tons_potenciales:parseFloat(newCliente.tons_potenciales)||0}).select(); data = r.data; } catch { data = [{...newCliente,id:genId(),tons_potenciales:parseFloat(newCliente.tons_potenciales)||0,created_at:new Date().toISOString()}]; }
              if(data?.[0]){setClientes(p=>[data[0],...p]);showToast(`${newCliente.nombre} agregado`);logActivity(`Nuevo cliente: ${newCliente.nombre}`,data[0].id);}
              setShowAddCliente(false);setNewCliente({nombre:"",contacto:"",email:"",telefono:"",ciudad:"",etapa:"lead",notas:"",tons_potenciales:"0"});setSaving(false);
            }} disabled={saving} />
          </>} />}

          {/* Add Cotización CRM Modal */}
          {showAddCotCRM && <Modal title="+ Cotización CRM" onClose={()=>setShowAddCotCRM(false)} ch={<>
            <R ch={<F l="Cliente *" w="100%" ch={<Sel v={newCotCRM.cliente_id} set={v=>setNewCotCRM(p=>({...p,cliente_id:v}))} opts={clientes.map(c=>({v:c.id,l:c.nombre}))} ph="Seleccionar..." />} />} />
            {newCotCRM.items.map((it,i)=><R key={i} ch={<><F l="Producto" w="40%" ch={<TxtInp v={it.producto} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],producto:v};setNewCotCRM(p=>({...p,items:ni}));}} />} /><F l="Kg" w="25%" ch={<Inp v={it.cantidad} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],cantidad:v};setNewCotCRM(p=>({...p,items:ni}));}} />} /><F l="$/kg" w="25%" ch={<Inp v={it.precio_kg} set={v=>{const ni=[...newCotCRM.items];ni[i]={...ni[i],precio_kg:v};setNewCotCRM(p=>({...p,items:ni}));}} pre="$" />} /></>} />)}
            <Btn text="+ Producto" sm outline color={C.acc} onClick={()=>setNewCotCRM(p=>({...p,items:[...p.items,{producto:"",cantidad:"1000",precio_kg:"39"}]}))} />
            <div style={{marginTop:8}}><R ch={<><F l="Pago" w="48%" ch={<Sel v={newCotCRM.pago} set={v=>setNewCotCRM(p=>({...p,pago:v}))} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} /><F l="Notas" w="48%" ch={<TxtInp v={newCotCRM.notas} set={v=>setNewCotCRM(p=>({...p,notas:v}))} />} /></>} /></div>
            <div style={{padding:8,background:`${C.grn}10`,borderRadius:6,marginBottom:10,textAlign:"right"}}>
              <span style={{fontSize:14,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>Total: ${fmtI(newCotCRM.items.reduce((s,i)=>s+(parseFloat(i.cantidad)||0)*(parseFloat(i.precio_kg)||0),0))}</span>
            </div>
            <Btn text={saving?"Creando...":"Crear Cotización"} ico="✓" color={C.grn} full onClick={async()=>{
              if(!newCotCRM.cliente_id) return; setSaving(true);
              const cl=clientes.find(c=>c.id===newCotCRM.cliente_id);
              const items=newCotCRM.items.map(it=>({...it,subtotal:(parseFloat(it.cantidad)||0)*(parseFloat(it.precio_kg)||0)}));
              const total=items.reduce((s,i)=>s+i.subtotal,0);
              const numero=`KP-${String(cotCRM.length+1).padStart(4,"0")}`;
              const cotData={numero,cliente_id:newCotCRM.cliente_id,cliente_nombre:cl?.nombre,items,total,pago:newCotCRM.pago,notas:newCotCRM.notas,fecha:today(),status:"borrador"};
              let data; try { const r = await supabase.from('cotizaciones_crm').insert(cotData).select(); data = r.data; } catch { data = [{...cotData,id:genId()}]; }
              if(data?.[0]){setCotCRM(p=>[data[0],...p]);if(cl&&["lead","contactado"].includes(cl.etapa)){updateCliente(cl.id,{etapa:"cotizado"});}showToast(`${numero} creada`);logActivity(`Cotización ${numero} — $${fmtI(total)}`,cl?.id);}
              setShowAddCotCRM(false);setNewCotCRM({cliente_id:"",items:[{producto:"PE 60/15",cantidad:"1000",precio_kg:"39"}],pago:"90 días",notas:""});setSaving(false);
            }} disabled={saving} />
          </>} />}
        </>}

        {/* ═══ SOLICITUDES ═══ */}
        {mod === "solicitudes" && isAdmin && <>
          <Sec t={`Pendientes (${pendingSolicitudes.length})`} ico="🔴" col={pendingSolicitudes.length?C.red:C.brd} ch={<>
            {!pendingSolicitudes.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>✅ Sin solicitudes pendientes</div> :
              pendingSolicitudes.map(s=>(
                <div key={s.id} style={{padding:12,background:C.bg,borderRadius:8,marginBottom:6,border:`1px solid ${C.amb}40`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div>
                      <span style={{fontSize:12,fontWeight:700,fontFamily:"monospace",color:C.amb}}>{s.registro_codigo}</span>
                      <Badge text={s.tipo} color={C.pur} />
                    </div>
                    <span style={{fontSize:9,color:C.t3}}>{s.created_at?.split("T")[0]}</span>
                  </div>
                  <div style={{fontSize:12,color:C.t1,marginBottom:4}}>"{s.motivo}"</div>
                  <div style={{fontSize:10,color:C.t3,marginBottom:8}}>Solicitó: {s.solicitante}</div>
                  <div style={{display:"flex",gap:8}}>
                    <Btn text="✅ Aprobar" sm color={C.grn} onClick={()=>resolverSolicitud(s.id,"aprobada")} />
                    <Btn text="❌ Rechazar" sm color={C.red} outline onClick={()=>resolverSolicitud(s.id,"rechazada")} />
                  </div>
                </div>
              ))}
          </>} />
          <Sec t={`Historial (${solicitudes.filter(s=>s.status!=="pendiente").length})`} ico="📋" ch={<>
            {solicitudes.filter(s=>s.status!=="pendiente").slice(0,20).map(s=>(
              <div key={s.id} style={{padding:8,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <div>
                  <span style={{fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{s.registro_codigo}</span>
                  <div style={{fontSize:10,color:C.t3}}>{s.motivo}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <Badge text={s.status} color={s.status==="aprobada"?C.grn:C.red} />
                  <div style={{fontSize:9,color:C.t3,marginTop:2}}>{s.resuelto_por}</div>
                </div>
              </div>
            ))}
          </>} />
        </>}

        {/* ═══ ACTIVIDAD LOG ═══ */}
        {mod === "actividad" && isAdmin && (()=>{
          const filteredActs = actividades.filter(a => {
            if (actLogFilter.cliente && a.cliente_id !== actLogFilter.cliente) return false;
            if (actLogFilter.buscar && !a.texto?.toLowerCase().includes(actLogFilter.buscar.toLowerCase())) return false;
            if (actLogFilter.fecha && a.fecha?.split("T")[0] !== actLogFilter.fecha) return false;
            return true;
          });
          return <>
            <Sec t="Filtros" ico="🔍" ch={<>
              <R ch={<><F l="Buscar" w="48%" ch={<TxtInp v={actLogFilter.buscar} set={v=>setActLogFilter(p=>({...p,buscar:v}))} ph="Buscar en log..." />} /><F l="Fecha" w="48%" ch={<DateInp v={actLogFilter.fecha} set={v=>setActLogFilter(p=>({...p,fecha:v}))} />} /></>} />
              <R ch={<><F l="Cliente" w="48%" ch={<Sel v={actLogFilter.cliente} set={v=>setActLogFilter(p=>({...p,cliente:v}))} opts={[{v:"",l:"Todos"},...clientes.map(c=>({v:c.id,l:c.nombre}))]} />} /><F l="" w="48%" ch={<Btn text="Limpiar filtros" sm outline color={C.t3} onClick={()=>setActLogFilter({buscar:"",cliente:"",fecha:""})} />} /></>} />
            </>} />
            <Sec t={`Actividad (${filteredActs.length})`} ico="📝" ch={<>
              {!filteredActs.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📝 Sin actividad con estos filtros</div> :
                filteredActs.slice(0, 50).map(a => {
                  const clName = a.cliente_id ? clientes.find(c=>c.id===a.cliente_id)?.nombre : null;
                  return (
                    <div key={a.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.brd}`}}>
                      <div style={{width:6,height:6,borderRadius:"50%",background:a.texto?.includes("eliminad")?C.red:a.texto?.includes("Cotización")?C.grn:a.texto?.includes("editad")?C.amb:C.acc,marginTop:5,flexShrink:0}} />
                      <div style={{flex:1}}>
                        <div style={{fontSize:12,color:C.t1}}>{a.texto}</div>
                        <div style={{display:"flex",gap:8,fontSize:10,color:C.t3,marginTop:2,flexWrap:"wrap"}}>
                          <span>{a.fecha?.split("T")[0]}</span>
                          <span>👤 {a.usuario}</span>
                          {clName && <span style={{color:C.acc}}>🏢 {clName}</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </>} />
          </>;
        })()}

        {!isAdmin && mod !== "produccion" && (
          <div style={{ textAlign: "center", padding: 40, color: C.t3 }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: 13 }}>Acceso restringido</div>
          </div>
        )}
      </div>
    </div>
  );
}
