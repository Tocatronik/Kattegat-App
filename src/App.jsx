import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from "./supabase";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import { C, STAGES, TEMP_ZONES, defaultTemps, DEFAULT_RESINAS, DEFAULT_PAPELES } from './utils/constants';
import { genId, fmt, fmtI, today, daysDiff } from './utils/helpers';
import { calcNomina } from './utils/calcNomina';
import { isBiometricAvailable, registerBiometric, authenticateBiometric, hasBiometricCredential } from './utils/biometric';

import { Loading, Modal, F, TxtInp, Btn, Badge, RR } from './components/ui';

import Dashboard from './modules/Dashboard';
import Produccion from './modules/Produccion';
import Cotizador from './modules/Cotizador';
import CRM from './modules/CRM';
import Nominas from './modules/Nominas';
import Contabilidad from './modules/Contabilidad';
import Proveedores from './modules/Proveedores';
import FichasTecnicas from './modules/FichasTecnicas';
import Solicitudes from './modules/Solicitudes';
import AIChat from './modules/AIChat';
import ActividadLog from './modules/ActividadLog';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [mod, setMod] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [users, setUsers] = useState([]);
  const [toast, setToast] = useState(null);

  // Biometric auth state
  const [bioLocked, setBioLocked] = useState(true);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioRegistered, setBioRegistered] = useState(false);
  const [bioError, setBioError] = useState("");

  useEffect(() => {
    (async () => {
      const avail = await isBiometricAvailable();
      setBioAvailable(avail);
      const stored = hasBiometricCredential();
      setBioRegistered(!!stored);
      if (!avail) setBioLocked(false); // No biometric = skip lock
    })();
  }, []);

  // CRM states
  const [clientes, setClientes] = useState([]);
  const [cotCRM, setCotCRM] = useState([]);
  // Proveedores
  const [proveedores, setProveedores] = useState([]);
  const [showAddProv, setShowAddProv] = useState(false);
  const [editProv, setEditProv] = useState(null);
  const [newProv, setNewProv] = useState({ nombre: "", rfc: "", contacto: "", correo: "", telefono: "", notas: "" });
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
    const interval = setInterval(() => { if (document.visibilityState === 'visible') loadData(); }, 120000);
    return () => { document.removeEventListener('visibilitychange', handleVisibility); clearInterval(interval); };
  }, []);

  // Handle QR code scan → open traceability from hash URL
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#trace/')) {
        const bobId = hash.replace('#trace/', '');
        const { data } = await supabase.from('bobinas_pt').select('*').eq('id', bobId).single();
        if (data) {
          setMod("produccion");
          setTimeout(() => showTrace(data), 500);
        }
        window.location.hash = '';
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
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
      try { const r = await supabase.from('proveedores').select('*').order('created_at',{ascending:false}); if(r.data) setProveedores(r.data); } catch {}
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
    { id: "proveedores", l: "Proveedores", ico: "🏢", admin: true },
    { id: "fichas", l: "Fichas Téc.", ico: "📄", admin: true },
    { id: "actividad", l: "Log", ico: "📝", admin: true },
    { id: "ai", l: "AI", ico: "🤖", admin: true },
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
  const [newOT, setNewOT] = useState({ cliente: "", tipo: "maquila", producto: "", diasCredito: "30" });
  const [newBobina, setNewBobina] = useState({ ot_id: "", ancho: "980", metros: "2000", peso: "180", gramaje: "95", resinas_usadas: [], papeles_usados: [], observaciones: "" });

  // ── Machine Conditions (Condiciones de Máquina) ──
  const [machineTemps, setMachineTemps] = useState(defaultTemps());
  const [machineParams, setMachineParams] = useState({ rpm_extruder: "", rpm_linea: "", amp_motor: "", vel_extruder: "", vel_linea: "", mpm_linea: "", mallas_mesh: "", observaciones_maq: "" });
  const [showMachineConditions, setShowMachineConditions] = useState(false);
  const [showMachineSetup, setShowMachineSetup] = useState(null); // OT id to setup

  const [showTraceDetail, setShowTraceDetail] = useState(null);
  const [traceQR, setTraceQR] = useState("");
  const [saving, setSaving] = useState(false);

  const metrics = useMemo(() => ({
    resinasDisp: resinas.filter(r => r.status === "disponible").length,
    resinasKg: resinas.filter(r => r.status === "disponible").reduce((s, r) => s + (r.peso_kg || 0), 0),
    papelBobinas: papeles.length,
    otsActivas: ots.filter(o => o.status === "en_proceso").length,
    otsPausadas: ots.filter(o => o.status === "pausada").length,
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
    if (!newOT.cliente) { showToast("Selecciona un cliente"); return; }
    setSaving(true);
    try {
      const maxNum = ots.reduce((mx, o) => { const n = parseInt(o.codigo?.replace("OT-", "")); return n > mx ? n : mx; }, 0);
      const codigo = `OT-${String(maxNum + 1).padStart(3, "0")}`;
      const clienteNombre = clientes.find(c => c.id === newOT.cliente)?.nombre || newOT.cliente;
      const { data, error } = await supabase.from('ordenes_trabajo').insert({
        codigo,
        cliente_nombre: clienteNombre,
        tipo: newOT.tipo,
        producto: newOT.producto,
        dias_credito: parseInt(newOT.diasCredito) || 30,
        status: 'pendiente'
      }).select();
      if (error) { showToast("Error: " + error.message); setSaving(false); return; }
      if (data) {
        setOts(prev => [data[0], ...prev]);
        showToast(`${codigo} creada`);
        notifyTelegram(`Nueva OT: *${codigo}*\nCliente: ${clienteNombre}\nProducto: ${newOT.producto || newOT.tipo}\nCreada por: ${currentUser?.nombre}`, "ot");
      }
      setShowAddOT(false);
      setNewOT({ cliente: "", tipo: "maquila", producto: "", diasCredito: "30" });
    } catch (e) { showToast("Error: " + e.message); }
    setSaving(false);
  };

  const updateOTStatus = async (id, newStatus) => {
    // When starting/resuming an OT, show machine conditions popup first
    if (newStatus === 'en_proceso') {
      const ot = ots.find(o => o.id === id);
      // If resuming from pausada and already has conditions, skip setup
      if (ot?.status === 'pausada' && ot?.condiciones_maquina) {
        const updates = { status: 'en_proceso', updated_at: new Date().toISOString() };
        const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
        if (!error) {
          setOts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
          showToast(`${ot.codigo} reanudada`);
          notifyTelegram(`OT Reanudada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}`, "ot");
        }
        return;
      }
      setMachineTemps(defaultTemps());
      setMachineParams({ rpm_extruder: "", rpm_linea: "", amp_motor: "", vel_extruder: "", vel_linea: "", mpm_linea: "", mallas_mesh: "", observaciones_maq: "" });
      setShowMachineSetup(id);
      return;
    }

    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    if (newStatus === 'completada') updates.fecha_fin = today();

    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
    if (!error) {
      const ot = ots.find(o => o.id === id);
      setOts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
      if (newStatus === 'pausada' && ot) { showToast(`${ot.codigo} pausada`); notifyTelegram(`OT Pausada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}`, "ot"); }
      if (newStatus === 'completada' && ot) notifyTelegram(`OT Completada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}\n${ot.kg_producidos || 0}kg producidos`, "production");
    }
  };

  const startOTWithConditions = async () => {
    if (!showMachineSetup) return;
    setSaving(true);
    const tempsFilled = {};
    Object.entries(machineTemps).forEach(([k, v]) => { if (v) tempsFilled[k] = parseFloat(v); });
    const paramsFilled = {};
    Object.entries(machineParams).forEach(([k, v]) => { if (v) paramsFilled[k] = v; });

    const condiciones = { temperaturas: tempsFilled, ...paramsFilled, registrado_por: currentUser?.nombre, fecha_registro: new Date().toISOString() };

    const updates = { status: 'en_proceso', fecha_inicio: today(), condiciones_maquina: JSON.stringify(condiciones), updated_at: new Date().toISOString() };
    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', showMachineSetup);
    if (!error) {
      const ot = ots.find(o => o.id === showMachineSetup);
      setOts(prev => prev.map(o => o.id === showMachineSetup ? { ...o, ...updates, condiciones_maquina: condiciones } : o));
      showToast(`${ot?.codigo} iniciada con condiciones de máquina`);
      notifyTelegram(`OT En Proceso: *${ot?.codigo}*\nCliente: ${ot?.cliente_nombre}\nCondiciones: ${Object.keys(tempsFilled).length} zonas temp, RPM: ${machineParams.rpm_extruder || 'N/A'}`, "ot");
    }
    setShowMachineSetup(null);
    setSaving(false);
  };

  const addBobina = async () => {
    setSaving(true);
    const maxBob = bobinas.reduce((mx, b) => { const n = parseInt(b.codigo?.replace("BOB-", "")); return n > mx ? n : mx; }, 0);
    const codigo = `BOB-${String(maxBob + 1).padStart(3, "0")}`;
    const lote = `LOT-${new Date().toISOString().slice(0,10).replace(/-/g,"")}-${String(maxBob + 1).padStart(3, "0")}`;
    const ot = ots.find(o => o.id === newBobina.ot_id);

    // Build traceability data
    const resinasInfo = newBobina.resinas_usadas.map(id => resinas.find(r => r.id === id)).filter(Boolean);
    const papelesInfo = newBobina.papeles_usados.map(id => papeles.find(p => p.id === id)).filter(Boolean);
    // Inherit machine conditions from OT
    let condMaquina = null;
    if (ot?.condiciones_maquina) {
      condMaquina = typeof ot.condiciones_maquina === 'string' ? JSON.parse(ot.condiciones_maquina) : ot.condiciones_maquina;
    }

    const trazabilidad = {
      lote,
      operador: currentUser?.nombre || "Sistema",
      turno_inicio: turnoInicio,
      fecha_produccion: new Date().toISOString(),
      ot_codigo: ot?.codigo,
      cliente: ot?.cliente_nombre,
      resinas: resinasInfo.map(r => ({ codigo: r.codigo, tipo: r.tipo, peso_kg: r.peso_kg, proveedor: r.proveedor_nombre, folio: r.folio_packing })),
      papeles: papelesInfo.map(p => ({ codigo: p.codigo, tipo: p.tipo, gramaje: p.gramaje, peso_kg: p.peso_kg, proveedor: p.proveedor, folio: p.folio_packing })),
      condiciones_maquina: condMaquina,
      observaciones: newBobina.observaciones || ""
    };

    const { data, error } = await supabase.from('bobinas_pt').insert({
      codigo, lote,
      ot_id: newBobina.ot_id,
      ot_codigo: ot?.codigo,
      ancho_mm: parseInt(newBobina.ancho) || 980,
      metros_lineales: parseFloat(newBobina.metros) || 2000,
      peso_kg: parseFloat(newBobina.peso) || 180,
      gramaje_total: parseInt(newBobina.gramaje) || 95,
      status: 'terminada',
      trazabilidad: JSON.stringify(trazabilidad),
      created_by: currentUser?.nombre || "Sistema",
      updated_by: currentUser?.nombre || "Sistema"
    }).select();

    if (!error && data) {
      setBobinas(prev => [data[0], ...prev]);
      if (ot) {
        const newMetros = (ot.metros_producidos || 0) + parseFloat(newBobina.metros);
        const newKg = (ot.kg_producidos || 0) + parseFloat(newBobina.peso);
        const newBobCount = (ot.bobinas_producidas || 0) + 1;
        await supabase.from('ordenes_trabajo').update({
          metros_producidos: newMetros, kg_producidos: newKg, bobinas_producidas: newBobCount
        }).eq('id', ot.id);
        setOts(prev => prev.map(o => o.id === ot.id ? { ...o, metros_producidos: newMetros, kg_producidos: newKg, bobinas_producidas: newBobCount } : o));
      }
      notifyTelegram(`📦 Bobina *${codigo}*\nLote: ${lote}\nOT: ${ot?.codigo}\n${newBobina.peso}kg | ${newBobina.metros}m\nOperador: ${currentUser?.nombre}`, "production");
    }
    setShowAddBobina(false);
    setNewBobina({ ot_id: "", ancho: "980", metros: "2000", peso: "180", gramaje: "95", resinas_usadas: [], papeles_usados: [], observaciones: "" });
    setSaving(false);
  };

  // Generate QR code for traceability
  const generateTraceQR = async (bobina) => {
    const traceUrl = `${window.location.origin}#trace/${bobina.id}`;
    try {
      const qr = await QRCode.toDataURL(traceUrl, { width: 300, margin: 1, color: { dark: "#0B0F1A", light: "#FFFFFF" } });
      return qr;
    } catch { return null; }
  };

  const showTrace = async (bobina) => {
    const qr = await generateTraceQR(bobina);
    setTraceQR(qr);
    setShowTraceDetail(bobina);
  };

  const printTraceLabel = async (bobina) => {
    const qr = await generateTraceQR(bobina);
    const trace = typeof bobina.trazabilidad === 'string' ? JSON.parse(bobina.trazabilidad || '{}') : (bobina.trazabilidad || {});
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`<html><head><title>Etiqueta ${bobina.codigo}</title><style>
      body { font-family: monospace; padding: 16px; max-width: 360px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
      .logo { font-size: 20px; font-weight: 900; }
      .row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
      .label { font-weight: 700; }
      .qr { text-align: center; margin: 8px 0; }
      .section { border-top: 1px dashed #999; margin-top: 6px; padding-top: 6px; }
      @media print { button { display: none; } }
    </style></head><body>
      <div class="header"><div class="logo">KATTEGAT INDUSTRIES</div><div style="font-size:11px">Trazabilidad Producto Terminado</div></div>
      <div class="qr"><img src="${qr}" width="180" /><div style="font-size:10px;color:#666">${bobina.codigo} | ${trace.lote || bobina.lote || ''}</div></div>
      <div class="row"><span class="label">Código:</span><span>${bobina.codigo}</span></div>
      <div class="row"><span class="label">Lote:</span><span>${trace.lote || bobina.lote || 'N/A'}</span></div>
      <div class="row"><span class="label">OT:</span><span>${bobina.ot_codigo || 'N/A'}</span></div>
      <div class="row"><span class="label">Cliente:</span><span>${trace.cliente || 'N/A'}</span></div>
      <div class="row"><span class="label">Peso:</span><span>${bobina.peso_kg} kg</span></div>
      <div class="row"><span class="label">Metros:</span><span>${bobina.metros_lineales} m</span></div>
      <div class="row"><span class="label">Ancho:</span><span>${bobina.ancho_mm} mm</span></div>
      <div class="row"><span class="label">Gramaje:</span><span>${bobina.gramaje_total} g/m²</span></div>
      <div class="section"><div style="font-size:11px;font-weight:700">Materia Prima</div>
        ${(trace.resinas||[]).map(r => `<div class="row"><span>🧪 ${r.tipo}</span><span>${r.peso_kg}kg - ${r.proveedor}</span></div>`).join('')}
        ${(trace.papeles||[]).map(p => `<div class="row"><span>📜 ${p.tipo} ${p.gramaje}g</span><span>${p.peso_kg}kg - ${p.proveedor}</span></div>`).join('')}
      </div>
      <div class="section">
        <div class="row"><span class="label">Operador:</span><span>${trace.operador || 'N/A'}</span></div>
        <div class="row"><span class="label">Fecha:</span><span>${new Date(trace.fecha_produccion || bobina.fecha_produccion).toLocaleString("es-MX")}</span></div>
      </div>
      ${trace.observaciones ? `<div class="section"><div class="row"><span class="label">Obs:</span><span>${trace.observaciones}</span></div></div>` : ''}
      <br><button onclick="window.print()" style="width:100%;padding:8px;font-size:14px;cursor:pointer">🖨️ Imprimir Etiqueta</button>
    </body></html>`);
    w.document.close();
  };

  // QR for raw materials
  const printMPLabel = async (item, tipo) => {
    const traceUrl = `${window.location.origin}#mp/${tipo}/${item.id}`;
    const qr = await QRCode.toDataURL(traceUrl, { width: 250, margin: 1, color: { dark: "#0B0F1A", light: "#FFFFFF" } });
    const w = window.open('', '_blank', 'width=400,height=500');
    w.document.write(`<html><head><title>MP ${item.codigo}</title><style>
      body { font-family: monospace; padding: 16px; max-width: 360px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 8px; }
      .logo { font-size: 20px; font-weight: 900; }
      .row { display: flex; justify-content: space-between; font-size: 12px; padding: 2px 0; }
      .label { font-weight: 700; }
      .qr { text-align: center; margin: 8px 0; }
      @media print { button { display: none; } }
    </style></head><body>
      <div class="header"><div class="logo">KATTEGAT INDUSTRIES</div><div style="font-size:11px">Materia Prima - ${tipo === 'resina' ? 'Resina' : 'Papel'}</div></div>
      <div class="qr"><img src="${qr}" width="160" /><div style="font-size:10px;color:#666">${item.codigo}</div></div>
      <div class="row"><span class="label">Código:</span><span>${item.codigo}</span></div>
      <div class="row"><span class="label">Tipo:</span><span>${item.tipo || item.nombre || 'N/A'}</span></div>
      <div class="row"><span class="label">Peso:</span><span>${item.peso_kg || item.stock_kg || 0} kg</span></div>
      <div class="row"><span class="label">Proveedor:</span><span>${item.proveedor_nombre || item.proveedor || 'N/A'}</span></div>
      <div class="row"><span class="label">Folio Pack:</span><span>${item.folio_packing || 'N/A'}</span></div>
      <div class="row"><span class="label">Fecha:</span><span>${new Date(item.fecha_entrada || item.created_at).toLocaleDateString("es-MX")}</span></div>
      <div class="row"><span class="label">Status:</span><span>${item.status || 'disponible'}</span></div>
      <br><button onclick="window.print()" style="width:100%;padding:8px;font-size:14px;cursor:pointer">🖨️ Imprimir Etiqueta</button>
    </body></html>`);
    w.document.close();
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
  const [matResinas, setMatResinas] = useState(DEFAULT_RESINAS);
  const [matPapeles, setMatPapeles] = useState(DEFAULT_PAPELES);
  const [selResina, setSelResina] = useState("r1");
  const [selPapel, setSelPapel] = useState("p1");
  // Blend: up to 3 resins with percentages
  const [resinBlend, setResinBlend] = useState([{ id: "r1", pct: 100 }]);
  const [showAddMatResina, setShowAddMatResina] = useState(false);
  const [showAddMatPapel, setShowAddMatPapel] = useState(false);
  const [editMatR, setEditMatR] = useState(null);
  const [editMatP, setEditMatP] = useState(null);
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

  // Blended resin: weighted average price and gramaje
  const blendData = useMemo(() => {
    let totalPct = 0, wPrice = 0, wGramaje = 0, parts = [];
    for (const slot of resinBlend) {
      const mat = matResinas.find(r => r.id === slot.id);
      if (!mat) continue;
      const pct = parseFloat(slot.pct) || 0;
      totalPct += pct;
      wPrice += (parseFloat(mat.precio) || 0) * (pct / 100);
      wGramaje += (parseFloat(mat.gramaje) || 0) * (pct / 100);
      parts.push({ ...mat, pct });
    }
    return { precio: wPrice, gramaje: wGramaje || 15, totalPct, parts, isBlend: resinBlend.length > 1 };
  }, [resinBlend, matResinas]);

  const resinaActual = blendData.precio > 0 ? blendData : (matResinas.find(r => r.id === selResina) || matResinas[0] || { precio: 32, gramaje: 15 });
  const papelActual = matPapeles.find(p => p.id === selPapel) || matPapeles[0] || { precio: 20, gramaje: 80 };

  const calc = useMemo(() => {
    const pGr = parseFloat(blendData.gramaje) || 15;
    const papGrV = parseFloat(papelActual.gramaje) || 80;
    const rP = parseFloat(blendData.precio) || 32;
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
  }, [blendData, papelActual, anchoMaestro, anchoUtil, velMaq, merma, margen, q1, q2, q3, tipo, oh, setupHrs]);

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
  const [editEmpleado, setEditEmpleado] = useState(null);
  const [newEmp, setNewEmp] = useState({ nombre: "", puesto: "Operador Extrusora", sueldo_bruto: "14000" });
  const [expandedEmp, setExpandedEmp] = useState(null);

  const nominaTotal = useMemo(() => {
    const activos = empleados.filter(e => e.activo);
    const detalles = activos.map(e => ({ ...e, calc: calcNomina(e.sueldo_bruto || e.sueldo_neto || 0) }));
    const totalNeto = detalles.reduce((s, e) => s + e.calc.sn, 0);
    const totalBruto = detalles.reduce((s, e) => s + e.calc.sueldoBruto, 0);
    const totalCosto = detalles.reduce((s, e) => s + e.calc.costoConProv, 0);
    const totalPatronal = detalles.reduce((s, e) => s + e.calc.costoPatronal, 0);
    return { detalles, totalNeto, totalBruto, totalCosto, totalPatronal, count: activos.length };
  }, [empleados]);

  const addEmpleado = async () => {
    if (!newEmp.nombre) return;
    setSaving(true);
    const bruto = parseFloat(newEmp.sueldo_bruto) || 14000;
    if (editEmpleado) {
      const { error } = await supabase.from('empleados').update({
        nombre: newEmp.nombre,
        puesto: newEmp.puesto,
        sueldo_bruto: bruto,
        sueldo_neto: bruto // keep backwards compat
      }).eq('id', editEmpleado.id);
      if (!error) {
        setEmpleados(prev => prev.map(e => e.id === editEmpleado.id ? { ...e, nombre: newEmp.nombre, puesto: newEmp.puesto, sueldo_bruto: bruto, sueldo_neto: bruto } : e));
        showToast(`${newEmp.nombre} actualizado`);
      }
    } else {
      const { data, error } = await supabase.from('empleados').insert({
        nombre: newEmp.nombre,
        puesto: newEmp.puesto,
        sueldo_bruto: bruto,
        sueldo_neto: bruto,
        activo: true
      }).select();
      if (!error && data) { setEmpleados(prev => [...prev, data[0]]); showToast(`${newEmp.nombre} agregado`); }
    }
    setShowAddEmpleado(false);
    setEditEmpleado(null);
    setNewEmp({ nombre: "", puesto: "Operador Extrusora", sueldo_bruto: "14000" });
    setSaving(false);
  };

  const startEditEmp = (emp) => {
    setNewEmp({ nombre: emp.nombre, puesto: emp.puesto, sueldo_bruto: String(emp.sueldo_bruto || emp.sueldo_neto || 0) });
    setEditEmpleado(emp);
    setShowAddEmpleado(true);
  };

  const toggleEmpleadoActivo = async (id, activo) => {
    await supabase.from('empleados').update({ activo: !activo }).eq('id', id);
    setEmpleados(prev => prev.map(e => e.id === id ? { ...e, activo: !activo } : e));
    showToast(activo ? "Empleado desactivado" : "Empleado reactivado");
  };

  // Auto-sync nómina → overhead (mo_directa)
  const nominaSyncRef = useRef(false);
  useEffect(() => {
    if (!nominaSyncRef.current) { nominaSyncRef.current = true; return; } // skip first render
    const costoReal = Math.round(nominaTotal.totalCosto);
    if (costoReal > 0 && costoReal !== Math.round(oh.mo_directa || 0)) {
      const newOh = { ...oh, mo_directa: costoReal };
      setOh(newOh);
      supabase.from('configuracion').upsert({ clave: 'overhead', valor: newOh, updated_by: currentUser?.nombre || 'Auto-sync', updated_at: new Date().toISOString() }).then(() => {
        showToast("MO Overhead sincronizado automáticamente");
      });
    }
  }, [nominaTotal.totalCosto]);

  // ═══════════════════════════════════════════
  // CONTABILIDAD STATE
  // ═══════════════════════════════════════════
  const [contTab, setContTab] = useState("dashboard");
  const [showAddFactura, setShowAddFactura] = useState(false);
  const [showAddGasto, setShowAddGasto] = useState(false);
  const [newFact, setNewFact] = useState({ cliente: "", concepto: "", monto: "", diasCredito: "30", fechaEmision: today() });
  const [newGasto, setNewGasto] = useState({ concepto: "", categoria: "materia_prima", monto: "", fecha: today(), comprobante: "" });

  // ═══ FICHAS TÉCNICAS STATE ═══
  const [fichaTab, setFichaTab] = useState("resinas");
  const [fichasResinas, setFichasResinas] = useState([]);
  const [fichasPapeles, setFichasPapeles] = useState([]);
  const [showAddFicha, setShowAddFicha] = useState(false);
  const [editFicha, setEditFicha] = useState(null);
  const [expandedFicha, setExpandedFicha] = useState(null);
  const [newFichaR, setNewFichaR] = useState({ nombre: "", grado: "", fabricante: "", tipo_polimero: "PEBD", mfi: "", densidad: "", punto_fusion: "", temp_min: "", temp_max: "", resistencia_tension: "", elongacion: "", dureza: "", norma: "ASTM D1238", notas: "" });
  const [newFichaP, setNewFichaP] = useState({ nombre: "", proveedor: "", tipo: "Bond", gramaje: "", brightness: "", opacidad: "", humedad: "", espesor: "", resistencia_tension: "", resistencia_rasgado: "", porosidad: "", norma: "", notas: "" });
  const [parsingPDF, setParsingPDF] = useState(false);
  const pdfInputRef = useRef(null);

  const parseTDSFromPDF = async (file, tipo) => {
    setParsingPDF(true);
    try {
      // Read file as base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const b64 = reader.result.split(',')[1]; // remove data:application/pdf;base64,
          resolve(b64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch('/api/parse-tds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pdf_base64: base64, tipo })
      });
      const data = await res.json();

      if (data.error) {
        showToast(`Error: ${data.error}`);
        setParsingPDF(false);
        return;
      }

      if (data.ficha) {
        if (tipo === 'resina') {
          setNewFichaR(prev => ({ ...prev, ...data.ficha }));
        } else {
          setNewFichaP(prev => ({ ...prev, ...data.ficha }));
        }
        setShowAddFicha(true);
        showToast("Datos extraídos del PDF con AI — revisa y guarda");
      }
    } catch (e) {
      showToast(`Error procesando PDF: ${e.message}`);
    }
    setParsingPDF(false);
  };

  useEffect(() => {
    const loadFichas = async () => {
      try {
        const r = await supabase.from('configuracion').select('*');
        const ft = r.data?.find(c => c.clave === 'fichas_tecnicas');
        if (ft?.valor) {
          if (ft.valor.resinas?.length) setFichasResinas(ft.valor.resinas);
          if (ft.valor.papeles?.length) setFichasPapeles(ft.valor.papeles);
        }
      } catch {}
    };
    loadFichas();
  }, []);

  const saveFichas = async (resinas, papeles) => {
    try {
      await supabase.from('configuracion').upsert({ clave: 'fichas_tecnicas', valor: { resinas, papeles }, updated_by: currentUser?.nombre || "Sistema", updated_at: new Date().toISOString() });
    } catch {}
  };

  const addFichaResina = async () => {
    if (!newFichaR.nombre) { showToast("Nombre requerido"); return; }
    if (editFicha) {
      const updated = fichasResinas.map(f => f.id === editFicha.id ? { ...newFichaR, id: editFicha.id } : f);
      setFichasResinas(updated); await saveFichas(updated, fichasPapeles);
      showToast("Ficha resina actualizada");
    } else {
      const nf = { ...newFichaR, id: genId() };
      const updated = [...fichasResinas, nf];
      setFichasResinas(updated); await saveFichas(updated, fichasPapeles);
      showToast("Ficha resina agregada");
    }
    setShowAddFicha(false); setEditFicha(null);
    setNewFichaR({ nombre: "", grado: "", fabricante: "", tipo_polimero: "PEBD", mfi: "", densidad: "", punto_fusion: "", temp_min: "", temp_max: "", resistencia_tension: "", elongacion: "", dureza: "", norma: "ASTM D1238", notas: "" });
  };

  const addFichaPapel = async () => {
    if (!newFichaP.nombre) { showToast("Nombre requerido"); return; }
    if (editFicha) {
      const updated = fichasPapeles.map(f => f.id === editFicha.id ? { ...newFichaP, id: editFicha.id } : f);
      setFichasPapeles(updated); await saveFichas(fichasResinas, updated);
      showToast("Ficha papel actualizada");
    } else {
      const nf = { ...newFichaP, id: genId() };
      const updated = [...fichasPapeles, nf];
      setFichasPapeles(updated); await saveFichas(fichasResinas, updated);
      showToast("Ficha papel agregada");
    }
    setShowAddFicha(false); setEditFicha(null);
    setNewFichaP({ nombre: "", proveedor: "", tipo: "Bond", gramaje: "", brightness: "", opacidad: "", humedad: "", espesor: "", resistencia_tension: "", resistencia_rasgado: "", porosidad: "", norma: "", notas: "" });
  };

  const deleteFicha = (id, tipo) => {
    if (!confirm("¿Eliminar ficha técnica?")) return;
    if (tipo === "resina") {
      const updated = fichasResinas.filter(f => f.id !== id);
      setFichasResinas(updated); saveFichas(updated, fichasPapeles);
    } else {
      const updated = fichasPapeles.filter(f => f.id !== id);
      setFichasPapeles(updated); saveFichas(fichasResinas, updated);
    }
    showToast("Ficha eliminada");
  };

  const generateTDSPdf = (ficha, tipo) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // Header - Kattegat letterhead
    doc.setFillColor(11, 15, 26);
    doc.rect(0, 0, pw, 35, 'F');
    doc.setFillColor(59, 130, 246);
    doc.rect(0, 33, pw, 3, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
    doc.text("K", 15, 23);
    doc.setFontSize(14); doc.text("KATTEGAT INDUSTRIES", 28, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Extrusión y Laminación de Polietileno | México", 28, 25);

    // Title
    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(30, 41, 59);
    doc.text("FICHA TÉCNICA / TECHNICAL DATA SHEET", pw / 2, 48, { align: "center" });

    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.5);
    doc.line(20, 52, pw - 20, 52);

    let y = 62;
    const addRow = (label, value, bold) => {
      if (!value && value !== 0) return;
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(label, 22, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(String(value), 95, y);
      y += 7;
    };
    const addSection = (title) => {
      y += 3;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(59, 130, 246);
      doc.text(title, 20, y);
      doc.setDrawColor(200, 210, 230); doc.line(20, y + 2, pw - 20, y + 2);
      y += 9;
    };

    if (tipo === "resina") {
      addSection("IDENTIFICACIÓN");
      addRow("Producto:", ficha.nombre, true);
      addRow("Grado/Grade:", ficha.grado);
      addRow("Fabricante:", ficha.fabricante);
      addRow("Tipo Polímero:", ficha.tipo_polimero);
      addRow("Norma Referencia:", ficha.norma);

      addSection("PROPIEDADES FÍSICAS");
      addRow("MFI (Índice Fluidez):", ficha.mfi ? `${ficha.mfi} g/10min` : "");
      addRow("Densidad:", ficha.densidad ? `${ficha.densidad} g/cm³` : "");
      addRow("Punto de Fusión:", ficha.punto_fusion ? `${ficha.punto_fusion} °C` : "");
      addRow("Dureza (Shore):", ficha.dureza);

      addSection("PROPIEDADES MECÁNICAS");
      addRow("Resistencia Tensión:", ficha.resistencia_tension ? `${ficha.resistencia_tension} MPa` : "");
      addRow("Elongación Ruptura:", ficha.elongacion ? `${ficha.elongacion} %` : "");

      addSection("PROCESAMIENTO");
      addRow("Temp. Proceso Mín:", ficha.temp_min ? `${ficha.temp_min} °C` : "");
      addRow("Temp. Proceso Máx:", ficha.temp_max ? `${ficha.temp_max} °C` : "");
    } else {
      addSection("IDENTIFICACIÓN");
      addRow("Producto:", ficha.nombre, true);
      addRow("Proveedor:", ficha.proveedor);
      addRow("Tipo:", ficha.tipo);
      addRow("Norma Referencia:", ficha.norma);

      addSection("PROPIEDADES FÍSICAS");
      addRow("Gramaje:", ficha.gramaje ? `${ficha.gramaje} g/m²` : "");
      addRow("Espesor:", ficha.espesor ? `${ficha.espesor} μm` : "");
      addRow("Brightness (ISO):", ficha.brightness ? `${ficha.brightness} %` : "");
      addRow("Opacidad:", ficha.opacidad ? `${ficha.opacidad} %` : "");
      addRow("Humedad:", ficha.humedad ? `${ficha.humedad} %` : "");

      addSection("PROPIEDADES MECÁNICAS");
      addRow("Resistencia Tensión:", ficha.resistencia_tension ? `${ficha.resistencia_tension} kN/m` : "");
      addRow("Resistencia Rasgado:", ficha.resistencia_rasgado ? `${ficha.resistencia_rasgado} mN` : "");
      addRow("Porosidad Gurley:", ficha.porosidad ? `${ficha.porosidad} s/100ml` : "");
    }

    if (ficha.notas) {
      addSection("OBSERVACIONES");
      doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(71, 85, 105);
      const lines = doc.splitTextToSize(ficha.notas, pw - 44);
      doc.text(lines, 22, y); y += lines.length * 5;
    }

    // Footer
    y = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(59, 130, 246); doc.line(20, y - 5, pw - 20, y - 5);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Kattegat Industries — Generado: ${new Date().toLocaleDateString("es-MX")}`, 20, y);
    doc.text("Este documento es propiedad de Kattegat Industries", pw - 20, y, { align: "right" });

    doc.save(`TDS_${ficha.nombre.replace(/\s+/g, '_')}.pdf`);
    showToast("PDF ficha técnica descargado");
  };

  const generateCoCPdf = async (bobina) => {
    const traz = typeof bobina.trazabilidad === 'string' ? JSON.parse(bobina.trazabilidad) : bobina.trazabilidad;
    if (!traz) { showToast("Sin trazabilidad para generar CoC"); return; }

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(11, 15, 26);
    doc.rect(0, 0, pw, 35, 'F');
    doc.setFillColor(16, 185, 129);
    doc.rect(0, 33, pw, 3, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
    doc.text("K", 15, 23);
    doc.setFontSize(14); doc.text("KATTEGAT INDUSTRIES", 28, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Extrusión y Laminación de Polietileno | México", 28, 25);

    doc.setFont("helvetica", "bold"); doc.setFontSize(16); doc.setTextColor(30, 41, 59);
    doc.text("CERTIFICADO DE CALIDAD", pw / 2, 48, { align: "center" });
    doc.setFontSize(10); doc.setTextColor(100, 116, 139);
    doc.text("CERTIFICATE OF COMPLIANCE / CONFORMITY", pw / 2, 55, { align: "center" });

    doc.setDrawColor(16, 185, 129); doc.setLineWidth(0.5);
    doc.line(20, 59, pw - 20, 59);

    let y = 69;
    const addRow = (label, value, bold) => {
      if (!value && value !== 0) return;
      doc.setFont("helvetica", bold ? "bold" : "normal"); doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); doc.text(label, 22, y);
      doc.setTextColor(30, 41, 59); doc.setFont("helvetica", bold ? "bold" : "normal");
      doc.text(String(value), 85, y);
      y += 7;
    };
    const addSec = (title) => {
      y += 3;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(16, 185, 129);
      doc.text(title, 20, y);
      doc.setDrawColor(200, 220, 210); doc.line(20, y + 2, pw - 20, y + 2);
      y += 9;
    };

    addSec("PRODUCTO");
    addRow("Código Bobina:", bobina.codigo, true);
    addRow("Lote:", traz.lote || bobina.lote);
    addRow("OT:", traz.ot_codigo);
    addRow("Cliente:", traz.cliente);
    addRow("Fecha Producción:", traz.fecha_produccion?.split("T")[0]);

    addSec("ESPECIFICACIONES");
    addRow("Ancho:", bobina.ancho_mm ? `${bobina.ancho_mm} mm` : "");
    addRow("Largo:", bobina.largo_m ? `${bobina.largo_m} m` : "");
    addRow("Peso:", bobina.peso_kg ? `${bobina.peso_kg} kg` : "");
    addRow("Gramaje:", bobina.gramaje ? `${bobina.gramaje} g/m²` : "");

    addSec("MATERIAS PRIMAS UTILIZADAS");
    if (traz.resinas?.length) {
      traz.resinas.forEach(r => {
        addRow(`Resina ${r.codigo}:`, `${r.tipo || ""} — ${r.peso_kg || ""}kg — Prov: ${r.proveedor || "N/A"}`);
      });
    }
    if (traz.papeles?.length) {
      traz.papeles.forEach(p => {
        addRow(`Papel ${p.codigo}:`, `${p.tipo || ""} ${p.gramaje || ""}g — ${p.peso_kg || ""}kg — Prov: ${p.proveedor || "N/A"}`);
      });
    }

    addSec("CONDICIONES DE PRODUCCIÓN");
    addRow("Operador:", traz.operador);
    addRow("Turno Inicio:", traz.turno_inicio);
    if (traz.condiciones_maquina) {
      const cm = traz.condiciones_maquina;
      if (cm.rpm_extruder) addRow("RPM Extruder:", cm.rpm_extruder);
      if (cm.amp_motor) addRow("AMP Motor:", `${cm.amp_motor} A`);
      if (cm.vel_extruder) addRow("Vel. Extruder:", cm.vel_extruder);
      if (cm.rpm_linea) addRow("RPM Línea:", cm.rpm_linea);
      if (cm.vel_linea) addRow("Vel. Línea:", cm.vel_linea);
      if (cm.mpm_linea) addRow("MPM Línea:", `${cm.mpm_linea} m/min`);
      if (cm.mallas_mesh) addRow("Mallas (Mesh):", cm.mallas_mesh);
      // backwards compat
      if (cm.rpm) addRow("RPM:", cm.rpm);
      if (cm.temperaturas && Object.keys(cm.temperaturas).length) {
        y += 3;
        doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(100, 116, 139);
        doc.text("Temperaturas (°C):", 22, y); y += 5;
        doc.setFont("helvetica", "normal"); doc.setFontSize(8);
        const tempEntries = Object.entries(cm.temperaturas);
        for (let i = 0; i < tempEntries.length; i += 4) {
          const row = tempEntries.slice(i, i + 4).map(([k, v]) => `${k}: ${v}°C`).join("   |   ");
          doc.setTextColor(30, 41, 59); doc.text(row, 22, y); y += 4;
        }
        y += 2;
      }
      if (cm.observaciones_maq) addRow("Obs. Máquina:", cm.observaciones_maq);
    }
    if (traz.observaciones) addRow("Observaciones:", traz.observaciones);

    // Check if we need a new page
    if (y > doc.internal.pageSize.getHeight() - 60) { doc.addPage(); y = 30; }

    // QR code
    try {
      const qrUrl = `${window.location.origin}#trace/${bobina.id}`;
      const qrImg = await QRCode.toDataURL(qrUrl, { width: 200, margin: 1 });
      doc.addImage(qrImg, 'PNG', pw - 55, y + 5, 35, 35);
      doc.setFontSize(7); doc.setTextColor(148, 163, 184);
      doc.text("Escanear para trazabilidad", pw - 55, y + 43);
    } catch {}

    // Certification statement
    y += 8;
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(20, y, pw - 40, 25, 3, 3, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(30, 70, 50);
    doc.text("DECLARACIÓN DE CONFORMIDAD", 25, y + 8);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(71, 85, 105);
    doc.text("Por medio del presente se certifica que el producto descrito cumple con las", 25, y + 15);
    doc.text("especificaciones técnicas acordadas y los estándares de calidad de Kattegat Industries.", 25, y + 20);

    // Footer
    const fy = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(16, 185, 129); doc.line(20, fy - 5, pw - 20, fy - 5);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Kattegat Industries — CoC ${bobina.codigo} — ${new Date().toLocaleDateString("es-MX")}`, 20, fy);
    doc.text("Documento confidencial", pw - 20, fy, { align: "right" });

    doc.save(`CoC_${bobina.codigo || bobina.lote || 'bobina'}.pdf`);
    showToast("Certificado de Calidad descargado");
  };

  // Generate TDS PDF from cotización materials (for sending to clients)
  const generateCotizacionTDS = (materialesUsados) => {
    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(11, 15, 26);
    doc.rect(0, 0, pw, 35, 'F');
    doc.setFillColor(139, 92, 246);
    doc.rect(0, 33, pw, 3, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(22); doc.setTextColor(241, 245, 249);
    doc.text("K", 15, 23);
    doc.setFontSize(14); doc.text("KATTEGAT INDUSTRIES", 28, 18);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text("Extrusión y Laminación de Polietileno | México", 28, 25);

    doc.setFont("helvetica", "bold"); doc.setFontSize(14); doc.setTextColor(30, 41, 59);
    doc.text("FICHA TÉCNICA DE PRODUCTO", pw / 2, 48, { align: "center" });
    doc.setFontSize(9); doc.setTextColor(100, 116, 139);
    doc.text("Generada desde cotización — Material compuesto", pw / 2, 55, { align: "center" });

    doc.setDrawColor(139, 92, 246); doc.setLineWidth(0.5);
    doc.line(20, 59, pw - 20, 59);

    let y = 69;
    const addRow = (label, value) => {
      if (!value && value !== 0) return;
      doc.setFont("helvetica", "normal"); doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); doc.text(label, 22, y);
      doc.setTextColor(30, 41, 59); doc.text(String(value), 90, y);
      y += 7;
    };

    // Find matching fichas for each material
    materialesUsados.resinas?.forEach((r, i) => {
      y += 2;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(139, 92, 246);
      doc.text(`RESINA ${i + 1}: ${r.nombre}${r.pct ? ` (${r.pct}%)` : ''}`, 20, y);
      doc.setDrawColor(200, 200, 230); doc.line(20, y + 2, pw - 20, y + 2);
      y += 9;

      const ficha = fichasResinas.find(f => f.nombre === r.nombre || f.grado === r.nombre);
      if (ficha) {
        addRow("Fabricante:", ficha.fabricante);
        addRow("Grado:", ficha.grado);
        addRow("MFI:", ficha.mfi ? `${ficha.mfi} g/10min` : "");
        addRow("Densidad:", ficha.densidad ? `${ficha.densidad} g/cm³` : "");
        addRow("Punto Fusión:", ficha.punto_fusion ? `${ficha.punto_fusion} °C` : "");
        addRow("Resistencia Tensión:", ficha.resistencia_tension ? `${ficha.resistencia_tension} MPa` : "");
        addRow("Elongación:", ficha.elongacion ? `${ficha.elongacion} %` : "");
        addRow("Temp. Proceso:", ficha.temp_min && ficha.temp_max ? `${ficha.temp_min} - ${ficha.temp_max} °C` : "");
      } else {
        doc.setFontSize(9); doc.setTextColor(200, 100, 100);
        doc.text("Sin ficha técnica registrada para este material", 22, y);
        y += 7;
      }
    });

    materialesUsados.papeles?.forEach((p, i) => {
      y += 2;
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(139, 92, 246);
      doc.text(`PAPEL ${i + 1}: ${p.nombre}`, 20, y);
      doc.setDrawColor(200, 200, 230); doc.line(20, y + 2, pw - 20, y + 2);
      y += 9;

      const ficha = fichasPapeles.find(f => f.nombre === p.nombre);
      if (ficha) {
        addRow("Proveedor:", ficha.proveedor);
        addRow("Gramaje:", ficha.gramaje ? `${ficha.gramaje} g/m²` : "");
        addRow("Espesor:", ficha.espesor ? `${ficha.espesor} μm` : "");
        addRow("Brightness:", ficha.brightness ? `${ficha.brightness} %` : "");
        addRow("Opacidad:", ficha.opacidad ? `${ficha.opacidad} %` : "");
        addRow("Humedad:", ficha.humedad ? `${ficha.humedad} %` : "");
        addRow("Resistencia Tensión:", ficha.resistencia_tension ? `${ficha.resistencia_tension} kN/m` : "");
      } else {
        doc.setFontSize(9); doc.setTextColor(200, 100, 100);
        doc.text("Sin ficha técnica registrada para este material", 22, y);
        y += 7;
      }
    });

    // Footer
    const fy = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(139, 92, 246); doc.line(20, fy - 5, pw - 20, fy - 5);
    doc.setFontSize(7); doc.setTextColor(148, 163, 184);
    doc.text(`Kattegat Industries — TDS Cotización — ${new Date().toLocaleDateString("es-MX")}`, 20, fy);

    doc.save(`TDS_Cotizacion_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("Ficha Técnica de cotización descargada");
  };

  // ═══ AI CHAT STATE ═══
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const addProveedor = async () => {
    if (!newProv.nombre) { showToast("Nombre requerido"); return; }
    setSaving(true);
    try {
      if (editProv) {
        const { error } = await supabase.from('proveedores').update({ nombre: newProv.nombre, rfc: newProv.rfc, contacto: newProv.contacto, correo: newProv.correo, telefono: newProv.telefono, notas: newProv.notas }).eq('id', editProv.id);
        if (!error) {
          setProveedores(prev => prev.map(p => p.id === editProv.id ? { ...p, ...newProv } : p));
          showToast(`${newProv.nombre} actualizado`);
        } else { showToast("Error: " + error.message); }
      } else {
        let data; try { const r = await supabase.from('proveedores').insert({ ...newProv }).select(); data = r.data; if(r.error) throw r.error; } catch { data = [{ ...newProv, id: genId(), created_at: new Date().toISOString() }]; }
        if (data) { setProveedores(prev => [data[0], ...prev]); showToast(`${newProv.nombre} agregado`); }
      }
      setShowAddProv(false);
      setEditProv(null);
      setNewProv({ nombre: "", rfc: "", contacto: "", correo: "", telefono: "", notas: "" });
    } catch (e) { showToast("Error: " + e.message); }
    setSaving(false);
  };

  const startEditProv = (p) => {
    setNewProv({ nombre: p.nombre || "", rfc: p.rfc || "", contacto: p.contacto || "", correo: p.correo || "", telefono: p.telefono || "", notas: p.notas || "" });
    setEditProv(p);
    setShowAddProv(true);
  };

  const deleteProveedor = async (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    setProveedores(prev => prev.filter(p => p.id !== id));
    try { await supabase.from('proveedores').delete().eq('id', id); } catch {}
    showToast("Proveedor eliminado");
  };

  const sendChat = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = chatInput.trim();
    setChatInput("");
    setChatMsgs(prev => [...prev, { role: "user", text: userMsg }]);
    setChatLoading(true);
    try {
      const ctx = [
        `OTs activas: ${ots.filter(o=>o.status==="en_proceso").length}, pausadas: ${ots.filter(o=>o.status==="pausada").length}, pendientes: ${ots.filter(o=>o.status==="pendiente").length}, completadas: ${ots.filter(o=>o.status==="completada").length}`,
        `Total OTs: ${ots.length}. Clientes: ${clientes.map(c=>`${c.nombre} (${c.etapa})`).join(", ")}`,
        `Bobinas registradas: ${bobinas.length}, peso total: ${bobinas.reduce((s,b)=>s+(parseFloat(b.peso_kg)||0),0).toFixed(0)}kg`,
        `Cotizaciones CRM: ${cotCRM.length}. Facturas: ${facturas.length}`,
        `Resinas en inventario: ${resinas.map(r=>`${r.nombre}: ${r.stock_kg}kg a $${r.precio_kg}/kg`).join(", ")}`,
        `Papeles en inventario: ${papeles.map(p=>`${p.nombre}: ${p.stock_kg}kg a $${p.precio_kg}/kg`).join(", ")}`,
        `Empleados: ${empleados.length}. Gastos registrados: ${gastos.length}`,
        `Proveedores: ${proveedores.map(p=>`${p.nombre}${p.rfc?' ('+p.rfc+')':''}${p.contacto?' - '+p.contacto:''}${p.telefono?' Tel:'+p.telefono:''}`).join("; ")}`,
        `OTs detalle: ${ots.slice(0,15).map(o=>`${o.codigo} ${o.cliente_nombre} ${o.status} ${o.producto||o.tipo}`).join("; ")}`,
        `Fichas técnicas resinas: ${fichasResinas.map(r=>`${r.nombre}(${r.tipo_polimero} MFI:${r.mfi||'?'} Dens:${r.densidad||'?'} Fab:${r.fabricante||'?'})`).join("; ")}`,
        `Fichas técnicas papeles: ${fichasPapeles.map(p=>`${p.nombre}(${p.tipo} ${p.gramaje||'?'}g Prov:${p.proveedor||'?'})`).join("; ")}`,
      ].join("\n");
      const res = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg, context: ctx }) });
      const data = await res.json();
      if (data.error) setChatMsgs(prev => [...prev, { role: "ai", text: `Error: ${data.error}` }]);
      else setChatMsgs(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch (e) { setChatMsgs(prev => [...prev, { role: "ai", text: "Error de conexión" }]); }
    setChatLoading(false);
  };

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
  // ═══ BIOMETRIC LOCK SCREEN ═══
  if (bioLocked && bioAvailable) {
    const handleBioAuth = async () => {
      setBioError("");
      try {
        if (!bioRegistered) {
          await registerBiometric();
          setBioRegistered(true);
          setBioLocked(false);
        } else {
          const ok = await authenticateBiometric();
          if (ok) setBioLocked(false);
        }
      } catch (e) {
        setBioError(e.name === "NotAllowedError" ? "Autenticación cancelada" : "Error: " + e.message);
      }
    };

    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 36, color: "#fff", boxShadow: `0 8px 32px ${C.acc}40` }}>K</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>Kattegat Industries</div>
        <div style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>
          {bioRegistered ? "Usa Face ID o Touch ID para acceder" : "Configura Face ID o Touch ID para proteger tu app"}
        </div>
        <button onClick={handleBioAuth} style={{
          background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, border: "none", color: "#fff",
          padding: "14px 40px", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: "pointer",
          display: "flex", alignItems: "center", gap: 10, boxShadow: `0 4px 20px ${C.acc}30`
        }}>
          <span style={{ fontSize: 24 }}>{bioRegistered ? "🔓" : "🔐"}</span>
          {bioRegistered ? "Desbloquear" : "Configurar Face ID"}
        </button>
        {bioError && <div style={{ color: C.red, fontSize: 12, textAlign: "center" }}>{bioError}</div>}
        <div style={{ fontSize: 10, color: C.t3, marginTop: 8 }}>Seguridad biométrica activada</div>
      </div>
    );
  }

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

      {/* TRACEABILITY DETAIL MODAL */}
      {showTraceDetail && (() => {
        const b = showTraceDetail;
        const trace = typeof b.trazabilidad === 'string' ? JSON.parse(b.trazabilidad || '{}') : (b.trazabilidad || {});
        return <Modal title={`🔍 Trazabilidad ${b.codigo}`} onClose={() => { setShowTraceDetail(null); setTraceQR(""); }} ch={<>
          {traceQR && <div style={{textAlign:"center",marginBottom:12}}><img src={traceQR} alt="QR" style={{width:160,borderRadius:8}} /><div style={{fontSize:10,color:C.t3}}>{b.codigo} | {trace.lote || b.lote || ''}</div></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <div style={{padding:8,background:`${C.acc}10`,borderRadius:6}}><div style={{fontSize:9,color:C.t3}}>Código</div><div style={{fontSize:13,fontWeight:700,color:C.acc,fontFamily:"monospace"}}>{b.codigo}</div></div>
            <div style={{padding:8,background:`${C.pur}10`,borderRadius:6}}><div style={{fontSize:9,color:C.t3}}>Lote</div><div style={{fontSize:13,fontWeight:700,color:C.pur,fontFamily:"monospace"}}>{trace.lote || b.lote || 'N/A'}</div></div>
            <div style={{padding:8,background:`${C.grn}10`,borderRadius:6}}><div style={{fontSize:9,color:C.t3}}>OT</div><div style={{fontSize:13,fontWeight:700,color:C.grn}}>{b.ot_codigo || 'N/A'}</div></div>
            <div style={{padding:8,background:`${C.amb}10`,borderRadius:6}}><div style={{fontSize:9,color:C.t3}}>Cliente</div><div style={{fontSize:13,fontWeight:700,color:C.amb}}>{trace.cliente || 'N/A'}</div></div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,marginBottom:12}}>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:6,border:`1px solid ${C.brd}`}}><div style={{fontSize:14,fontWeight:800}}>{b.peso_kg}kg</div><div style={{fontSize:9,color:C.t3}}>Peso</div></div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:6,border:`1px solid ${C.brd}`}}><div style={{fontSize:14,fontWeight:800}}>{fmtI(b.metros_lineales)}m</div><div style={{fontSize:9,color:C.t3}}>Metros</div></div>
            <div style={{textAlign:"center",padding:6,background:C.bg,borderRadius:6,border:`1px solid ${C.brd}`}}><div style={{fontSize:14,fontWeight:800}}>{b.ancho_mm}mm</div><div style={{fontSize:9,color:C.t3}}>Ancho</div></div>
          </div>
          {(trace.resinas?.length > 0 || trace.papeles?.length > 0) && <div style={{marginBottom:12}}>
            <div style={{fontSize:12,fontWeight:700,color:C.pur,marginBottom:6}}>🔗 Materia Prima Utilizada</div>
            {(trace.resinas||[]).map((r,i) => <div key={i} style={{padding:6,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,fontSize:11}}>
              <span style={{color:C.acc}}>🧪 {r.tipo}</span> — {r.peso_kg}kg — <span style={{color:C.t3}}>{r.proveedor}</span>{r.folio && <span style={{color:C.cyn}}> PL:{r.folio}</span>}
            </div>)}
            {(trace.papeles||[]).map((p,i) => <div key={i} style={{padding:6,background:C.bg,borderRadius:6,marginBottom:4,border:`1px solid ${C.brd}`,fontSize:11}}>
              <span style={{color:C.pur}}>📜 {p.tipo} {p.gramaje}g</span> — {p.peso_kg}kg — <span style={{color:C.t3}}>{p.proveedor}</span>{p.folio && <span style={{color:C.cyn}}> PL:{p.folio}</span>}
            </div>)}
          </div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
            <div><div style={{fontSize:9,color:C.t3}}>Operador</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{trace.operador || b.created_by || 'N/A'}</div></div>
            <div><div style={{fontSize:9,color:C.t3}}>Fecha Producción</div><div style={{fontSize:12,fontWeight:600,color:C.t1}}>{new Date(trace.fecha_produccion || b.fecha_produccion || b.created_at).toLocaleString("es-MX")}</div></div>
          </div>
          {/* Machine conditions in traceability */}
          {trace.condiciones_maquina && Object.keys(trace.condiciones_maquina.temperaturas || {}).length > 0 && (
            <div style={{marginBottom:12}}>
              <div style={{fontSize:12,fontWeight:700,color:C.amb,marginBottom:6}}>🌡️ Condiciones de Máquina</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(90px, 1fr))",gap:4,marginBottom:8}}>
                {Object.entries(trace.condiciones_maquina.temperaturas).map(([zone, temp]) => (
                  <div key={zone} style={{padding:"4px 6px",background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}>
                    <div style={{fontSize:8,color:C.t3}}>{zone}</div>
                    <div style={{fontSize:13,fontWeight:700,color:C.amb,fontFamily:"monospace"}}>{temp}°C</div>
                  </div>
                ))}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:4}}>
                {trace.condiciones_maquina.rpm_extruder && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>RPM Extruder</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.rpm_extruder}</div></div>}
                {trace.condiciones_maquina.amp_motor && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>AMP Motor</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.amp_motor}A</div></div>}
                {trace.condiciones_maquina.vel_extruder && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>Vel. Extruder</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.vel_extruder}</div></div>}
                {trace.condiciones_maquina.rpm_linea && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>RPM Línea</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.rpm_linea}</div></div>}
                {trace.condiciones_maquina.vel_linea && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>Vel. Línea</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.vel_linea}</div></div>}
                {trace.condiciones_maquina.mpm_linea && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>MPM Línea</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.mpm_linea} m/min</div></div>}
                {trace.condiciones_maquina.mallas_mesh && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>Mallas</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.mallas_mesh}</div></div>}
                {/* Backwards compat with old params */}
                {trace.condiciones_maquina.rpm && <div style={{padding:4,background:C.bg,borderRadius:4,border:`1px solid ${C.brd}`,textAlign:"center"}}><div style={{fontSize:8,color:C.t3}}>RPM</div><div style={{fontSize:12,fontWeight:700,color:C.cyn}}>{trace.condiciones_maquina.rpm}</div></div>}
              </div>
              {trace.condiciones_maquina.observaciones_maq && <div style={{padding:6,background:`${C.amb}08`,borderRadius:4,marginTop:4,fontSize:10,color:C.t2}}>📝 {trace.condiciones_maquina.observaciones_maq}</div>}
            </div>
          )}
          {trace.observaciones && <div style={{padding:8,background:`${C.amb}10`,borderRadius:6,marginBottom:12}}><div style={{fontSize:9,color:C.amb,fontWeight:700}}>Observaciones</div><div style={{fontSize:11,color:C.t1}}>{trace.observaciones}</div></div>}
          <Btn text="🖨️ Imprimir Etiqueta QR" ico="" color={C.acc} full onClick={() => printTraceLabel(b)} />
        </>} />;
      })()}

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


      {/* CONTENT - MODULE ROUTING */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "10px 10px 80px" }}>
        {mod === "dashboard" && isAdmin && <Dashboard ots={ots} bobinas={bobinas} facturas={facturas} gastos={gastos} clientes={clientes} cotCRM={cotCRM} solicitudes={solicitudes} actividades={actividades} resinas={resinas} papeles={papeles} empleados={empleados} setMod={setMod} />}

        {mod === "produccion" && <Produccion
          prodTab={prodTab} setProdTab={setProdTab} turno={turno} setTurno={setTurno} turnoInicio={turnoInicio} setTurnoInicio={setTurnoInicio}
          metrics={metrics} resinas={resinas} papeles={papeles} ots={ots} bobinas={bobinas} clientes={clientes} matResinas={matResinas}
          showAddResina={showAddResina} setShowAddResina={setShowAddResina} newResina={newResina} setNewResina={setNewResina} addResina={addResina}
          showAddPapel={showAddPapel} setShowAddPapel={setShowAddPapel} newPapel={newPapel} setNewPapel={setNewPapel} addPapel={addPapel}
          showAddOT={showAddOT} setShowAddOT={setShowAddOT} newOT={newOT} setNewOT={setNewOT} addOT={addOT}
          showAddBobina={showAddBobina} setShowAddBobina={setShowAddBobina} newBobina={newBobina} setNewBobina={setNewBobina} addBobina={addBobina}
          updateOTStatus={updateOTStatus} saving={saving} isAdmin={isAdmin}
          showMachineSetup={showMachineSetup} setShowMachineSetup={setShowMachineSetup} machineTemps={machineTemps} setMachineTemps={setMachineTemps}
          machineParams={machineParams} setMachineParams={setMachineParams} startOTWithConditions={startOTWithConditions}
          showTrace={showTrace} printTraceLabel={printTraceLabel} printMPLabel={printMPLabel} generateCoCPdf={generateCoCPdf}
          setShowSolicitud={setShowSolicitud}
        />}

        {mod === "cotizador" && isAdmin && <Cotizador
          cotTab={cotTab} setCotTab={setCotTab} tipo={tipo} setTipo={setTipo} cliente={cliente} setCliente={setCliente}
          resinBlend={resinBlend} setResinBlend={setResinBlend} matResinas={matResinas} matPapeles={matPapeles}
          selPapel={selPapel} setSelPapel={setSelPapel} selResina={selResina} setSelResina={setSelResina}
          anchoMaestro={anchoMaestro} setAnchoMaestro={setAnchoMaestro} anchoUtil={anchoUtil} setAnchoUtil={setAnchoUtil}
          velMaq={velMaq} setVelMaq={setVelMaq} merma={merma} setMerma={setMerma} margen={margen} setMargen={setMargen}
          setupHrs={setupHrs} setSetupHrs={setSetupHrs} validez={validez} setValidez={setValidez} condPago={condPago} setCondPago={setCondPago}
          q1={q1} setQ1={setQ1} q2={q2} setQ2={setQ2} q3={q3} setQ3={setQ3}
          calc={calc} blendData={blendData} papelActual={papelActual}
          oh={oh} setOh={setOh} saving={saving}
          guardarCotizacion={guardarCotizacion} exportarPDF={exportarPDF} generateCotizacionTDS={generateCotizacionTDS} saveOverhead={saveOverhead} saveMateriales={saveMateriales}
          showAddMatResina={showAddMatResina} setShowAddMatResina={setShowAddMatResina} newMatR={newMatR} setNewMatR={setNewMatR} editMatR={editMatR} setEditMatR={setEditMatR}
          showAddMatPapel={showAddMatPapel} setShowAddMatPapel={setShowAddMatPapel} newMatP={newMatP} setNewMatP={setNewMatP} editMatP={editMatP} setEditMatP={setEditMatP}
          setMatResinas={setMatResinas} setMatPapeles={setMatPapeles} showToast={showToast}
        />}

        {mod === "crm" && isAdmin && <CRM
          crmTab={crmTab} setCrmTab={setCrmTab} clientes={clientes} cotCRM={cotCRM} setCotCRM={setCotCRM} actividades={actividades}
          showClienteDetail={showClienteDetail} setShowClienteDetail={setShowClienteDetail}
          showAddCliente={showAddCliente} setShowAddCliente={setShowAddCliente} newCliente={newCliente} setNewCliente={setNewCliente}
          showAddCotCRM={showAddCotCRM} setShowAddCotCRM={setShowAddCotCRM} newCotCRM={newCotCRM} setNewCotCRM={setNewCotCRM}
          editCot={editCot} setEditCot={setEditCot} editingCliente={editingCliente} setEditingCliente={setEditingCliente}
          editClienteData={editClienteData} setEditClienteData={setEditClienteData}
          updateCliente={updateCliente} deleteCliente={deleteCliente} logActivity={logActivity} showToast={showToast}
          saving={saving} setSaving={setSaving} currentUser={currentUser} supabase={supabase}
        />}

        {mod === "solicitudes" && isAdmin && <Solicitudes solicitudes={solicitudes} pendingSolicitudes={pendingSolicitudes} resolverSolicitud={resolverSolicitud} />}

        {mod === "nominas" && isAdmin && <Nominas
          nomTab={nomTab} setNomTab={setNomTab} nominaTotal={nominaTotal} empleados={empleados}
          showAddEmpleado={showAddEmpleado} setShowAddEmpleado={setShowAddEmpleado} newEmp={newEmp} setNewEmp={setNewEmp}
          editEmpleado={editEmpleado} setEditEmpleado={setEditEmpleado} expandedEmp={expandedEmp} setExpandedEmp={setExpandedEmp}
          addEmpleado={addEmpleado} startEditEmp={startEditEmp} toggleEmpleadoActivo={toggleEmpleadoActivo} saving={saving}
          oh={oh} setOh={setOh} supabase={supabase} currentUser={currentUser} showToast={showToast}
        />}

        {mod === "contabilidad" && isAdmin && <Contabilidad
          contTab={contTab} setContTab={setContTab} contMetrics={contMetrics} facturas={facturas} gastos={gastos}
          showAddFactura={showAddFactura} setShowAddFactura={setShowAddFactura} newFact={newFact} setNewFact={setNewFact} addFactura={addFactura}
          showAddGasto={showAddGasto} setShowAddGasto={setShowAddGasto} newGasto={newGasto} setNewGasto={setNewGasto} addGasto={addGasto}
          markFacturaCobrada={markFacturaCobrada} saving={saving}
        />}

        {mod === "proveedores" && isAdmin && <Proveedores
          proveedores={proveedores} showAddProv={showAddProv} setShowAddProv={setShowAddProv}
          newProv={newProv} setNewProv={setNewProv} editProv={editProv} setEditProv={setEditProv}
          addProveedor={addProveedor} startEditProv={startEditProv} deleteProveedor={deleteProveedor} saving={saving}
        />}

        {mod === "fichas" && isAdmin && <FichasTecnicas
          fichaTab={fichaTab} setFichaTab={setFichaTab} fichasResinas={fichasResinas} fichasPapeles={fichasPapeles} bobinas={bobinas}
          expandedFicha={expandedFicha} setExpandedFicha={setExpandedFicha}
          showAddFicha={showAddFicha} setShowAddFicha={setShowAddFicha} editFicha={editFicha} setEditFicha={setEditFicha}
          newFichaR={newFichaR} setNewFichaR={setNewFichaR} newFichaP={newFichaP} setNewFichaP={setNewFichaP}
          addFichaResina={addFichaResina} addFichaPapel={addFichaPapel} deleteFicha={deleteFicha}
          generateTDSPdf={generateTDSPdf} generateCoCPdf={generateCoCPdf}
          pdfInputRef={pdfInputRef} parsingPDF={parsingPDF} parseTDSFromPDF={parseTDSFromPDF} proveedores={proveedores}
        />}

        {mod === "actividad" && isAdmin && <ActividadLog actividades={actividades} clientes={clientes} actLogFilter={actLogFilter} setActLogFilter={setActLogFilter} />}

        {mod === "ai" && isAdmin && <AIChat chatMsgs={chatMsgs} chatInput={chatInput} setChatInput={setChatInput} chatLoading={chatLoading} sendChat={sendChat} />}
      </div>
    </div>
  );
}
