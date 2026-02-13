// ─── DESIGN SYSTEM ───
export const C = {
  bg: "#0B0F1A", s1: "#111827", s2: "#1A2236", s3: "#232D45",
  brd: "#2A3550", acc: "#3B82F6", grn: "#10B981",
  amb: "#F59E0B", red: "#EF4444", pur: "#8B5CF6",
  cyn: "#06B6D4", pnk: "#EC4899",
  t1: "#F1F5F9", t2: "#94A3B8", t3: "#64748B",
};

// ─── PIPELINE STAGES ───
export const STAGES = [
  { id: "lead", l: "Lead", ico: "🎯", c: C.t3 },
  { id: "contactado", l: "Contactado", ico: "📞", c: C.acc },
  { id: "cotizado", l: "Cotizado", ico: "📋", c: C.amb },
  { id: "negociacion", l: "Negociación", ico: "🤝", c: C.pur },
  { id: "ganado", l: "Ganado", ico: "✅", c: C.grn },
  { id: "perdido", l: "Perdido", ico: "❌", c: C.red },
];

// ─── MACHINE TEMP ZONES ───
export const TEMP_ZONES = [
  { group: "Cañón", zones: ["Cañón 1","Cañón 2","Cañón 3","Cañón 4","Cañón 5","Cañón 6","Cañón 7"] },
  { group: "Mallas / Adapter", zones: ["Mallas","Adapter"] },
  { group: "Pipe", zones: ["Pipe 1","Pipe 2","Pipe 3","Pipe 4","Pipe 5"] },
  { group: "Comb", zones: ["Comb 1","Comb 2"] },
  { group: "Dado", zones: ["Dado 1","Dado 2","Dado 3","Dado 4","Dado 5","Dado 6","Dado 7","Dado 8","Dado 9"] },
];

export const defaultTemps = () => {
  const t = {};
  TEMP_ZONES.forEach(g => g.zones.forEach(z => { t[z] = ""; }));
  return t;
};

// ─── DEFAULT MATERIALS CATALOG ───
export const DEFAULT_RESINAS = [
  { id: "r1", nombre: "PEBD SM Resinas", tipo: "PEBD", precio: 32, gramaje: 15 },
  { id: "r2", nombre: "PEAD Consorcio DQ", tipo: "PEAD", precio: 35, gramaje: 15 },
  { id: "r3", nombre: "Supreme Promaplast", tipo: "Supreme", precio: 42, gramaje: 12 },
  { id: "r4", nombre: "Ionómero (Surlyn/EAA)", tipo: "Ionómero", precio: 85, gramaje: 15 },
];

export const DEFAULT_PAPELES = [
  { id: "p1", nombre: "Bond Arpapel 60g", tipo: "Bond", precio: 18, gramaje: 60 },
  { id: "p2", nombre: "Bond Arpapel 75g", tipo: "Bond", precio: 20, gramaje: 75 },
  { id: "p3", nombre: "Bond Arpapel 80g", tipo: "Bond", precio: 22, gramaje: 80 },
  { id: "p4", nombre: "Couché 90g", tipo: "Couché", precio: 28, gramaje: 90 },
  { id: "p5", nombre: "Kraft 80g", tipo: "Kraft", precio: 16, gramaje: 80 },
];
