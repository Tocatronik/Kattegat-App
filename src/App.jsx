import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabase";

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
  const [mod, setMod] = useState("produccion");
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

  // Load initial data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
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
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const user = currentUser || { nombre: 'Usuario', rol: 'operador' };
  const isAdmin = user.rol === 'admin';

  const modules = [
    { id: "produccion", l: "Producción", ico: "🏭", admin: false },
    { id: "cotizador", l: "Cotizador", ico: "⚖️", admin: true },
    { id: "crm", l: "CRM", ico: "🎯", admin: true },
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
  const [newResina, setNewResina] = useState({ tipo: "PEBD", peso: "25", proveedor: "SM Resinas Mexico", costo: "32" });
  const [newPapel, setNewPapel] = useState({ cliente: "Arpapel", tipo: "Bond", gramaje: "80", ancho: "980", metros: "2500", peso: "196", proveedor: "Productos Arpapel" });
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
      status: 'disponible'
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
      status: 'disponible'
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
      status: 'pendiente'
    }).select();
    if (!error && data) setOts(prev => [data[0], ...prev]);
    setShowAddOT(false);
    setNewOT({ cliente: "Arpapel", tipo: "maquila", producto: "", diasCredito: "30" });
    setSaving(false);
  };

  const updateOTStatus = async (id, newStatus) => {
    const updates = { status: newStatus };
    if (newStatus === 'en_proceso') updates.fecha_inicio = today();
    if (newStatus === 'completada') updates.fecha_fin = today();
    
    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
    if (!error) setOts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
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
      status: 'terminada'
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
  const [ancho, setAncho] = useState("980");
  const [velMaq, setVelMaq] = useState("80");
  const [merma, setMerma] = useState("5");
  const [margen, setMargen] = useState("35");
  const [q1, setQ1] = useState("1000");
  const [q2, setQ2] = useState("5000");
  const [q3, setQ3] = useState("10000");
  const [oh, setOh] = useState(config.overhead || { renta: 25000, luz: 35000, gas: 5000, agua: 2000, mantenimiento: 30000, mo_directa: 45000, socios: 60000, otros: 10000, horas_mes: 176 });
  const [condPago, setCondPago] = useState("90 días");
  const [validez, setValidez] = useState("15");

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
    try {
      await supabase.from('configuracion').upsert({ clave: 'materiales', valor: { resinas: matResinas, papeles: matPapeles } });
      showToast("Materiales guardados");
    } catch {}
  };

  const saveOverhead = async () => {
    try {
      await supabase.from('configuracion').upsert({ clave: 'overhead', valor: oh });
      showToast("Overhead guardado");
    } catch {}
  };

  const resinaActual = matResinas.find(r => r.id === selResina) || matResinas[0] || { precio: 32, gramaje: 15 };
  const papelActual = matPapeles.find(p => p.id === selPapel) || matPapeles[0] || { precio: 20, gramaje: 80 };

  const calc = useMemo(() => {
    const pGr = parseFloat(resinaActual.gramaje) || 15;
    const papGrV = parseFloat(papelActual.gramaje) || 80;
    const rP = parseFloat(resinaActual.precio) || 32;
    const pP = parseFloat(papelActual.precio) || 20;
    const aM = (parseFloat(ancho) || 0) / 1000;
    const vel = parseFloat(velMaq) || 80;
    const merm = (parseFloat(merma) || 5) / 100;
    const marg = (parseFloat(margen) || 35) / 100;
    const esMaq = tipo === "maquila";
    const peKgPorM = (pGr * aM) / 1000;
    const papKgPorM = (papGrV * aM) / 1000;
    const totalGrM2 = papGrV + pGr;
    const kgTotPorM = (totalGrM2 * aM) / 1000;
    const mPorHr = vel * 60;
    const ohTotal = (oh.renta||0)+(oh.luz||0)+(oh.gas||0)+(oh.agua||0)+(oh.mantenimiento||0)+(oh.mo_directa||0)+(oh.socios||0)+(oh.otros||0);
    const ohHr = ohTotal / (oh.horas_mes || 176);
    const calcQ = (qKg) => {
      if (!qKg || qKg <= 0) return null;
      const mLin = qKg / kgTotPorM;
      const m2 = mLin * aM;
      const hrs = mLin / mPorHr;
      const resinaKg = (peKgPorM * mLin) * (1 + merm);
      const papelKg = esMaq ? 0 : papKgPorM * mLin;
      const costoResina = resinaKg * rP;
      const costoPapel = papelKg * pP;
      const costoOH = hrs * ohHr;
      const costoTotal = costoResina + costoPapel + costoOH;
      const precioVenta = costoTotal / (1 - marg);
      const utilidad = precioVenta - costoTotal;
      const pk = precioVenta / qKg;
      const pm2 = precioVenta / m2;
      return { q: qKg, mLin, m2, hrs, resinaKg, papelKg, costoResina, costoPapel, costoOH, costoTotal, precioVenta, utilidad, pk, pm2, pv: precioVenta, ut: utilidad };
    };
    return { e1: calcQ(parseFloat(q1)||0), e2: calcQ(parseFloat(q2)||0), e3: calcQ(parseFloat(q3)||0), ohTotal, ohHr, totalGrM2, esMaq, pGr, papGrV, rP, pP };
  }, [resinaActual, papelActual, ancho, velMaq, merma, margen, q1, q2, q3, tipo, oh]);

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
      pago: condPago, notas: `${papelActual.gramaje}g + ${resinaActual.gramaje}µ PE | Ancho ${ancho}mm | Margen ${margen}% | Validez ${validez} días`,
      fecha: today(), status: "borrador",
      resina: resinaActual.nombre, papel: papelActual.nombre,
      estructura: `${papelActual.gramaje}/${resinaActual.gramaje}`,
    };
    const { data } = await supabase.from('cotizaciones_crm').insert(cotData).select().catch(() => ({ data: [{ ...cotData, id: genId() }] }));
    if (data?.[0]) {
      setCotCRM(prev => [data[0], ...prev]);
      if (cl && ["lead", "contactado"].includes(cl.etapa)) updateCliente(cl.id, { etapa: "cotizado" });
      showToast(`Cotización ${numero} guardada`);
      logActivity(`Cotización ${numero} — $${fmtI(escenarios[0].pv)} para ${cliente}`, cl?.id);
    }
    setSaving(false);
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
      status: 'pendiente'
    }).select();
    if (!error && data) setFacturas(prev => [data[0], ...prev]);
    setShowAddFactura(false);
    setNewFact({ cliente: "", concepto: "", monto: "", diasCredito: "30", fechaEmision: today() });
    setSaving(false);
  };

  const markFacturaCobrada = async (id) => {
    const { error } = await supabase.from('facturas').update({ status: 'cobrada', fecha_cobro: today() }).eq('id', id);
    if (!error) setFacturas(prev => prev.map(f => f.id === id ? { ...f, status: 'cobrada', fecha_cobro: today() } : f));
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
      comprobante: newGasto.comprobante
    }).select();
    if (!error && data) setGastos(prev => [data[0], ...prev]);
    setShowAddGasto(false);
    setNewGasto({ concepto: "", categoria: "materia_prima", monto: "", fecha: today(), comprobante: "" });
    setSaving(false);
  };

  // CRM DB Operations
  const updateCliente = async (id, updates) => {
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
    try { await supabase.from('clientes').update(updates).eq('id', id); } catch {}
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
          <button onClick={() => setShowUserModal(true)} style={{
            background: C.s2, border: `1px solid ${C.brd}`, borderRadius: 6, padding: "3px 8px",
            color: C.t1, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
          }}>👤 {user.nombre?.split(" ")[0]} <Badge text={isAdmin ? "A" : "O"} color={isAdmin ? C.acc : C.amb} /></button>
        </div>
        <div style={{ display: "flex", gap: 3, overflowX: "auto" }}>
          {accessibleMods.map(m => (
            <button key={m.id} onClick={() => setMod(m.id)} style={{
              padding: "5px 10px", borderRadius: 6, border: mod === m.id ? `1px solid ${C.acc}` : "none",
              background: mod === m.id ? `${C.acc}15` : "transparent", color: mod === m.id ? C.acc : C.t3,
              fontSize: 11, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3, whiteSpace: "nowrap",
            }}><span>{m.ico}</span>{m.l}</button>
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
                      <div style={{ fontSize: 10, color: C.t3, marginTop: 2 }}><b style={{ color: C.t2 }}>{r.proveedor_nombre}</b> • ${r.costo_kg}/kg</div>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800, fontFamily: "monospace" }}>{r.peso_kg}kg</div>
                  </div>
                ))}</>}
              />
              {showAddResina && <Modal title="+ Resina" onClose={() => setShowAddResina(false)} ch={<>
                <R ch={<><F l="Tipo" w="48%" ch={<Sel v={newResina.tipo} set={v => setNewResina(p => ({...p, tipo: v}))} opts={["PEBD", "PEAD", "Supreme", "PELBD"]} />} /><F l="Peso" u="kg" w="48%" ch={<Inp v={newResina.peso} set={v => setNewResina(p => ({...p, peso: v}))} />} /></>} />
                <R ch={<F l="Proveedor" w="100%" ch={<Sel v={newResina.proveedor} set={v => setNewResina(p => ({...p, proveedor: v}))} opts={["SM Resinas Mexico", "Consorcio DQ", "Promaplast", "Otro"]} />} />} />
                <R ch={<F l="Costo" u="$/kg" w="48%" ch={<Inp v={newResina.costo} set={v => setNewResina(p => ({...p, costo: v}))} pre="$" />} />} />
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
                    <div style={{ fontSize: 10, color: C.t2 }}>{p.cliente_nombre} • {p.proveedor}</div>
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 2 }}>
                      <span>{p.gramaje}g/m²</span><span>↔{p.ancho_mm}mm</span><span>📏{fmtI(p.metros_lineales)}m</span><span>⚖️{p.peso_kg}kg</span>
                    </div>
                  </div>
                ))}</>}
              />
              {showAddPapel && <Modal title="+ Papel" onClose={() => setShowAddPapel(false)} ch={<>
                <R ch={<><F l="Cliente" w="48%" ch={<TxtInp v={newPapel.cliente} set={v => setNewPapel(p => ({...p, cliente: v}))} />} /><F l="Tipo" w="48%" ch={<Sel v={newPapel.tipo} set={v => setNewPapel(p => ({...p, tipo: v}))} opts={["Bond", "Recubierto", "Kraft", "Couché"]} />} /></>} />
                <R ch={<F l="Proveedor" w="100%" ch={<TxtInp v={newPapel.proveedor} set={v => setNewPapel(p => ({...p, proveedor: v}))} />} />} />
                <R ch={<><F l="Gramaje" w="32%" ch={<Inp v={newPapel.gramaje} set={v => setNewPapel(p => ({...p, gramaje: v}))} />} /><F l="Ancho" u="mm" w="32%" ch={<Inp v={newPapel.ancho} set={v => setNewPapel(p => ({...p, ancho: v}))} />} /><F l="Metros" w="32%" ch={<Inp v={newPapel.metros} set={v => setNewPapel(p => ({...p, metros: v}))} />} /></>} />
                <R ch={<F l="Peso" u="kg" w="48%" ch={<Inp v={newPapel.peso} set={v => setNewPapel(p => ({...p, peso: v}))} />} />} />
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
                    <div style={{ display: "flex", gap: 8, fontSize: 10, color: C.t3, marginTop: 4 }}>
                      <span>📦 {ot.bobinas_producidas || 0}</span><span>📏 {fmtI(ot.metros_producidos || 0)}m</span><span>💳 {ot.dias_credito}d</span>
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
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 14, fontWeight: 800, fontFamily: "monospace" }}>{b.peso_kg}kg</div>
                        <div style={{ fontSize: 9, color: C.t3 }}>{fmtI((b.metros_lineales || 0) * (b.ancho_mm || 0) / 1000)}m²</div>
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
                <R ch={<><F l="🧪 Resina" w="48%" ch={<Sel v={selResina} set={setSelResina} opts={matResinas.map(r=>({v:r.id,l:`${r.nombre} ($${r.precio}/kg)`}))} />} /><F l="📜 Papel" w="48%" ch={<Sel v={selPapel} set={setSelPapel} opts={matPapeles.map(p=>({v:p.id,l:`${p.nombre} ($${p.precio}/kg)`}))} />} /></>} />
                <R ch={<><F l="Ancho" u="mm" w="32%" ch={<Inp v={ancho} set={setAncho} />} /><F l="Vel" u="m/min" w="32%" ch={<Inp v={velMaq} set={setVelMaq} />} /><F l="Merma" u="%" w="32%" ch={<Inp v={merma} set={setMerma} />} /></>} />
                <R ch={<><F l="Margen" u="%" w="32%" ch={<Inp v={margen} set={setMargen} />} /><F l="Pago" w="32%" ch={<Sel v={condPago} set={setCondPago} opts={["Anticipo 50%","30 días","60 días","90 días","Contra entrega"]} />} /><F l="Validez" u="días" w="32%" ch={<Inp v={validez} set={setValidez} />} /></>} />
                <div style={{ padding: "8px 10px", background: `${C.grn}10`, borderRadius: 6, fontSize: 11, color: C.t2 }}>
                  <div>📜 {papelActual.nombre}: <b>{papelActual.gramaje}g/m²</b> @ <b style={{color:C.amb}}>${papelActual.precio}/kg</b></div>
                  <div>🧪 {resinaActual.nombre}: <b>{resinaActual.gramaje}g/m² (µ)</b> @ <b style={{color:C.amb}}>${resinaActual.precio}/kg</b></div>
                  <div style={{marginTop:4}}>Estructura: {papelActual.gramaje}g + {resinaActual.gramaje}g = <b style={{ color: C.grn }}>{calc.totalGrM2}g/m²</b> {tipo==="maquila" && <Badge text="Solo maquila (sin costo papel)" color={C.amb} />}</div>
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
                        <RR l="Overhead" v={e.costoOH} sm />
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
              {[calc.e1, calc.e2, calc.e3].some(Boolean) && <div style={{ marginTop: 4 }}>
                <Btn text={saving ? "Guardando..." : "💾 Guardar Cotización → CRM"} color={C.grn} full onClick={guardarCotizacion} disabled={saving || !cliente} />
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
                <button onClick={()=>setShowClienteDetail(null)} style={{background:"transparent",border:"none",color:C.acc,cursor:"pointer",fontSize:11,marginBottom:8,padding:0}}>← Volver</button>
                <Sec t={cl.nombre} ico={stg?.ico||"👤"} col={stg?.c} right={<Btn text="🗑️" sm color={C.red} outline onClick={()=>{if(confirm(`¿Eliminar ${cl.nombre}?`)){deleteCliente(cl.id);}}} />} ch={<>
                  <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
                    {STAGES.map(s=><button key={s.id} onClick={()=>updateCliente(cl.id,{etapa:s.id})} style={{padding:"4px 8px",borderRadius:6,fontSize:10,fontWeight:600,cursor:"pointer",background:cl.etapa===s.id?s.c:"transparent",color:cl.etapa===s.id?"#fff":s.c,border:`1px solid ${s.c}40`}}>{s.ico} {s.l}</button>)}
                  </div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:11}}>
                    <div><span style={{color:C.t3}}>Contacto:</span> {cl.contacto||"—"}</div>
                    <div><span style={{color:C.t3}}>Email:</span> {cl.email||"—"}</div>
                    <div><span style={{color:C.t3}}>Tel:</span> {cl.telefono||"—"}</div>
                    <div><span style={{color:C.t3}}>Ciudad:</span> {cl.ciudad||"—"}</div>
                    <div><span style={{color:C.t3}}>Tons:</span> <span style={{color:C.pur,fontWeight:700}}>{cl.tons_potenciales||0}</span></div>
                  </div>
                  {cl.notas && <div style={{marginTop:8,padding:8,background:C.bg,borderRadius:6,fontSize:11,color:C.t2}}>{cl.notas}</div>}
                </>} />
                <Sec t={`Cotizaciones (${clCots.length})`} ico="📋" right={<Btn text="+" sm color={C.grn} onClick={()=>{setNewCotCRM(p=>({...p,cliente_id:cl.id}));setShowAddCotCRM(true);}} />} ch={<>
                  {!clCots.length ? <div style={{textAlign:"center",padding:20,color:C.t3,fontSize:11}}>Sin cotizaciones</div> :
                    clCots.map(q=><div key={q.id} style={{padding:10,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,display:"flex",justifyContent:"space-between"}}>
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
                cotCRM.map(q=><div key={q.id} style={{padding:12,background:C.s2,borderRadius:8,border:`1px solid ${C.brd}`,marginBottom:6}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><span style={{fontSize:12,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{q.numero}</span><div style={{fontSize:11,color:C.t2}}>{q.cliente_nombre}</div><div style={{fontSize:10,color:C.t3}}>{q.fecha} • {q.pago}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:16,fontWeight:800,color:C.grn,fontFamily:"monospace"}}>${fmtI(q.total)}</div>
                      <select value={q.status||"borrador"} onChange={async e=>{const ns=e.target.value;setCotCRM(p=>p.map(c=>c.id===q.id?{...c,status:ns}:c));try{await supabase.from('cotizaciones_crm').update({status:ns}).eq('id',q.id);}catch{} showToast(`${q.numero} → ${ns}`);}} style={{background:C.bg,border:`1px solid ${C.brd}`,borderRadius:4,color:C.t2,fontSize:10,padding:"2px 4px",marginTop:4}}>
                        <option value="borrador">Borrador</option><option value="enviada">Enviada</option><option value="aceptada">Aceptada</option><option value="rechazada">Rechazada</option>
                      </select>
                    </div>
                  </div>
                </div>)}
            </>}
          </div>

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
              const {data}=await supabase.from('clientes').insert({...newCliente,tons_potenciales:parseFloat(newCliente.tons_potenciales)||0}).select().catch(()=>({data:[{...newCliente,id:genId(),tons_potenciales:parseFloat(newCliente.tons_potenciales)||0,created_at:new Date().toISOString()}]}));
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
              const {data}=await supabase.from('cotizaciones_crm').insert(cotData).select().catch(()=>({data:[{...cotData,id:genId()}]}));
              if(data?.[0]){setCotCRM(p=>[data[0],...p]);if(cl&&["lead","contactado"].includes(cl.etapa)){updateCliente(cl.id,{etapa:"cotizado"});}showToast(`${numero} creada`);logActivity(`Cotización ${numero} — $${fmtI(total)}`,cl?.id);}
              setShowAddCotCRM(false);setNewCotCRM({cliente_id:"",items:[{producto:"PE 60/15",cantidad:"1000",precio_kg:"39"}],pago:"90 días",notas:""});setSaving(false);
            }} disabled={saving} />
          </>} />}
        </>}

        {/* ═══ ACTIVIDAD LOG ═══ */}
        {mod === "actividad" && isAdmin && <Sec t={`Registro de Actividad (${actividades.length})`} ico="📝" ch={<>
          {!actividades.length ? <div style={{textAlign:"center",padding:30,color:C.t3}}>📝 Sin actividad</div> :
            actividades.slice(0, 50).map(a => (
              <div key={a.id} style={{display:"flex",gap:8,padding:"8px 0",borderBottom:`1px solid ${C.brd}`}}>
                <div style={{width:6,height:6,borderRadius:"50%",background:C.acc,marginTop:5,flexShrink:0}} />
                <div>
                  <div style={{fontSize:12,color:C.t1}}>{a.texto}</div>
                  <div style={{fontSize:10,color:C.t3,marginTop:2}}>{a.fecha?.split("T")[0]} • {a.usuario}</div>
                </div>
              </div>
            ))}
        </>} />}

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
