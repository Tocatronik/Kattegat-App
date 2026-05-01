-- ═══════════════════════════════════════════════════════════════════
-- 001 — Bot de operador (Telegram → Supabase → PWA)
-- Tablas para captura de producción en planta por Gerardo + insights AI
-- ═══════════════════════════════════════════════════════════════════
--
-- Cómo aplicar: Supabase Dashboard → SQL Editor → pegar este archivo → Run
--

-- ─── 1. Whitelist de usuarios autorizados de Telegram ───
CREATE TABLE IF NOT EXISTS bot_usuarios (
  telegram_user_id BIGINT PRIMARY KEY,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'operador')),
  activo BOOLEAN DEFAULT true,
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE bot_usuarios IS 'Whitelist de usuarios de Telegram autorizados para usar comandos del bot. admin=acceso total, operador=solo flujo de producción.';

-- ─── 2. Configuración de máquinas con sus zonas de temperaturas ───
CREATE TABLE IF NOT EXISTS maquinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  zonas_temps JSONB NOT NULL DEFAULT '[]',
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

COMMENT ON COLUMN maquinas.zonas_temps IS 'Array de grupos: [{"grupo":"Cañón","zonas":["Z1","Z2"...]},...]. El bot pinta el formulario dinámicamente con esta config.';

-- Insertar Pintadora 1 con layout default (~18 zonas: 6 cañón, 1 malla, 2 pipe, 9 dado)
INSERT INTO maquinas (codigo, nombre, zonas_temps) VALUES (
  'PINTA-1',
  'Pintadora 1',
  '[
    {"grupo":"Cañón","zonas":["Z1","Z2","Z3","Z4","Z5","Z6"]},
    {"grupo":"Malla","zonas":["M1"]},
    {"grupo":"Pipe","zonas":["P1","P2"]},
    {"grupo":"Dado","zonas":["D1","D2","D3","D4","D5","D6","D7","D8","D9"]}
  ]'::jsonb
) ON CONFLICT (codigo) DO NOTHING;

-- ─── 3. Turnos (jornadas de trabajo) ───
CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  maquina_id UUID REFERENCES maquinas(id),
  operador_telegram_id BIGINT,
  operador_nombre TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  hora_prendida TIMESTAMPTZ,
  hora_arranque TIMESTAMPTZ,
  hora_apagada TIMESTAMPTZ,
  estado TEXT NOT NULL DEFAULT 'iniciado'
    CHECK (estado IN ('iniciado','calentando','trabajando','pausado','apagado','cerrado')),
  ot_actual_id UUID REFERENCES ordenes_trabajo(id),
  pausa_razon TEXT,
  observaciones TEXT,
  resina_kg_consumida NUMERIC(10,2),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_turnos_estado ON turnos(estado);
CREATE INDEX IF NOT EXISTS idx_turnos_fecha ON turnos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_turnos_operador ON turnos(operador_telegram_id);

COMMENT ON TABLE turnos IS 'Una jornada de trabajo de un operador en una máquina. Estados: iniciado→calentando→trabajando→pausado/apagado→cerrado.';

