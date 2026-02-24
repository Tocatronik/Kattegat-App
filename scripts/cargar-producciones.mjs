// Script para cargar producciones históricas 2022-2025
// Ejecutar: node scripts/cargar-producciones.mjs

const SUPA_URL = "https://exfxohmvyekfoqlczqzm.supabase.co";
const SUPA_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV4ZnhvaG12eWVrZm9xbGN6cXptIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAzMDYyNjEsImV4cCI6MjA4NTg4MjI2MX0._uKN0AOViaV16XWNIOI5nETLktJHAOMwqD2kRLIL1KI";

async function supa(table, method, body, query = "") {
  const url = `${SUPA_URL}/rest/v1/${table}${query}`;
  const headers = {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    "Content-Type": "application/json",
    Prefer: method === "POST" ? "return=representation" : "return=minimal"
  };
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(url, opts);
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`${method} ${table}: ${r.status} ${t}`);
  }
  if (method === "POST") return r.json();
  return null;
}

const producciones = 
[
  {
    "producto": "LAMINACIÓN de 118 CM 90/15 gms",
    "tipo": "laminacion",
    "fecha": "2022-03-17",
    "year": "2022",
    "ancho_cm": 118.0,
    "gram_papel": 90.0,
    "gram_resina": 15.0,
    "num_rollos": 24,
    "total_metros": 14220.0,
    "row": 425
  },
  {
    "producto": "láminacion de bon BCO 101.0 CM 90 / 10",
    "tipo": "laminacion",
    "fecha": "2022-03-23",
    "year": "2022",
    "ancho_cm": 101.0,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 24,
    "total_metros": 23100.0,
    "row": 505
  },
  {
    "producto": "producción de tejido 105 CM 90/17gms",
    "tipo": "tela",
    "fecha": "2022-06-07",
    "year": "2022",
    "ancho_cm": 105.0,
    "gram_papel": 90.0,
    "gram_resina": 17.0,
    "num_rollos": 4,
    "total_metros": 257060.0,
    "row": 607
  },
  {
    "producto": "producción de tejido 104 CM 85/17 gms",
    "tipo": "tela",
    "fecha": "2022-06-22",
    "year": "2022",
    "ancho_cm": 104.0,
    "gram_papel": 85.0,
    "gram_resina": 17.0,
    "num_rollos": 0,
    "total_metros": 93340.0,
    "row": 638
  },
  {
    "producto": "producción de tejido 104 CM 85/17 gms",
    "tipo": "tela",
    "fecha": "2022-06-22",
    "year": "2022",
    "ancho_cm": 104.0,
    "gram_papel": 85.0,
    "gram_resina": 17.0,
    "num_rollos": 11,
    "total_metros": 93250.0,
    "row": 671
  },
  {
    "producto": "producción de tejido 104 CM 85/17 gms",
    "tipo": "tela",
    "fecha": "2022-06-22",
    "year": "2022",
    "ancho_cm": 104.0,
    "gram_papel": 85.0,
    "gram_resina": 17.0,
    "num_rollos": 14,
    "total_metros": 42690.0,
    "row": 687
  },
  {
    "producto": "LAMINACIÓN BON BCO 90/10 GMS",
    "tipo": "laminacion",
    "fecha": "2022-10-03",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 27,
    "total_metros": 120300.0,
    "row": 153
  },
  {
    "producto": "BON BCO. 35 GMS 61 CM",
    "tipo": "laminacion",
    "fecha": "2022-10-03",
    "year": "2022",
    "ancho_cm": 61.0,
    "gram_papel": null,
    "gram_resina": null,
    "num_rollos": 18,
    "total_metros": 106860.0,
    "row": 744
  },
  {
    "producto": "BON BCO. de 87.0 CM. 70 / 10 gms",
    "tipo": "laminacion",
    "fecha": "2022-11-01",
    "year": "2022",
    "ancho_cm": 87.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 21,
    "total_metros": 115624.0,
    "row": 897
  },
  {
    "producto": "rollo papel Golden 102.0 CM 90 /10",
    "tipo": "laminacion",
    "fecha": "2022-11-01",
    "year": "2022",
    "ancho_cm": 102.0,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 21,
    "total_metros": 7850.0,
    "row": 906
  },
  {
    "producto": "producción de tejido 104 CM 60/20 gms",
    "tipo": "tela",
    "fecha": "2022-11-01",
    "year": "2022",
    "ancho_cm": 104.0,
    "gram_papel": 60.0,
    "gram_resina": 20.0,
    "num_rollos": 24,
    "total_metros": 4880.0,
    "row": 917
  },
  {
    "producto": "BON BCO. de 95.0 CM 35 / 10 gms",
    "tipo": "laminacion",
    "fecha": "2022-11-01",
    "year": "2022",
    "ancho_cm": 95.0,
    "gram_papel": 35.0,
    "gram_resina": 10.0,
    "num_rollos": 23,
    "total_metros": 38450.0,
    "row": 931
  },
  {
    "producto": "papel Golden de 96.0 CM 90 / 10",
    "tipo": "laminacion",
    "fecha": "2022-11-01",
    "year": "2022",
    "ancho_cm": 96.0,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 22,
    "total_metros": 26850.0,
    "row": 952
  },
  {
    "producto": "pruebas de papel Golden 77 / 10 86.0cm.",
    "tipo": "laminacion",
    "fecha": "2022-11-18",
    "year": "2022",
    "ancho_cm": 86.0,
    "gram_papel": 77.0,
    "gram_resina": 10.0,
    "num_rollos": 32,
    "total_metros": 50430.0,
    "row": 306
  },
  {
    "producto": "pruebas de papel kraft. 1.40 CM.",
    "tipo": "laminacion",
    "fecha": "2022-11-18",
    "year": "2022",
    "ancho_cm": 1.4,
    "gram_papel": null,
    "gram_resina": null,
    "num_rollos": 35,
    "total_metros": 6200.0,
    "row": 318
  },
  {
    "producto": "producción de 32.5 /10 GMS",
    "tipo": "laminacion",
    "fecha": "2022-11-18",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 32.5,
    "gram_resina": 10.0,
    "num_rollos": 37,
    "total_metros": 39777.0,
    "row": 334
  },
  {
    "producto": "LAMINACION BON BCO de 90 / 15 GMS",
    "tipo": "laminacion",
    "fecha": "2022-11-30",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 90.0,
    "gram_resina": 15.0,
    "num_rollos": 23,
    "total_metros": 63270.0,
    "row": 224
  },
  {
    "producto": "LAMINACION BON BCO de 90 / 15 GMS",
    "tipo": "laminacion",
    "fecha": "2022-11-30",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 90.0,
    "gram_resina": 15.0,
    "num_rollos": 25,
    "total_metros": 84430.0,
    "row": 1029
  },
  {
    "producto": "papel bon bco de 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2023-03-14",
    "year": "2023",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 7,
    "total_metros": 61480.0,
    "row": 41
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 33/15 GMS",
    "tipo": "laminacion",
    "fecha": "2023-03-14",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 12,
    "total_metros": 107700.0,
    "row": 42
  },
  {
    "producto": "papel Kraft de 90 CM 140/14 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-15",
    "year": "2023",
    "ancho_cm": 90.0,
    "gram_papel": 140.0,
    "gram_resina": 14.0,
    "num_rollos": 10,
    "total_metros": 18250.0,
    "row": 56
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-22",
    "year": "2023",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 19,
    "total_metros": 56250.0,
    "row": 66
  },
  {
    "producto": "papel Golden de 103 CMS de 75/11 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-22",
    "year": "2023",
    "ancho_cm": 103.0,
    "gram_papel": 75.0,
    "gram_resina": 11.0,
    "num_rollos": 16,
    "total_metros": 66180.0,
    "row": 78
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 33/15 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-28",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 26,
    "total_metros": 122000.0,
    "row": 92
  },
  {
    "producto": "papel Golden de 135 CMS 75/11 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-28",
    "year": "2023",
    "ancho_cm": 135.0,
    "gram_papel": 75.0,
    "gram_resina": 11.0,
    "num_rollos": 23,
    "total_metros": 74770.0,
    "row": 104
  },
  {
    "producto": "cartulina multicapa 91.0cm 252/14 gms",
    "tipo": "laminacion",
    "fecha": "2023-03-28",
    "year": "2023",
    "ancho_cm": 91.0,
    "gram_papel": 252.0,
    "gram_resina": 14.0,
    "num_rollos": 19,
    "total_metros": 8800.0,
    "row": 118
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 33/15 gms",
    "tipo": "laminacion",
    "fecha": "2023-04-20",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 27,
    "total_metros": 18100.0,
    "row": 124
  },
  {
    "producto": "papel Kraft de 90.0 CM de 137/ 14 gms",
    "tipo": "laminacion",
    "fecha": "2023-04-20",
    "year": "2023",
    "ancho_cm": 90.0,
    "gram_papel": 137.0,
    "gram_resina": 14.0,
    "num_rollos": 20,
    "total_metros": 23190.0,
    "row": 133
  },
  {
    "producto": "PAPEL KRAFT DE 90 CM 137/ 14 gms",
    "tipo": "laminacion",
    "fecha": "2023-05-30",
    "year": "2023",
    "ancho_cm": 90.0,
    "gram_papel": 137.0,
    "gram_resina": 14.0,
    "num_rollos": 44,
    "total_metros": 127500.0,
    "row": 161
  },
  {
    "producto": "papel Kraft de 90.0 CM 137/14 gms",
    "tipo": "laminacion",
    "fecha": "2023-05-30",
    "year": "2023",
    "ancho_cm": 90.0,
    "gram_papel": 137.0,
    "gram_resina": 14.0,
    "num_rollos": 26,
    "total_metros": 89910.0,
    "row": 168
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2023-08-30",
    "year": "2023",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 48,
    "total_metros": 69150.0,
    "row": 189
  },
  {
    "producto": "papel bon bco. de 114 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2023-08-30",
    "year": "2023",
    "ancho_cm": 114.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 32,
    "total_metros": 118450.0,
    "row": 203
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2023-11-29",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 50,
    "total_metros": 352100.0,
    "row": 225
  },
  {
    "producto": "papel bon bco de 95 CM 32.5/ 15 gms",
    "tipo": "laminacion",
    "fecha": "2023-11-29",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 27,
    "total_metros": 251780.0,
    "row": 251
  },
  {
    "producto": "ROLLO DE TELA DE 96 CM 60/20 gms",
    "tipo": "tela",
    "fecha": "2023-12-12",
    "year": "2023",
    "ancho_cm": 96.0,
    "gram_papel": 60.0,
    "gram_resina": 20.0,
    "num_rollos": 54,
    "total_metros": 14900.0,
    "row": 260
  },
  {
    "producto": "papel bon bco de 110 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2023-12-12",
    "year": "2023",
    "ancho_cm": 110.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 23,
    "total_metros": 83650.0,
    "row": 282
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2023-12-21",
    "year": "2023",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 49,
    "total_metros": 80350.0,
    "row": 292
  },
  {
    "producto": "PAPEL BON BCO de 95cm 33/15 gms",
    "tipo": "laminacion",
    "fecha": "2023-12-21",
    "year": "2023",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 22,
    "total_metros": 43800.0,
    "row": 300
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 33/15 gms",
    "tipo": "laminacion",
    "fecha": "2024-01-06",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 3,
    "total_metros": 44800.0,
    "row": 17
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-01-06",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 5,
    "total_metros": 65200.0,
    "row": 19
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-02-12",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 19,
    "total_metros": 42750.0,
    "row": 59
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-03-05",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 30,
    "total_metros": 66750.0,
    "row": 86
  },
  {
    "producto": "ROLLO DE TELA DE 104 CM 80/20 gms",
    "tipo": "tela",
    "fecha": "2024-05-14",
    "year": "2024",
    "ancho_cm": 104.0,
    "gram_papel": 80.0,
    "gram_resina": 20.0,
    "num_rollos": 46,
    "total_metros": 19930.0,
    "row": 104
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-05-14",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 26,
    "total_metros": 46050.0,
    "row": 111
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-06-04",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 46,
    "total_metros": 34200.0,
    "row": 121
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-06-11",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 51,
    "total_metros": 90700.0,
    "row": 145
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-07-29",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 30,
    "total_metros": 3400.0,
    "row": 238
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70 /10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-07-29",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 50,
    "total_metros": 103900.0,
    "row": 247
  },
  {
    "producto": "PAPEL BON SOBRES 1.00 CM 90/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-09-17",
    "year": "2024",
    "ancho_cm": 1.0,
    "gram_papel": 90.0,
    "gram_resina": 15.0,
    "num_rollos": 38,
    "total_metros": 89100.0,
    "row": 277
  },
  {
    "producto": "LAMINACIÓN BON BCO. DE 95.0CM 33/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-10-22",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 35,
    "total_metros": 90200.0,
    "row": 300
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-10-22",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 41,
    "total_metros": 49550.0,
    "row": 314
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 gms",
    "tipo": "laminacion",
    "fecha": "2024-10-22",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 35,
    "total_metros": 38500.0,
    "row": 326
  },
  {
    "producto": "LAMINACION BON BCO. DE 95.0CM 33/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-11-11",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 33,
    "total_metros": 80100.0,
    "row": 333
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-11-11",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 26,
    "total_metros": 34200.0,
    "row": 343
  },
  {
    "producto": "LAMINACION BON BCO. DE 115.0CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-11-19",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 26,
    "total_metros": 63150.0,
    "row": 359
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2024-11-19",
    "year": "2024",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 20,
    "total_metros": 68400.0,
    "row": 370
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-11-20",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 19,
    "total_metros": 24900.0,
    "row": 383
  },
  {
    "producto": "LAMINACION BON BCO DE 95.0cm 33/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-12-12",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 23,
    "total_metros": 62900.0,
    "row": 390
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-12-12",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 18,
    "total_metros": 28800.0,
    "row": 395
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-12-17",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 18,
    "total_metros": 23800.0,
    "row": 408
  },
  {
    "producto": "LAMINACION BON BCO DE 95.0cm 33/15 GMS",
    "tipo": "laminacion",
    "fecha": "2024-12-17",
    "year": "2024",
    "ancho_cm": 95.0,
    "gram_papel": 33.0,
    "gram_resina": 15.0,
    "num_rollos": 23,
    "total_metros": 43200.0,
    "row": 409
  },
  {
    "producto": "BON BCO. DE 115.0CMS 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2025-01-20",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 13,
    "total_metros": 78900.0,
    "row": 26
  },
  {
    "producto": "PAPEL BON BCO DE 86 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2025-01-20",
    "year": "2025",
    "ancho_cm": 86.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 12,
    "total_metros": 74300.0,
    "row": 37
  },
  {
    "producto": "PAPEL BON BCO DE 95 CM 32.5/15 GMS",
    "tipo": "laminacion",
    "fecha": "2025-05-06",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 15.0,
    "num_rollos": 49,
    "total_metros": 74000.0,
    "row": 163
  },
  {
    "producto": "PAPEL LWC UPM 1.00 CM 60/15 GMS",
    "tipo": "laminacion",
    "fecha": "2025-05-26",
    "year": "2025",
    "ancho_cm": 1.0,
    "gram_papel": 60.0,
    "gram_resina": 15.0,
    "num_rollos": 30,
    "total_metros": 61300.0,
    "row": 182
  },
  {
    "producto": "PAPEL BON BCO DE 115 CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2025-05-28",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 34,
    "total_metros": 5000.0,
    "row": 209
  },
  {
    "producto": "LAMINACION PAPEL KRAFT 90.0CM 130/18GMS",
    "tipo": "laminacion",
    "fecha": "2025-06-03",
    "year": "2025",
    "ancho_cm": 90.0,
    "gram_papel": 130.0,
    "gram_resina": 18.0,
    "num_rollos": 29,
    "total_metros": 5700.0,
    "row": 250
  },
  {
    "producto": "LAMINACION DE LWC UPM 100CM 60/15GMS",
    "tipo": "laminacion",
    "fecha": "2025-08-12",
    "year": "2025",
    "ancho_cm": 100.0,
    "gram_papel": 60.0,
    "gram_resina": 15.0,
    "num_rollos": 32,
    "total_metros": 33600.0,
    "row": 314
  },
  {
    "producto": "LAMINACION PAPEL KRAFT DE 90.0CM 130/18 GMS",
    "tipo": "laminacion",
    "fecha": "2025-08-21",
    "year": "2025",
    "ancho_cm": 90.0,
    "gram_papel": 130.0,
    "gram_resina": 18.0,
    "num_rollos": 24,
    "total_metros": 12200.0,
    "row": 370
  },
  {
    "producto": "LAMINACION BON BCO. 115.0CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2025-09-08",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 22,
    "total_metros": 75200.0,
    "row": 441
  },
  {
    "producto": "ROLLO DE TELA 102 CM 80/17 GMS",
    "tipo": "tela",
    "fecha": "2025-09-10",
    "year": "2025",
    "ancho_cm": 102.0,
    "gram_papel": 80.0,
    "gram_resina": 17.0,
    "num_rollos": 29,
    "total_metros": 8450.0,
    "row": 454
  },
  {
    "producto": "LAMINACION PAPEL KRAFT 90 CM 130/18GMS",
    "tipo": "laminacion",
    "fecha": "2025-09-10",
    "year": "2025",
    "ancho_cm": 90.0,
    "gram_papel": 130.0,
    "gram_resina": 18.0,
    "num_rollos": 26,
    "total_metros": 12700.0,
    "row": 466
  },
  {
    "producto": "LAMINACION BON BCO. DE 115.0CM 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2025-10-01",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 29,
    "total_metros": 81700.0,
    "row": 496
  },
  {
    "producto": "LAMINACION DE BON BCO. 95.0CM 32.5/17GMS",
    "tipo": "laminacion",
    "fecha": "2025-10-07",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 17.0,
    "num_rollos": 26,
    "total_metros": 10000.0,
    "row": 508
  },
  {
    "producto": "PAPEL KRAFT 90.0CM 130/ 18 GMS",
    "tipo": "laminacion",
    "fecha": "2025-10-07",
    "year": "2025",
    "ancho_cm": 90.0,
    "gram_papel": 130.0,
    "gram_resina": 18.0,
    "num_rollos": 23,
    "total_metros": 47510.0,
    "row": 531
  },
  {
    "producto": "PAPEL BON BCO. 95.0CM 32.5/17GMS",
    "tipo": "laminacion",
    "fecha": "2025-10-13",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 17.0,
    "num_rollos": 25,
    "total_metros": 89700.0,
    "row": 547
  },
  {
    "producto": "LAMINACION DE BON BCO. 95.0CM 32.5/17GMS",
    "tipo": "laminacion",
    "fecha": "2025-10-22",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 17.0,
    "num_rollos": 25,
    "total_metros": 174100.0,
    "row": 565
  },
  {
    "producto": "LAMINACION DE BON BCO. 95.0CM 32.5/17GMS",
    "tipo": "laminacion",
    "fecha": "2025-11-03",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 17.0,
    "num_rollos": 29,
    "total_metros": 89000.0,
    "row": 581
  },
  {
    "producto": "LAMINACION BON BCO. DE 87.0cm 70/10 GMS",
    "tipo": "laminacion",
    "fecha": "2025-11-05",
    "year": "2025",
    "ancho_cm": 87.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 29,
    "total_metros": 8100.0,
    "row": 590
  },
  {
    "producto": "LAMINACION BON BCO.DE 115 CM. 70/10GMS",
    "tipo": "laminacion",
    "fecha": "2025-11-06",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 24,
    "total_metros": 50000.0,
    "row": 612
  },
  {
    "producto": "LAMINACION DE BON BCO. 95.0CM 32.5/17GMS",
    "tipo": "laminacion",
    "fecha": "2025-11-18",
    "year": "2025",
    "ancho_cm": 95.0,
    "gram_papel": 32.5,
    "gram_resina": 17.0,
    "num_rollos": 25,
    "total_metros": 152650.0,
    "row": 629
  },
  {
    "producto": "LAMINACION BON BCO.DE 115 CM. 70/10GMS",
    "tipo": "laminacion",
    "fecha": "2025-11-26",
    "year": "2025",
    "ancho_cm": 115.0,
    "gram_papel": 70.0,
    "gram_resina": 10.0,
    "num_rollos": 22,
    "total_metros": 66000.0,
    "row": 655
  },
  {
    "producto": "LAMINACION DE KRAFT DE 90.0CMS 130/18 GMS",
    "tipo": "laminacion",
    "fecha": "2025-12-02",
    "year": "2025",
    "ancho_cm": 90.0,
    "gram_papel": 130.0,
    "gram_resina": 18.0,
    "num_rollos": 26,
    "total_metros": 42910.0,
    "row": 678
  },
  {
    "producto": "bon bco de 90/10",
    "tipo": "laminacion",
    "fecha": "2022-02-01",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 18,
    "total_metros": 15800.0,
    "row": 52
  },
  {
    "producto": "BON BCO. de 95.0 CM. 90 / 15 gms",
    "tipo": "laminacion",
    "fecha": "2022-09-01",
    "year": "2022",
    "ancho_cm": 95.0,
    "gram_papel": 90.0,
    "gram_resina": 15.0,
    "num_rollos": 35,
    "total_metros": 127930.0,
    "row": 375
  },
  {
    "producto": "producción de tela 105 CM 90/17 gms",
    "tipo": "tela",
    "fecha": "2022-05-01",
    "year": "2022",
    "ancho_cm": 105.0,
    "gram_papel": 90.0,
    "gram_resina": 17.0,
    "num_rollos": 29,
    "total_metros": 10350.0,
    "row": 517
  },
  {
    "producto": "producción de tela 105 CM 90/17",
    "tipo": "tela",
    "fecha": "2022-05-01",
    "year": "2022",
    "ancho_cm": 105.0,
    "gram_papel": 90.0,
    "gram_resina": 17.0,
    "num_rollos": 19,
    "total_metros": 73490.0,
    "row": 544
  },
  {
    "producto": "láminacion de Golden 90 / 10 gms",
    "tipo": "laminacion",
    "fecha": "2022-08-01",
    "year": "2022",
    "ancho_cm": null,
    "gram_papel": 90.0,
    "gram_resina": 10.0,
    "num_rollos": 18,
    "total_metros": 25600.0,
    "row": 558
  }
];


