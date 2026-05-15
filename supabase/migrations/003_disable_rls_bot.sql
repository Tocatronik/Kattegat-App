-- ═══════════════════════════════════════════════════════════════════
-- 003 — Desactivar RLS en tablas del bot + seed Nando admin
--
-- Razón: el bot serverless usa anon key. Sin política RLS explícita,
-- todas las queries vuelven vacías. Como el ÚNICO punto de acceso a estas
-- tablas es la función serverless (que valida roles dentro del código),
-- es seguro desactivar RLS aquí.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE bot_usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE bot_estados DISABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas DISABLE ROW LEVEL SECURITY;
ALTER TABLE turnos DISABLE ROW LEVEL SECURITY;
ALTER TABLE diario_planta DISABLE ROW LEVEL SECURITY;
ALTER TABLE temperaturas DISABLE ROW LEVEL SECURITY;
ALTER TABLE mantenimientos DISABLE ROW LEVEL SECURITY;
ALTER TABLE recepciones_mp DISABLE ROW LEVEL SECURITY;
ALTER TABLE mezclas_resinas DISABLE ROW LEVEL SECURITY;

-- Seed: Nando como admin (idempotente)
INSERT INTO bot_usuarios (telegram_user_id, nombre, rol, activo)
VALUES (383853233, 'Nando', 'admin', true)
ON CONFLICT (telegram_user_id) DO UPDATE SET
  nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Verificación
SELECT telegram_user_id, nombre, rol, activo FROM bot_usuarios;