-- ─── 4. Diario de planta (event log universal) ───
CREATE TABLE IF NOT EXISTS diario_planta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ts TIMESTAMPTZ DEFAULT now(),
  autor_telegram_id BIGINT,
  autor_nombre TEXT,
  tipo TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  turno_id UUID REFERENCES turnos(id),
  ot_id UUID REFERENCES ordenes_trabajo(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diario_ts ON diario_planta(ts DESC);
CREATE INDEX IF NOT EXISTS idx_diario_tipo ON diario_planta(tipo);
CREATE INDEX IF NOT EXISTS idx_diario_turno ON diario_planta(turno_id);

COMMENT ON TABLE diario_planta IS 'Log universal de eventos de planta. Cada comando del bot escribe aquí. Usado por AI para detectar patrones.';
COMMENT ON COLUMN diario_planta.tipo IS 'prende, carga_trabajo, arranca, bobina, temps, pausa, reanuda, apaga, cierra, manto, visita, recepcion, nota';

-- ─── 5. Lecturas de temperatura ───
CREATE TABLE IF NOT EXISTS temperaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID REFERENCES turnos(id),
  maquina_id UUID REFERENCES maquinas(id),
  ts TIMESTAMPTZ DEFAULT now(),
  lecturas JSONB NOT NULL,
  promedio NUMERIC(6,2),
  autor_telegram_id BIGINT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_temps_turno ON temperaturas(turno_id);
CREATE INDEX IF NOT EXISTS idx_temps_ts ON temperaturas(ts DESC);

COMMENT ON COLUMN temperaturas.lecturas IS 'JSONB con la lectura por zona, ej: {"Cañón Z1":285,"Cañón Z2":290,...}';

-- ─── 6. Mantenimientos ───
CREATE TABLE IF NOT EXISTS mantenimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  ts TIMESTAMPTZ DEFAULT now(),
  maquina_id UUID REFERENCES maquinas(id),
  tipo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  duracion_horas NUMERIC(6,2),
  costo NUMERIC(12,2),
  partes_cambiadas JSONB,
  tecnico TEXT,
  autor_telegram_id BIGINT,
  autor_nombre TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manto_fecha ON mantenimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_manto_tipo ON mantenimientos(tipo);

COMMENT ON COLUMN mantenimientos.tipo IS 'carbones, filtros, calibracion, limpieza, visita_tecnico, otro';
COMMENT ON COLUMN mantenimientos.tecnico IS 'interno, victor, proveedor, etc.';

-- ─── 7. Recepciones de materia prima (incoming) ───
CREATE TABLE IF NOT EXISTS recepciones_mp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  ts TIMESTAMPTZ DEFAULT now(),
  tipo TEXT NOT NULL CHECK (tipo IN ('PE','papel','tinta','otro')),
  marca TEXT,
  proveedor TEXT,
  kg NUMERIC(10,2),
  num_tarima TEXT,
  num_bobinas INTEGER,
  costo NUMERIC(12,2),
  factura_num TEXT,
  observaciones TEXT,
  autor_telegram_id BIGINT,
  autor_nombre TEXT,
  resina_id UUID REFERENCES resinas(id),
  papel_id UUID REFERENCES papel_bobinas(id),
  status TEXT DEFAULT 'pendiente' CHECK (status IN ('pendiente','registrado')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rec_fecha ON recepciones_mp(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rec_tipo ON recepciones_mp(tipo);

COMMENT ON TABLE recepciones_mp IS 'Recepción de materia prima. Status pendiente=solo logged en bot, registrado=ya está dado de alta en resinas/papel_bobinas con FK.';

-- ─── 8. Extender ordenes_trabajo con parámetros del trabajo ───
ALTER TABLE ordenes_trabajo
  ADD COLUMN IF NOT EXISTS papel_marca TEXT,
  ADD COLUMN IF NOT EXISTS papel_gramaje NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS pe_espesor_g NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS ancho_mm NUMERIC(6,1),
  ADD COLUMN IF NOT EXISTS temps_objetivo JSONB;

COMMENT ON COLUMN ordenes_trabajo.papel_marca IS 'Marca del papel usado, ej: Navigator, Bond X';
COMMENT ON COLUMN ordenes_trabajo.papel_gramaje IS 'Gramaje del papel en g/m²';
COMMENT ON COLUMN ordenes_trabajo.pe_espesor_g IS 'Espesor PE en gramos por m²';
COMMENT ON COLUMN ordenes_trabajo.ancho_mm IS 'Ancho del papel en milímetros (ej: 950)';

-- ─── 9. Extender bobinas_pt con turno ───
ALTER TABLE bobinas_pt
  ADD COLUMN IF NOT EXISTS turno_id UUID REFERENCES turnos(id);

CREATE INDEX IF NOT EXISTS idx_bobinas_turno ON bobinas_pt(turno_id);

-- ─── 10. Trigger auto-update updated_at ───
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS turnos_updated_at ON turnos;
CREATE TRIGGER turnos_updated_at
  BEFORE UPDATE ON turnos
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ─── 11. Seed: Nando como admin ───
-- (Su user_id de Telegram. Si está mal, INSERT manualmente con tu /whoami)
INSERT INTO bot_usuarios (telegram_user_id, nombre, rol, activo)
VALUES (383853233, 'Fernando Toca (Nando)', 'admin', true)
ON CONFLICT (telegram_user_id) DO NOTHING;

-- ─── DONE ───
-- Después de aplicar:
--   1. Verifica que las tablas se crearon: SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'bot_%' OR table_name IN ('turnos','diario_planta','temperaturas','mantenimientos','recepciones_mp','maquinas');
--   2. Si tu Telegram user_id NO es 383853233, corre:
--      INSERT INTO bot_usuarios (telegram_user_id, nombre, rol) VALUES (TU_ID, 'Tu Nombre', 'admin');
--   3. Cuando Gerardo te pase su ID:
--      INSERT INTO bot_usuarios (telegram_user_id, nombre, rol) VALUES (GERARDO_ID, 'Gerardo', 'operador');
