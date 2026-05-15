import { useCallback, useMemo } from 'react';
import { supabase } from '../supabase.js';
import { useToast } from '../components/Toast.jsx';
import { useData } from '../context/DataContext.jsx';

/**
 * useSupabaseCRUD — hook reutilizable para operaciones CRUD básicas contra
 * Supabase con actualización optimista del DataContext.
 *
 * Uso típico:
 *   const crud = useSupabaseCRUD('proveedores', 'proveedores', {
 *     successMsg: { insert: 'Proveedor agregado', remove: 'Proveedor eliminado' },
 *   });
 *   await crud.insert({ nombre: 'X', ... });
 *   await crud.update(id, { telefono: '...' });
 *   await crud.remove(id);
 *
 * @param {string} tableName      Nombre de la tabla en Supabase
 * @param {string} [contextKey]   Clave dentro de DataContext para optimismo (ej: 'proveedores').
 *                                Si no se pasa, sólo hace el round-trip a Supabase y NO toca el state.
 * @param {object} [opts]
 * @param {object} [opts.successMsg]  Mensajes default por operación: { insert, update, remove }
 *
 * Nota: este hook NO reemplaza todo el CRUD ad-hoc en App.jsx; existe para módulos
 * nuevos y para migraciones incrementales.
 */
export function useSupabaseCRUD(tableName, contextKey, opts = {}) {
  const toast = useToast();
  const { setEntity, reload } = useData();
  const successMsg = useMemo(() => opts.successMsg || {}, [opts.successMsg]);

  const insert = useCallback(async (payload, msg) => {
    const { data, error } = await supabase
      .from(tableName)
      .insert(payload)
      .select()
      .single();
    if (error) {
      console.error(`[useSupabaseCRUD/${tableName}] insert error:`, error);
      toast.error(`No se pudo crear: ${error.message}`);
      return null;
    }
    if (contextKey) {
      setEntity(contextKey, prev => [data, ...(prev || [])]);
    }
    toast.success(msg || successMsg.insert || 'Creado');
    return data;
  }, [tableName, contextKey, setEntity, toast, successMsg]);

  const update = useCallback(async (id, patch, msg) => {
    const { data, error } = await supabase
      .from(tableName)
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      console.error(`[useSupabaseCRUD/${tableName}] update error:`, error);
      toast.error(`No se pudo actualizar: ${error.message}`);
      return null;
    }
    if (contextKey) {
      setEntity(contextKey, prev =>
        (prev || []).map(r => (r.id === id ? { ...r, ...data } : r))
      );
    }
    toast.success(msg || successMsg.update || 'Actualizado');
    return data;
  }, [tableName, contextKey, setEntity, toast, successMsg]);

  const remove = useCallback(async (id, msg) => {
    const { error } = await supabase.from(tableName).delete().eq('id', id);
    if (error) {
      console.error(`[useSupabaseCRUD/${tableName}] delete error:`, error);
      toast.error(`No se pudo eliminar: ${error.message}`);
      return false;
    }
    if (contextKey) {
      setEntity(contextKey, prev => (prev || []).filter(r => r.id !== id));
    }
    toast.success(msg || successMsg.remove || 'Eliminado');
    return true;
  }, [tableName, contextKey, setEntity, toast, successMsg]);

  return { insert, update, remove, reload };
}
