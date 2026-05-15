// Formatters puros — sin dependencias de estado. Mover aquí todo lo que solo
// transforma números/fechas/strings para mostrar.
//
// IMPORTANTE: estos nombres están en uso por todos los módulos (CRM, Cotizador,
// Inventario, etc.) — NO renombrar. `src/utils/helpers.js` re-exporta desde
// aquí para no romper imports existentes.

/** Formatea número con `d` decimales en estilo es-MX. */
export const fmt = (n, d = 2) =>
  n != null && !isNaN(n)
    ? Number(n).toLocaleString('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d })
    : '0.00';

/** Formatea número entero (sin decimales) en estilo es-MX. */
export const fmtI = (n) =>
  n != null && !isNaN(n)
    ? Number(n).toLocaleString('es-MX', { maximumFractionDigits: 0 })
    : '0';

/** Devuelve fecha de hoy en formato ISO `YYYY-MM-DD`. */
export const today = () => new Date().toISOString().split('T')[0];

/** Días entre dos fechas (d1 - d2), redondeado hacia arriba. */
export const daysDiff = (d1, d2) =>
  Math.ceil((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24));
