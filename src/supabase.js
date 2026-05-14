import { createClient } from '@supabase/supabase-js';

/**
 * Supabase client.
 *
 * Preferimos leer credenciales desde variables de entorno (Vite las inyecta en
 * build). En su ausencia, caemos en valores de producción públicos como
 * fallback — la anon key es safe-by-design para incluirse en el bundle, pero
 * lo correcto es definirlas explícitamente para poder rotarlas sin redeploy.
 *
 * Variables esperadas (ver `.env.example`):
 *   - VITE_SUPABASE_URL
 *   - VITE_SUPABASE_ANON_KEY
 *
 * Setup Vercel: Settings → Environment Variables → agrega ambas.
 */
const FALLBACK_URL = 'https://exfxohmvyekfoqlczqzm.supabase.co';
const FALLBACK_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI';

const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || FALLBACK_URL;
const supabaseKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || FALLBACK_KEY;

if (!import.meta.env?.VITE_SUPABASE_URL || !import.meta.env?.VITE_SUPABASE_ANON_KEY) {
  // eslint-disable-next-line no-console
  console.warn(
    '[supabase] Usando credenciales fallback. Para mejor higiene, define ' +
    'VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en Vercel Settings → Env Variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
