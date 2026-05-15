import { useState, useEffect, useCallback, useMemo, useRef, lazy, Suspense } from 'react';
import { supabase } from "./supabase";

import { C, STAGES, TEMP_ZONES, defaultTemps, DEFAULT_RESINAS, DEFAULT_PAPELES } from './utils/constants';
import { genId } from './utils/helpers';
import { fmtI, today, daysDiff } from './lib/format.js';
import { generateTraceQR, generateQR } from './lib/qr.js';
import { notifyTelegram, parseTDS, askAI } from './lib/api.js';
import { buildPackingListPdf, buildTDSPdf, buildCoCPdf, buildCotizacionTDS, buildCotizacionPdf } from './lib/pdf.js';
import { calcNomina } from './utils/calcNomina';

import { Loading, Modal, F, TxtInp, Btn, Badge, RR } from './components/ui';
import { useToast } from './components/Toast';
import { SkeletonList } from './components/Skeleton.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useData } from './context/DataContext.jsx';
import { useSupabaseCRUD } from './hooks/useSupabaseCRUD.js';

// Lazy-loaded modules (code-split) — solo se descargan cuando se navega a ellos
const Dashboard = lazy(() => import('./modules/Dashboard'));
const Produccion = lazy(() => import('./modules/Produccion'));
const Cotizador = lazy(() => import('./modules/Cotizador'));
const CRM = lazy(() => import('./modules/CRM'));
const Nominas = lazy(() => import('./modules/Nominas'));
const Contabilidad = lazy(() => import('./modules/Contabilidad'));
const Proveedores = lazy(() => import('./modules/Proveedores'));
const FichasTecnicas = lazy(() => import('./modules/FichasTecnicas'));
const Solicitudes = lazy(() => import('./modules/Solicitudes'));
const AIChat = lazy(() => import('./modules/AIChat'));
const ActividadLog = lazy(() => import('./modules/ActividadLog'));
const OrdenesCompra = lazy(() => import('./modules/OrdenesCompra'));
const Inventario = lazy(() => import('./modules/Inventario'));

// Loader visual mientras se descarga el chunk del módulo
function ModuleLoader() {
  return (
    <div style={{ padding: 20 }}>
      <SkeletonList count={6} />
    </div>
  );
}

