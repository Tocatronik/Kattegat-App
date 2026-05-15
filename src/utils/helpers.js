// Re-exports — los formatters viven ahora en src/lib/format.js.
// Este archivo se mantiene para no romper imports existentes en módulos.
export { fmt, fmtI, today, daysDiff } from '../lib/format.js';

// genId no es un formatter — se queda aquí.
export const genId = () => Math.random().toString(36).substring(2, 10);