async function main() {
  console.log(`\n🏭 Cargando ${producciones.length} producciones históricas...\n`);
  
  // Clean up previous partial imports (H-xxx OTs and BH-xxx bobinas)
  console.log("🧹 Limpiando importaciones previas...");
  try {
    await fetch(`${SUPA_URL}/rest/v1/bobinas_pt?codigo=like.BH-*`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: "return=minimal" }
    });
    await fetch(`${SUPA_URL}/rest/v1/ordenes_trabajo?codigo=like.H-*`, {
      method: "DELETE",
      headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, Prefer: "return=minimal" }
    });
    console.log("  ✅ Limpieza completada\n");
  } catch (e) { console.log("  ⚠️ Limpieza parcial:", e.message); }
  let otNum = 0;
  
  let totalMetros = 0;
  let totalOTs = 0;
  let errors = [];
  
  for (const p of producciones) {
    otNum++;
    const codigo = `H-${String(otNum).padStart(3, "0")}`;
    
    // Determine tipo
    const esTela = p.tipo === "tela";
    const esRembob = p.tipo === "rembobinado";
    const tipo = esTela ? "tela" : esRembob ? "rembobinado" : "laminacion";
    
    // Normalize product name
    let productoNorm = p.producto.trim()
      .replace(/\s+/g, " ")
      .toUpperCase();
    
    try {
      // Create OT
      const otData = {
        codigo,
        cliente_nombre: "Producción histórica",
        tipo: "maquila",
        producto: productoNorm,
        status: "completada",
        fecha_creacion: p.fecha || `${p.year}-01-01`,
        fecha_fin: p.fecha || `${p.year}-01-01`,
        metros_producidos: p.total_metros,
        bobinas_producidas: p.num_rollos || 1,
        dias_credito: 0
      };
      
      const result = await supa("ordenes_trabajo", "POST", otData);
      const otId = result[0]?.id;
      
      // Create a single summary bobina for the production run
      if (otId) {
        const bobCodigo = `BH-${String(otNum).padStart(3, "0")}-001`;
        const ancho_mm = p.ancho_cm ? Math.round(p.ancho_cm * 10) : 950;
        const gramaje = (p.gram_papel || 0) + (p.gram_resina || 0);
        
        // Estimate weight: metros * ancho(m) * gramaje(g/m2) / 1000
        const anchoM = (ancho_mm / 1000);
        const pesoEstimado = gramaje > 0 ? Math.round(p.total_metros * anchoM * gramaje / 1000) : 0;
        
        await supa("bobinas_pt", "POST", {
          codigo: bobCodigo,
          lote: `HIST-${p.year}-${String(otNum).padStart(3, "0")}`,
          ot_id: otId,
          ot_codigo: codigo,
          ancho_mm,
          metros_lineales: p.total_metros,
          peso_kg: pesoEstimado,
          gramaje_total: Math.round(gramaje) || 80,
          status: "terminada",
          fecha_produccion: p.fecha || `${p.year}-01-01`,
          trazabilidad: JSON.stringify({
            fuente: "Excel Gerardo",
            rollos_originales: p.num_rollos,
            tipo: tipo,
            producto: p.producto
          })
        });
      }
      
      totalMetros += p.total_metros;
      totalOTs++;
      const metrosK = (p.total_metros / 1000).toFixed(1);
      console.log(`  ✅ ${codigo} | ${p.fecha || "s/f"} | ${metrosK}k mts | ${productoNorm.substring(0, 45)}`);
      
    } catch (err) {
      console.error(`  ❌ ${codigo}: ${err.message}`);
      errors.push({ codigo, error: err.message });
    }
  }
  
  console.log(`\n${"=".repeat(60)}`);
  console.log(`✅ ${totalOTs} OTs creadas | ${(totalMetros/1000000).toFixed(2)}M metros totales`);
  if (errors.length) console.log(`❌ ${errors.length} errores`);
  console.log();
}

main().catch(console.error);