export default function App() {
  const toastApi = useToast();
  const [mod, setMod] = useState("dashboard");
  const [showUserModal, setShowUserModal] = useState(false);

  // ── Data from DataContext (Fase B) ────────────────────────────────
  const {
    users, clientes, cotCRM, actividades, solicitudes, proveedores, pos,
    resinas, papeles, ots, bobinas, empleados, facturas, gastos, config,
    loading, syncing, lastSync,
    reload: loadData, setEntity, setConfig,
  } = useData();

  // Setter shims — preserve la firma `setX(value | updater)` que usaban los
  // handlers internos antes de la Fase B. Cada uno delega a setEntity(key, ...).
  // `setCotCRM` y `setPos` se pasan como props a módulos (CRM, OrdenesCompra),
  // por eso se mantienen aunque dentro de App.jsx no se usen directamente.
  const setResinas     = useCallback((u) => setEntity('resinas', u),     [setEntity]);
  const setPapeles     = useCallback((u) => setEntity('papeles', u),     [setEntity]);
  const setOts         = useCallback((u) => setEntity('ots', u),         [setEntity]);
  const setBobinas     = useCallback((u) => setEntity('bobinas', u),     [setEntity]);
  const setEmpleados   = useCallback((u) => setEntity('empleados', u),   [setEntity]);
  const setClientes    = useCallback((u) => setEntity('clientes', u),    [setEntity]);
  const setCotCRM      = useCallback((u) => setEntity('cotCRM', u),      [setEntity]);
  const setActividades = useCallback((u) => setEntity('actividades', u), [setEntity]);
  const setSolicitudes = useCallback((u) => setEntity('solicitudes', u), [setEntity]);
  const setPos         = useCallback((u) => setEntity('pos', u),         [setEntity]);

  // ── Auth from AuthContext (Fase B) ────────────────────────────────
  const {
    currentUser, login: setCurrentUser, isAdmin,
    bioLocked, bioAvailable, bioRegistered, bioError, unlockBiometric,
  } = useAuth();

  // Cuando termina la primera carga de usuarios, asignar default user
  // (preserva el comportamiento previo a Fase B: pick admin → fallback al primer usuario).
  const defaultUserPickedRef = useRef(false);
  useEffect(() => {
    if (defaultUserPickedRef.current) return;
    if (!users || users.length === 0) return;
    if (currentUser) { defaultUserPickedRef.current = true; return; }
    const defaultUser = users.find(u => u.rol === 'admin') || users[0];
    if (defaultUser) {
      setCurrentUser(defaultUser);
      defaultUserPickedRef.current = true;
    }
  }, [users, currentUser, setCurrentUser]);

  // ── Proveedores UI state ──────────────────────────────────────────
  const [showAddProv, setShowAddProv] = useState(false);
  const [editProv, setEditProv] = useState(null);
  const [newProv, setNewProv] = useState({ nombre: "", rfc: "", contacto: "", correo: "", telefono: "", notas: "" });

  // ── CRM UI state ──────────────────────────────────────────────────
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

  // ── Solicitudes UI state ──────────────────────────────────────────
  const [showSolicitud, setShowSolicitud] = useState(null); // { tipo, id, registro }
  const [solicitudMotivo, setSolicitudMotivo] = useState("");

  // Backward-compatible wrapper around the new toast system.
  // Legacy types: "ok"/default → success, "warn" → warning, "error" → error.
  const showToast = useCallback((msg, type = "ok") => {
    const mapped = type === "error" ? "error" : type === "warn" ? "warning" : "success";
    toastApi.show(msg, { type: mapped });
  }, [toastApi]);
  const logActivity = useCallback(async (texto, clienteId=null) => {
    const act = { texto, cliente_id: clienteId, fecha: new Date().toISOString(), usuario: currentUser?.nombre||"Sistema" };
    setActividades(prev => [{...act, id: genId()}, ...(prev || [])].slice(0, 200));
    try {
      const { error } = await supabase.from('actividades').insert(act);
      if (error) console.error('[logActivity] insert error:', error);
    } catch (e) {
      console.error('[logActivity] unexpected error:', e);
    }
  }, [currentUser, setActividades]);

  // Handle QR code scan → open traceability from hash URL
  useEffect(() => {
    const checkHash = async () => {
      const hash = window.location.hash;
      if (hash.startsWith('#trace/')) {
        const bobId = hash.replace('#trace/', '');
        const { data, error } = await supabase.from('bobinas_pt').select('*').eq('id', bobId).single();
        if (error) {
          console.error('[checkHash trace] error:', error);
          toastApi.error('No se encontró la bobina escaneada');
        } else if (data) {
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

  const user = currentUser || { nombre: 'Usuario', rol: 'operador' };

  const modules = [
    { id: "dashboard", l: "Dashboard", ico: "📈", admin: true },
    { id: "produccion", l: "Producción", ico: "🏭", admin: false },
    { id: "cotizador", l: "Cotizador", ico: "⚖️", admin: true },
    { id: "crm", l: "CRM", ico: "🎯", admin: true },
    { id: "pos", l: "Órdenes", ico: "🛒", admin: true },
    { id: "inventario", l: "Inventario", ico: "📦", admin: true },
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
      folio_packing: newResina.folio_packing || null
    }).select();
    if (error) { showToast("Error resina: " + error.message, "error"); setSaving(false); return; }
    if (data) { setResinas(prev => [data[0], ...prev]); showToast("Resina registrada"); }
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
      folio_packing: newPapel.folio_packing || null
    }).select();
    if (error) { showToast("Error papel: " + error.message, "error"); setSaving(false); return; }
    if (data) { setPapeles(prev => [data[0], ...prev]); showToast("Papel registrado"); }
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
    } catch (e) {
      console.error('[addOT] error:', e);
      showToast("Error: " + e.message, "error");
    }
    setSaving(false);
  };

  const updateOTStatus = async (id, newStatus) => {
    // When starting/resuming an OT, show machine conditions popup first
    if (newStatus === 'en_proceso') {
      const ot = ots.find(o => o.id === id);
      // If resuming from pausada and already has conditions, skip setup
      if (ot?.status === 'pausada' && ot?.condiciones_maquina) {
        const updates = { status: 'en_proceso' };
        const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
        if (error) {
          console.error('[updateOTStatus resume] error:', error);
          showToast(`Error al reanudar OT: ${error.message}`, "error");
        } else {
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

    const updates = { status: newStatus };
    if (newStatus === 'completada') updates.fecha_fin = today();

    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', id);
    if (error) {
      console.error('[updateOTStatus] error:', error);
      showToast(`Error al actualizar OT: ${error.message}`, "error");
      return;
    }
    const ot = ots.find(o => o.id === id);
    setOts(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    if (newStatus === 'pausada' && ot) { showToast(`${ot.codigo} pausada`); notifyTelegram(`OT Pausada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}`, "ot"); }
    if (newStatus === 'completada' && ot) {
      notifyTelegram(`OT Completada: *${ot.codigo}*\nCliente: ${ot.cliente_nombre}\n${ot.kg_producidos || 0}kg producidos`, "production");
      // Auto-generate Packing List PDF (async — dynamic import de jsPDF)
      generatePackingList(ot).catch(e => {
        console.error("PL error:", e);
        showToast(`Error generando Packing List: ${e.message}`, "error");
      });
    }
  };

  const generatePackingList = async (ot) => {
    const otBobinas = bobinas.filter(b => b.ot_id === ot.id || b.ot_codigo === ot.codigo);
    if (!otBobinas.length) { showToast("Sin bobinas para packing list", "error"); return; }
    const { totalBobinas, totalPeso } = await buildPackingListPdf(ot, otBobinas);
    showToast(`📋 Packing List generada: PL_${ot.codigo}`);
    logActivity(`Packing List generada para ${ot.codigo} — ${totalBobinas} bobinas, ${fmtI(totalPeso)}kg`);
  };

  const startOTWithConditions = async () => {
    if (!showMachineSetup) return;
    setSaving(true);
    const tempsFilled = {};
    Object.entries(machineTemps).forEach(([k, v]) => { if (v) tempsFilled[k] = parseFloat(v); });
    const paramsFilled = {};
    Object.entries(machineParams).forEach(([k, v]) => { if (v) paramsFilled[k] = v; });

    const condiciones = { temperaturas: tempsFilled, ...paramsFilled, registrado_por: currentUser?.nombre, fecha_registro: new Date().toISOString() };

    const updates = { status: 'en_proceso', fecha_inicio: today(), condiciones_maquina: JSON.stringify(condiciones) };
    const { error } = await supabase.from('ordenes_trabajo').update(updates).eq('id', showMachineSetup);
    if (error) {
      console.error('[startOTWithConditions] error:', error);
      showToast(`Error iniciando OT: ${error.message}`, "error");
    } else {
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
      trazabilidad: JSON.stringify(trazabilidad)
    }).select();

    if (error) { showToast("Error bobina: " + error.message, "error"); setSaving(false); return; }
    if (data) {
      setBobinas(prev => [data[0], ...prev]);
      if (ot) {
        const newMetros = (ot.metros_producidos || 0) + parseFloat(newBobina.metros);
        const newKg = (ot.kg_producidos || 0) + parseFloat(newBobina.peso);
        const newBobCount = (ot.bobinas_producidas || 0) + 1;
        const otUpd = await supabase.from('ordenes_trabajo').update({
          metros_producidos: newMetros, kg_producidos: newKg, bobinas_producidas: newBobCount
        }).eq('id', ot.id);
        if (otUpd.error) {
          console.error('[addBobina] OT counters update error:', otUpd.error);
          showToast("Bobina guardada, pero no se pudo actualizar el conteo de OT", "warn");
        }
        setOts(prev => prev.map(o => o.id === ot.id ? { ...o, metros_producidos: newMetros, kg_producidos: newKg, bobinas_producidas: newBobCount } : o));
      }
      notifyTelegram(`📦 Bobina *${codigo}*\nLote: ${lote}\nOT: ${ot?.codigo}\n${newBobina.peso}kg | ${newBobina.metros}m\nOperador: ${currentUser?.nombre}`, "production");

      // Auto-consume inventory: mark used resinas/papeles and log movements
      for (const r of resinasInfo) {
        const upd = await supabase.from('resinas').update({ status: 'consumida' }).eq('id', r.id);
        if (upd.error) console.error('[addBobina] resina update error:', upd.error);
        setResinas(prev => prev.map(x => x.id === r.id ? { ...x, status: 'consumida' } : x));
        // Log inventory movement (non-fatal if movimientos_inventario table doesn't exist)
        const mov = await supabase.from('movimientos_inventario').insert({
          tipo: 'consumo', material_tipo: 'resina', material_id: r.id,
          material_nombre: r.nombre || r.tipo || r.codigo,
          cantidad: -(parseFloat(r.peso_kg) || 0), unidad: 'kg',
          ot_id: ot?.id, bobina_id: data[0]?.id,
          motivo: `Consumida en ${codigo} (OT ${ot?.codigo})`,
          usuario: currentUser?.nombre || 'Sistema',
        }).then(r => r, e => ({ error: e }));
        if (mov?.error) console.warn('[addBobina] movimiento resina error:', mov.error);
      }
      for (const p of papelesInfo) {
        const upd = await supabase.from('papel_bobinas').update({ status: 'consumida' }).eq('id', p.id);
        if (upd.error) console.error('[addBobina] papel update error:', upd.error);
        setPapeles(prev => prev.map(x => x.id === p.id ? { ...x, status: 'consumida' } : x));
        const mov = await supabase.from('movimientos_inventario').insert({
          tipo: 'consumo', material_tipo: 'papel', material_id: p.id,
          material_nombre: p.nombre || p.tipo || p.codigo,
          cantidad: -(parseFloat(p.peso_kg) || 0), unidad: 'kg',
          ot_id: ot?.id, bobina_id: data[0]?.id,
          motivo: `Consumido en ${codigo} (OT ${ot?.codigo})`,
          usuario: currentUser?.nombre || 'Sistema',
        }).then(r => r, e => ({ error: e }));
        if (mov?.error) console.warn('[addBobina] movimiento papel error:', mov.error);
      }
    }
    setShowAddBobina(false);
    setNewBobina({ ot_id: "", ancho: "980", metros: "2000", peso: "180", gramaje: "95", resinas_usadas: [], papeles_usados: [], observaciones: "" });
    setSaving(false);
  };

  // Generate QR code for traceability
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
    const qr = await generateQR(traceUrl, { width: 250, color: { dark: '#0B0F1A', light: '#FFFFFF' } });
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
  const [gramAplicacion, setGramAplicacion] = useState("");
  const [anchoMaestro, setAnchoMaestro] = useState("1000");
  const [anchoUtil, setAnchoUtil] = useState("980");
  const [velMaq, setVelMaq] = useState("80");
  const [merma, setMerma] = useState("5");
  const [margen, setMargen] = useState("35");
  const [margen1, setMargen1] = useState("");
  const [margen2, setMargen2] = useState("");
  const [margen3, setMargen3] = useState("");
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

  const ohLoaded = useRef(false);
  useEffect(() => {
    if (config.overhead && Object.keys(config.overhead).length) {
      setOh(config.overhead);
      setTimeout(() => { ohLoaded.current = true; }, 600);
    }
  }, [config]);

  // Auto-save overhead when it changes (after initial load)
  useEffect(() => {
    if (!ohLoaded.current) return;
    const timer = setTimeout(async () => {
      const res = await saveConfig('overhead', oh);
      if (res.error) console.error('[AutoSave] Overhead FALLÓ:', res.error.message);
      else console.log('[AutoSave] Overhead guardado OK');
    }, 2000);
    return () => clearTimeout(timer);
  }, [oh]);

  // Load materiales from config
  const matsLoaded = useRef(false);
  useEffect(() => {
    const loadMats = async () => {
      try {
        // Use eq filter + order to always get the latest row
        const r = await supabase.from('configuracion').select('*').eq('clave', 'materiales').limit(1);
        if (r.error) console.error('[loadMats] error:', r.error);
        const mats = r.data?.[0];
        if (mats?.valor) {
          if (mats.valor.resinas?.length) setMatResinas(mats.valor.resinas);
          if (mats.valor.papeles?.length) setMatPapeles(mats.valor.papeles);
        }
        setTimeout(() => { matsLoaded.current = true; }, 600);
      } catch (e) {
        console.error('[loadMats] unexpected:', e);
        matsLoaded.current = true;
      }
    };
    loadMats();
  }, []);

  // Helper: save a configuracion row by clave (select→update or insert, with error checking)
  const saveConfig = async (clave, valor) => {
    const payload = { clave, valor };
    const { data: existing, error: selErr } = await supabase.from('configuracion').select('id,clave').eq('clave', clave).limit(1);
    if (selErr) { console.error(`[saveConfig] select ${clave} error:`, selErr); return { error: selErr }; }
    if (existing?.length) {
      const { error: updErr } = await supabase.from('configuracion').update(payload).eq('clave', clave);
      if (updErr) { console.error(`[saveConfig] update ${clave} error:`, updErr); return { error: updErr }; }
    } else {
      const { error: insErr } = await supabase.from('configuracion').insert(payload);
      if (insErr) { console.error(`[saveConfig] insert ${clave} error:`, insErr); return { error: insErr }; }
    }
    console.log(`[saveConfig] ${clave} guardado OK`);
    return { error: null };
  };

  // Auto-save materials when they change (after initial load)
  useEffect(() => {
    if (!matsLoaded.current) return;
    const timer = setTimeout(async () => {
      const res = await saveConfig('materiales', { resinas: matResinas, papeles: matPapeles });
      if (res.error) console.error('[AutoSave] Materiales FALLÓ:', res.error.message);
      else console.log('[AutoSave] Materiales guardados OK');
    }, 1500);
    return () => clearTimeout(timer);
  }, [matResinas, matPapeles]);

  const saveMateriales = async () => {
    const res = await saveConfig('materiales', { resinas: matResinas, papeles: matPapeles });
    if (res.error) { showToast(`Error guardando materiales: ${res.error.message}`, "error"); return; }
    showToast(`Materiales guardados`);
    logActivity("Catálogo de materiales actualizado");
  };

  const saveOverhead = async () => {
    if (!confirm("¿Guardar cambios en overhead?")) return;
    const res = await saveConfig('overhead', oh);
    if (res.error) { showToast(`Error guardando overhead: ${res.error.message}`, "error"); return; }
    showToast(`Overhead guardado por ${currentUser?.nombre || "Sistema"}`);
    logActivity("Overhead actualizado");
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
    const pGr = parseFloat(gramAplicacion) || parseFloat(blendData.gramaje) || 15;
    const papGrV = parseFloat(papelActual.gramaje) || 80;
    const rP = parseFloat(blendData.precio) || 32;
    const pP = parseFloat(papelActual.precio) || 20;
    const aMaestro = (parseFloat(anchoMaestro) || 1000) / 1000;
    const aUtil = (parseFloat(anchoUtil) || 980) / 1000;
    const mermaRefil = aMaestro > 0 ? ((aMaestro - aUtil) / aMaestro) * 100 : 0;
    const vel = parseFloat(velMaq) || 80;
    const merm = (parseFloat(merma) || 5) / 100;
    const margDef = (parseFloat(margen) || 35) / 100;
    const esMaq = tipo === "maquila";
    const peKgPorM = (pGr * aMaestro) / 1000;
    const papKgPorM = (papGrV * aMaestro) / 1000;
    const totalGrM2 = papGrV + pGr;
    const kgUtilPorM = (totalGrM2 * aUtil) / 1000;
    const mPorHr = vel * 60;
    const ohTotal = (oh.renta||0)+(oh.luz||0)+(oh.gas||0)+(oh.agua||0)+(oh.mantenimiento||0)+(oh.mo_directa||0)+(oh.socios||0)+(oh.otros||0);
    const ohHr = ohTotal / (oh.horas_mes || 176);
    const sHrs = parseFloat(setupHrs) || 3;
    const calcQ = (qKg, margOverride) => {
      if (!qKg || qKg <= 0) return null;
      const mo = String(margOverride||"").trim();
      const marg = mo !== "" && !isNaN(parseFloat(mo)) ? parseFloat(mo) / 100 : margDef;
      const mLin = qKg / kgUtilPorM;
      const m2Util = mLin * aUtil;
      const m2Maestro = mLin * aMaestro;
      const hrs = mLin / mPorHr;
      const resinaKg = (peKgPorM * mLin) * (1 + merm);
      const papelKg = esMaq ? 0 : papKgPorM * mLin;
      const costoResina = resinaKg * rP;
      const costoPapel = papelKg * pP;
      const costoOH = hrs * ohHr;
      const costoSetup = sHrs * ohHr;
      const costoTotal = costoResina + costoPapel + costoOH + costoSetup;
      const precioVenta = costoTotal / (1 - marg);
      const utilidad = precioVenta - costoTotal;
      const pk = precioVenta / qKg;
      const pm2 = precioVenta / m2Util;
      const setupPorKg = costoSetup / qKg;
      const margPct = marg * 100;
      return { q: qKg, mLin, m2: m2Util, m2Maestro, hrs, resinaKg, papelKg, costoResina, costoPapel, costoOH, costoSetup, setupPorKg, costoTotal, precioVenta, utilidad, pk, pm2, pv: precioVenta, ut: utilidad, margPct };
    };
    return { e1: calcQ(parseFloat(q1)||0, margen1), e2: calcQ(parseFloat(q2)||0, margen2), e3: calcQ(parseFloat(q3)||0, margen3), ohTotal, ohHr, totalGrM2, esMaq, pGr, papGrV, rP, pP, mermaRefil, aMaestro, aUtil };
  }, [blendData, papelActual, anchoMaestro, anchoUtil, velMaq, merma, margen, margen1, margen2, margen3, q1, q2, q3, tipo, oh, setupHrs, gramAplicacion]);

  const guardarCotizacion = async () => {
    const escenarios = [calc.e1, calc.e2, calc.e3].filter(Boolean);
    if (!escenarios.length || !cliente) { showToast("Completa cliente y cantidades", "warn"); return; }
    setSaving(true);
    try {
      const numero = `KP-${String(cotCRM.length + 1).padStart(4, "0")}`;
      const cl = clientes.find(c => c.nombre.toLowerCase() === cliente.toLowerCase());
      const rNombre = resinaActual.nombre || resinaActual.parts?.map(p=>p.nombre).join("+") || "PE";
      const items = escenarios.map(e => ({
        producto: `${papelActual.nombre} + ${rNombre}`,
        cantidad: e.q,
        precio_kg: Math.round(e.pk * 100) / 100,
        subtotal: Math.round(e.pv * 100) / 100,
      }));
      // Minimal payload — same columns as CRM module uses
      const cotData = {
        numero,
        cliente_id: cl?.id || null,
        cliente_nombre: cliente,
        items,
        total: Math.round(escenarios[0].pv * 100) / 100,
        pago: condPago,
        notas: `${rNombre} + ${papelActual.nombre} | ${papelActual.gramaje}g/${resinaActual.gramaje||"?"}g | ${anchoMaestro}→${anchoUtil}mm | Merma ${merma}% | Margen ${margen}%`,
        fecha: today(),
        status: "borrador",
      };
      console.log('[Cotizacion] Payload:', cotData);
      const { data, error } = await supabase.from('cotizaciones_crm').insert(cotData).select();
      console.log('[Cotizacion] Response:', { data, error });
      if (error) { showToast(`Error: ${error.message}`, "error"); setSaving(false); return; }
      if (data?.[0]) {
        setCotCRM(prev => [data[0], ...prev]);
        if (cl && ["lead", "contactado"].includes(cl.etapa)) updateCliente(cl.id, { etapa: "cotizado" });
        showToast(`Cotización ${numero} guardada ✓`);
        notifyTelegram(`Nueva Cotización: *${numero}*\nCliente: ${cliente}\nPrecio: $${fmtI(escenarios[0].pv)}`, "crm");
        logActivity(`Cotización ${numero} — $${fmtI(escenarios[0].pv)} para ${cliente}`, cl?.id);
      }
    } catch(e) { console.error('[Cotizacion] Exception:', e); showToast(`Excepción: ${e.message}`, "error"); }
    setSaving(false);
  };

  const exportarPDF = async () => {
    const escenarios = [calc.e1, calc.e2, calc.e3].filter(Boolean);
    if (!escenarios.length || !cliente) { showToast("Completa cliente y cantidades", "warn"); return; }
    const numero = `KP-${String(cotCRM.length + 1).padStart(4, "0")}`;
    await buildCotizacionPdf({
      cliente, clientes, escenarios, resinaActual, papelActual, calc,
      tipo, anchoMaestro, anchoUtil, merma, margen, condPago, validez, numero,
    });
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
      if (error) {
        console.error('[addEmpleado update] error:', error);
        showToast(`Error actualizando empleado: ${error.message}`, "error");
      } else {
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
      if (error) {
        console.error('[addEmpleado insert] error:', error);
        showToast(`Error agregando empleado: ${error.message}`, "error");
      } else if (data) {
        setEmpleados(prev => [...prev, data[0]]);
        showToast(`${newEmp.nombre} agregado`);
      }
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
    const { error: empErr } = await supabase.from('empleados').update({ activo: !activo }).eq('id', id);
    if (empErr) { showToast("Error: " + empErr.message, "error"); return; }
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
      saveConfig('overhead', newOh).then(res => {
        if (!res.error) showToast("MO Overhead sincronizado automáticamente");
        else console.error('[NominaSync] Error:', res.error.message);
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

      const data = await parseTDS(base64, tipo);

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
        if (r.error) { console.error('[loadFichas] error:', r.error); return; }
        const ft = r.data?.find(c => c.clave === 'fichas_tecnicas');
        if (ft?.valor) {
          if (ft.valor.resinas?.length) setFichasResinas(ft.valor.resinas);
          if (ft.valor.papeles?.length) setFichasPapeles(ft.valor.papeles);
        }
      } catch (e) {
        console.error('[loadFichas] unexpected:', e);
      }
    };
    loadFichas();
  }, []);

  const saveFichas = async (resinas, papeles) => {
    const res = await saveConfig('fichas_tecnicas', { resinas, papeles });
    if (res.error) console.error('[Fichas] Error guardando:', res.error.message);
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

  const generateTDSPdf = async (ficha, tipo) => {
    await buildTDSPdf(ficha, tipo);
    showToast("PDF ficha técnica descargado");
  };

  const generateCoCPdf = async (bobina) => {
    const ok = await buildCoCPdf(bobina);
    if (!ok) { showToast("Sin trazabilidad para generar CoC"); return; }
    showToast("Certificado de Calidad descargado");
  };

  // Generate TDS PDF from cotización materials (for sending to clients)
  const generateCotizacionTDS = async (materialesUsados) => {
    await buildCotizacionTDS(materialesUsados, { resinas: fichasResinas, papeles: fichasPapeles });
    showToast("Ficha Técnica de cotización descargada");
  };

  // ═══ AI CHAT STATE ═══
  const [chatMsgs, setChatMsgs] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────
  // Migrated to useSupabaseCRUD (Fase B sample):
  //   • proveedores  → addProveedor / deleteProveedor
  //   • facturas     → addFactura / markFacturaCobrada
  //   • gastos       → addGasto
  // El resto del CRUD ad-hoc del archivo queda intacto a propósito; migración
  // incremental en sesiones futuras.
  // ─────────────────────────────────────────────────────────────────
  const proveedoresCRUD = useSupabaseCRUD('proveedores', 'proveedores', {
    successMsg: { remove: 'Proveedor eliminado' },
  });
  const facturasCRUD = useSupabaseCRUD('facturas', 'facturas');
  const gastosCRUD   = useSupabaseCRUD('gastos', 'gastos');

  const addProveedor = async () => {
    if (!newProv.nombre) { showToast("Nombre requerido"); return; }
    setSaving(true);
    try {
      if (editProv) {
        const updated = await proveedoresCRUD.update(
          editProv.id,
          { nombre: newProv.nombre, rfc: newProv.rfc, contacto: newProv.contacto, correo: newProv.correo, telefono: newProv.telefono, notas: newProv.notas },
          `${newProv.nombre} actualizado`,
        );
        if (!updated) { setSaving(false); return; }
      } else {
        const created = await proveedoresCRUD.insert({ ...newProv }, `${newProv.nombre} agregado`);
        if (!created) { setSaving(false); return; }
      }
      setShowAddProv(false);
      setEditProv(null);
      setNewProv({ nombre: "", rfc: "", contacto: "", correo: "", telefono: "", notas: "" });
    } catch (e) { showToast("Error: " + e.message, "error"); }
    setSaving(false);
  };

  const startEditProv = (p) => {
    setNewProv({ nombre: p.nombre || "", rfc: p.rfc || "", contacto: p.contacto || "", correo: p.correo || "", telefono: p.telefono || "", notas: p.notas || "" });
    setEditProv(p);
    setShowAddProv(true);
  };

  const deleteProveedor = async (id) => {
    if (!confirm("¿Eliminar proveedor?")) return;
    await proveedoresCRUD.remove(id);
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
      const data = await askAI(userMsg, ctx);
      if (data.error) setChatMsgs(prev => [...prev, { role: "ai", text: `Error: ${data.error}` }]);
      else setChatMsgs(prev => [...prev, { role: "ai", text: data.reply }]);
    } catch (e) {
      console.error('[AI chat] error:', e);
      setChatMsgs(prev => [...prev, { role: "ai", text: "Error de conexión" }]);
    }
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

    const created = await facturasCRUD.insert({
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
    }, "Factura registrada");
    if (!created) { setSaving(false); return; }
    setShowAddFactura(false);
    setNewFact({ cliente: "", concepto: "", monto: "", diasCredito: "30", fechaEmision: today() });
    setSaving(false);
  };

  const markFacturaCobrada = async (id) => {
    await facturasCRUD.update(id, { status: 'cobrada', fecha_cobro: today() }, "Factura marcada como cobrada");
  };

  const addGasto = async () => {
    if (!newGasto.concepto || !newGasto.monto) return;
    setSaving(true);
    const codigo = `GAS-${String(gastos.length + 1).padStart(3, "0")}`;
    const monto = parseFloat(newGasto.monto);

    const created = await gastosCRUD.insert({
      codigo,
      concepto: newGasto.concepto,
      categoria: newGasto.categoria,
      monto,
      total: monto,
      fecha: newGasto.fecha,
      comprobante: newGasto.comprobante
    }, "Gasto registrado");
    if (!created) { setSaving(false); return; }
    setShowAddGasto(false);
    setNewGasto({ concepto: "", categoria: "materia_prima", monto: "", fecha: today(), comprobante: "" });
    setSaving(false);
  };

  // Solicitudes de corrección
  const pendingSolicitudes = solicitudes.filter(s => s.status === "pendiente");

  const crearSolicitud = async (tipo, registroId, registroCodigo, motivo) => {
    if (!motivo.trim()) { showToast("Escribe un motivo", "warn"); return; }
    const sol = { tipo, registro_id: registroId, registro_codigo: registroCodigo, motivo, solicitante: currentUser?.nombre || "Operador", status: "pendiente", created_at: new Date().toISOString() };
    const { data, error: solErr } = await supabase.from('solicitudes_correccion').insert(sol).select();
    if (solErr) { showToast("Error: " + solErr.message, "error"); return; }
    if (data?.[0]) { setSolicitudes(prev => [data[0], ...prev]); showToast("Solicitud enviada"); logActivity(`Solicitud corrección: ${registroCodigo} — ${motivo}`); notifyTelegram(`Solicitud de Corrección\nRegistro: *${registroCodigo}*\nMotivo: ${motivo}\nSolicitante: ${currentUser?.nombre}`, "alert"); }
    setShowSolicitud(null); setSolicitudMotivo("");
  };

  const resolverSolicitud = async (id, accion) => {
    const updates = { status: accion, resuelto_por: currentUser?.nombre || "Admin", resuelto_at: new Date().toISOString() };
    const { error: solUpErr } = await supabase.from('solicitudes_correccion').update(updates).eq('id', id);
    if (solUpErr) { showToast("Error: " + solUpErr.message, "error"); return; }
    setSolicitudes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    const sol = solicitudes.find(s => s.id === id);
    showToast(`Solicitud ${accion === "aprobada" ? "aprobada" : "rechazada"}`);
    logActivity(`Solicitud ${sol?.registro_codigo}: ${accion} por ${currentUser?.nombre}`);
  };

  // CRM DB Operations
  const updateCliente = async (id, updates) => {
    const tracked = { ...updates };
    const { error: clErr } = await supabase.from('clientes').update(tracked).eq('id', id);
    if (clErr) { showToast("Error cliente: " + clErr.message, "error"); return; }
    setClientes(prev => prev.map(c => c.id === id ? { ...c, ...tracked } : c));
    if (updates.etapa) { const cl = clientes.find(c => c.id === id); const stg = STAGES.find(s => s.id === updates.etapa); logActivity(`${cl?.nombre} → ${stg?.l}`, id); showToast(`${cl?.nombre} → ${stg?.l}`); }
  };
  const deleteCliente = async (id) => {
    const cl = clientes.find(c => c.id === id);
    const { error: delErr } = await supabase.from('clientes').delete().eq('id', id);
    if (delErr) { showToast("Error: " + delErr.message, "error"); return; }
    setClientes(prev => prev.filter(c => c.id !== id));
    logActivity(`Cliente eliminado: ${cl?.nombre}`);
    showToast("Cliente eliminado", "warn");
    setShowClienteDetail(null);
  };

  // ═══════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════
  // ═══ BIOMETRIC LOCK SCREEN ═══
  if (bioLocked && bioAvailable) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 20, padding: 24 }}>
        <div style={{ width: 80, height: 80, borderRadius: 20, background: `linear-gradient(135deg, ${C.acc}, ${C.pur})`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 36, color: "#fff", boxShadow: `0 8px 32px ${C.acc}40` }}>K</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: C.t1, letterSpacing: -0.5 }}>Kattegat Industries</div>
        <div style={{ fontSize: 13, color: C.t3, textAlign: "center" }}>
          {bioRegistered ? "Usa Face ID o Touch ID para acceder" : "Configura Face ID o Touch ID para proteger tu app"}
        </div>
        <button onClick={unlockBiometric} style={{
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

      {/* TOAST: ahora renderizado por <ToastProvider/> en main.jsx */}

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
        <Suspense fallback={<ModuleLoader />}>
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
          setShowSolicitud={setShowSolicitud} generatePackingList={generatePackingList}
        />}

        {mod === "cotizador" && isAdmin && <Cotizador
          cotTab={cotTab} setCotTab={setCotTab} tipo={tipo} setTipo={setTipo} cliente={cliente} setCliente={setCliente} clientes={clientes}
          producto={producto} setProducto={setProducto}
          resinBlend={resinBlend} setResinBlend={setResinBlend} matResinas={matResinas} matPapeles={matPapeles}
          selPapel={selPapel} setSelPapel={setSelPapel} selResina={selResina} setSelResina={setSelResina}
          gramAplicacion={gramAplicacion} setGramAplicacion={setGramAplicacion}
          anchoMaestro={anchoMaestro} setAnchoMaestro={setAnchoMaestro} anchoUtil={anchoUtil} setAnchoUtil={setAnchoUtil}
          velMaq={velMaq} setVelMaq={setVelMaq} merma={merma} setMerma={setMerma} margen={margen} setMargen={setMargen}
          margen1={margen1} setMargen1={setMargen1} margen2={margen2} setMargen2={setMargen2} margen3={margen3} setMargen3={setMargen3}
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

        {mod === "pos" && isAdmin && <OrdenesCompra
          clientes={clientes} ots={ots} pos={pos} setPos={setPos} supabase={supabase}
          saving={saving} setSaving={setSaving} showToast={showToast} logActivity={logActivity}
          currentUser={currentUser} notifyTelegram={notifyTelegram}
        />}

        {mod === "inventario" && isAdmin && <Inventario
          resinas={resinas} papeles={papeles} bobinas={bobinas} supabase={supabase}
          saving={saving} setSaving={setSaving} showToast={showToast} logActivity={logActivity}
          currentUser={currentUser} notifyTelegram={notifyTelegram}
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
        </Suspense>
      </div>
    </div>
  );
}
