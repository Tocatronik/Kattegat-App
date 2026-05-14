import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Requiere las siguientes variables de entorno (definidas en `.env.local`
 * para dev y en Vercel para producción). Ver `.env.example` en la raíz:
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * Si falta cualquiera, lanzamos un error claro al cargar el módulo — preferible
 * a fallar silenciosamente con un cliente apuntando a credenciales hardcoded.
 */
const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase no configurado: faltan VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Copia .env.example a .env.local y rellena las variables (o configúralas en Vercel).'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
