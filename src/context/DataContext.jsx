import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../supabase.js';
import { useToast } from '../components/Toast.jsx';

/**
 * DataContext — fuente única de verdad para los datos de negocio cargados desde Supabase.
 *
 * Mantiene compatibilidad con App.jsx pre-Fase B: expone tanto el objeto agregado
 * como cada entidad por separado (clientes, ots, etc.), `reload()` para refrescar,
 * `setEntity()` para actualización optimista, y los flags `loading` / `syncing` /
 * `lastSync` para que el header pueda mostrar estado de sincronización.
 *
 * Lo que NO maneja:
 *   - Fichas técnicas (viven en tabla `configuracion`, ya tienen su propio loader)
 *   - Catálogo de materiales del cotizador (igualmente en `configuracion`)
 *   - Selección de usuario actual (vive en AuthContext)
 */

const INITIAL = {
  users: [],
  clientes: [],
  cotCRM: [],
  actividades: [],
  solicitudes: [],
  proveedores: [],
  pos: [],
  resinas: [],
  papeles: [],
  ots: [],
  bobinas: [],
  empleados: [],
  facturas: [],
  gastos: [],
  config: { overhead: {} },
};

const DataCtx = createContext(null);

export function DataProvider({ children }) {
  const toast = useToast();
  const [data, setData] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);

  const refreshing = useRef(false);
  const initialLoadDone = useRef(false);

  // ── Reload all data ─────────────────────────────────────────────
  const reload = useCallback(async () => {
    if (refreshing.current) return;
    refreshing.current = true;
    if (initialLoadDone.current) setSyncing(true); else setLoading(true);

    // Core queries — failure of one shouldn't kill the rest (Promise.allSettled).
    const coreQueries = [
      ['usuarios',        supabase.from('usuarios').select('*').eq('activo', true)],
      ['resinas',         supabase.from('resinas').select('*').order('fecha_entrada', { ascending: false })],
      ['papel_bobinas',   supabase.from('papel_bobinas').select('*').order('fecha_entrada', { ascending: false })],
      ['ordenes_trabajo', supabase.from('ordenes_trabajo').select('*').order('fecha_creacion', { ascending: false })],
      ['bobinas_pt',      supabase.from('bobinas_pt').select('*').order('fecha_produccion', { ascending: false })],
      ['empleados',       supabase.from('empleados').select('*').eq('activo', true)],
      ['facturas',        supabase.from('facturas').select('*').order('fecha_emision', { ascending: false })],
      ['gastos',          supabase.from('gastos').select('*').order('fecha', { ascending: false })],
      ['configuracion',   supabase.from('configuracion').select('*')],
    ];
    const coreResults = await Promise.allSettled(coreQueries.map(([, q]) => q));
    const get = (i) => {
      const r = coreResults[i];
      if (r.status !== 'fulfilled') return { data: null, error: r.reason };
      return r.value;
    };
    const usersRes    = get(0);
    const resinasRes  = get(1);
    const papelesRes  = get(2);
    const otsRes      = get(3);
    const bobinasRes  = get(4);
    const empleadosRes= get(5);
    const facturasRes = get(6);
    const gastosRes   = get(7);
    const configRes   = get(8);

    // Aux queries — these tables may not exist in older deployments, warnings only.
    const auxQueries = [
      ['clientes',               supabase.from('clientes').select('*').order('created_at', { ascending: false })],
      ['cotizaciones_crm',       supabase.from('cotizaciones_crm').select('*').order('fecha', { ascending: false })],
      ['actividades',            supabase.from('actividades').select('*').order('fecha', { ascending: false }).limit(200)],
      ['solicitudes_correccion', supabase.from('solicitudes_correccion').select('*').order('created_at', { ascending: false })],
      ['proveedores',            supabase.from('proveedores').select('*').order('created_at', { ascending: false })],
      ['ordenes_compra',         supabase.from('ordenes_compra').select('*').order('created_at', { ascending: false })],
    ];
    const auxResults = await Promise.allSettled(auxQueries.map(([, q]) => q));
    const aux = {};
    auxResults.forEach((r, i) => {
      const tableName = auxQueries[i][0];
      if (r.status === 'fulfilled') {
        if (r.value?.error) {
          // Table missing or RLS issue — log warning but don't toast (aux data is non-critical)
          console.warn(`[DataContext/aux] ${tableName} error:`, r.value.error);
        } else if (r.value?.data) {
          aux[tableName] = r.value.data;
        }
      } else {
        console.warn(`[DataContext/aux] ${tableName} rejected:`, r.reason);
      }
    });

    // Apply state in a single setData call to avoid multiple re-renders
    setData(prev => {
      const next = { ...prev };
      next.users     = usersRes.data    || prev.users;
      next.resinas   = resinasRes.data  || prev.resinas;
      next.papeles   = papelesRes.data  || prev.papeles;
      next.ots       = otsRes.data      || prev.ots;
      next.bobinas   = bobinasRes.data  || prev.bobinas;
      next.empleados = empleadosRes.data|| prev.empleados;
      next.facturas  = facturasRes.data || prev.facturas;
      next.gastos    = gastosRes.data   || prev.gastos;

      if (aux.clientes !== undefined)               next.clientes     = aux.clientes;
      if (aux.cotizaciones_crm !== undefined)       next.cotCRM       = aux.cotizaciones_crm;
      if (aux.actividades !== undefined)            next.actividades  = aux.actividades;
      if (aux.solicitudes_correccion !== undefined) next.solicitudes  = aux.solicitudes_correccion;
      if (aux.proveedores !== undefined)            next.proveedores  = aux.proveedores;
      if (aux.ordenes_compra !== undefined)         next.pos          = aux.ordenes_compra;

      // Only load config on FIRST load — avoid stomping in-flight user edits during auto-refresh
      if (!initialLoadDone.current) {
        const ohConfig = configRes.data?.find(c => c.clave === 'overhead');
        if (ohConfig) next.config = { overhead: ohConfig.valor };
      }
      return next;
    });

    // Count failures and toast (only after initial load — first-time loading screen handles UI)
    const failures = [];
    [usersRes, resinasRes, papelesRes, otsRes, bobinasRes, empleadosRes, facturasRes, gastosRes, configRes].forEach((r, i) => {
      if (r.error) {
        console.error(`[DataContext] ${coreQueries[i][0]} error:`, r.error);
        failures.push(coreQueries[i][0]);
      }
    });
    if (failures.length > 0 && initialLoadDone.current) {
      toast.error(`No se pudieron cargar ${failures.length} tabla(s): ${failures.join(', ')}`);
    }

    initialLoadDone.current = true;
    setLoading(false);
    setSyncing(false);
    setLastSync(new Date().toLocaleTimeString('es-MX'));
    refreshing.current = false;
  }, [toast]);

  // ── Mutators for optimistic updates from módulos / handlers ─────
  const setEntity = useCallback((key, updater) => {
    setData(prev => ({
      ...prev,
      [key]: typeof updater === 'function' ? updater(prev[key]) : updater,
    }));
  }, []);

  // Special setter for `config` (it's an object, not a list)
  const setConfig = useCallback((updater) => {
    setData(prev => ({
      ...prev,
      config: typeof updater === 'function' ? updater(prev.config) : updater,
    }));
  }, []);

  // ── Initial load ─────────────────────────────────────────────────
  useEffect(() => {
    reload();
  }, [reload]);

  // ── Auto-refresh: visibility change + 120s polling (matches pre-Fase-B behavior) ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') reload();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') reload();
    }, 120000);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(interval);
    };
  }, [reload]);

  const value = {
    // entities (spread so App.jsx puede consumir `users`, `ots`, etc. directo)
    ...data,
    // status
    loading,
    syncing,
    lastSync,
    initialLoadDone: initialLoadDone.current,
    // mutators
    reload,
    setEntity,
    setConfig,
  };

  return <DataCtx.Provider value={value}>{children}</DataCtx.Provider>;
}

export function useData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error('useData must be used inside DataProvider');
  return ctx;
}
