-- ═══════════════════════════════════════════════════════════════════
-- 002 — Estados del bot (state machine) + Mezclas de resinas
-- Permite al bot ser button-driven con conversaciones multi-step
-- ═══════════════════════════════════════════════════════════════════
--
-- Cómo aplicar: Supabase Dashboard → SQL Editor → pegar este archivo → Run
--

-- ─── 1. State machine para conversaciones multi-step ───
CREATE TABLE IF NOT EXISTS bot_estados (
  user_id BIGINT PRIMARY KEY,
  estado TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  expira_en TIMESTAMPTZ DEFAULT (now() + interval '30 minutes'),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bot_estados_expira ON bot_estados(expira_en);

COMMENT ON TABLE bot_estados IS 'Estado conversacional del bot por usuario (cross-request). estado=paso del flujo, payload=datos acumulados. expira a los 30 min.';
COMMENT ON COLUMN bot_estados.estado IS 'Ej: trab_papel, trab_resina_count, trab_resina_pick, trab_resina_pct, trab_ancho, bobina_metros';

-- ─── 2. Mezcla de resinas por OT/turno (varios componentes con %) ───
CREATE TABLE IF NOT EXISTS mezclas_resinas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  turno_id UUID,
  ot_id UUID,
  resina_id UUID,
  porcentaje NUMERIC(5,2),
  kg_estimados NUMERIC(10,2),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mezclas_turno ON mezclas_resinas(turno_id);
CREATE INDEX IF NOT EXISTS idx_mezclas_ot ON mezclas_resinas(ot_id);

COMMENT ON TABLE mezclas_resinas IS 'Mezcla de resinas (N componentes con % cada uno) por OT y/o turno. Permite recetas reales: 60% PEBD + 30% PEAD + 10% MB.';

-- ─── 3. Agregar proveedor a papel_bobinas (si no existe) ───
ALTER TABLE papel_bobinas ADD COLUMN IF NOT EXISTS proveedor TEXT;

COMMENT ON COLUMN papel_bobinas.proveedor IS 'Proveedor del papel (ej: Navigator, Bond X, Copamex). Se muestra en la selección del bot.';

-- ─── DONE ───
-- Después de aplicar:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name IN ('bot_estados','mezclas_resinas');
