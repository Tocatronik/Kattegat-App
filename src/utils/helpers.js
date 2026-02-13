export const genId = () => Math.random().toString(36).substring(2, 10);
export const fmt = (n, d = 2) => n != null && !isNaN(n) ? Number(n).toLocaleString("es-MX", { minimumFractionDigits: d, maximumFractionDigits: d }) : "0.00";
export const fmtI = (n) => n != null && !isNaN(n) ? Number(n).toLocaleString("es-MX", { maximumFractionDigits: 0 }) : "0";
export const today = () => new Date().toISOString().split("T")[0];
export const daysDiff = (d1, d2) => Math.ceil((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24));
