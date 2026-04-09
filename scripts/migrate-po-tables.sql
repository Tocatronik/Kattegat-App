-- ═══════════════════════════════════════════════════════════════════
-- KATTEGAT ERP — Purchase Orders + Enhanced Inventory Schema
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- ═══════════════════════════════════════════════════════════════════

-- ─── 1. Purchase Orders (Órdenes de Compra) ───
CREATE TABLE IF NOT EXISTS ordenes_compra (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  codigo TEXT NOT NULL UNIQUE,
  cliente_id UUID REFERENCES clientes(id),
  cliente_nombre TEXT NOT NULL,
  contacto_nombre TEXT,
  contacto_email TEXT,

  -- Dates
  fecha_emision DATE DEFAULT CURRENT_DATE,
  fecha_entrega DATE,
  fecha_vencimiento DATE,

  -- Status flow: borrador → enviada → confirmada → en_produccion → entregada → facturada
  status TEXT DEFAULT 'borrador' CHECK (status IN ('borrador','enviada','confirmada','en_produccion','entregada','facturada','cancelada')),

  -- Financials
  subtotal NUMERIC(12,2) DEFAULT 0,
  iva NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  moneda TEXT DEFAULT 'MXN',
  tipo_cambio NUMERIC(8,4) DEFAULT 1,

  -- Terms
  dias_credito INTEGER DEFAULT 30,
  condiciones_pago TEXT DEFAULT '30 días',
  notas TEXT,

  -- Linked records
  ot_id UUID REFERENCES ordenes_trabajo(id),
  cotizacion_id UUID,
  factura_id UUID,

  -- Metadata
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. PO Line Items ───
CREATE TABLE IF NOT EXISTS ordenes_compra_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  po_id UUID REFERENCES ordenes_compra(id) ON DELETE CASCADE,

  descripcion TEXT NOT NULL,
  producto TEXT,
  cantidad NUMERIC(12,2) NOT NULL,
  unidad TEXT DEFAULT 'kg',
  precio_unitario NUMERIC(12,4) NOT NULL,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (cantidad * precio_unitario) STORED,

  -- For production tracking
  especificaciones JSONB DEFAULT '{}',

  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Inventory Movements (Movimientos de inventario) ───
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','salida','ajuste','consumo','devolucion')),
  material_tipo TEXT NOT NULL CHECK (material_tipo IN ('resina','papel','producto_terminado')),
  material_id UUID NOT NULL,
  material_nombre TEXT,

  cantidad NUMERIC(12,2) NOT NULL, -- positive = in, negative = out
  unidad TEXT DEFAULT 'kg',

  -- References
  ot_id UUID REFERENCES ordenes_trabajo(id),
  po_id UUID REFERENCES ordenes_compra(id),
  bobina_id UUID REFERENCES bobinas_pt(id),

  motivo TEXT,
  usuario TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Alerts Configuration ───
CREATE TABLE IF NOT EXISTS alertas_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT NOT NULL, -- 'stock_minimo', 'ot_retrasada', 'factura_vencida', 'po_pendiente'
  material_tipo TEXT, -- 'resina', 'papel'
  umbral NUMERIC(12,2), -- threshold value
  activa BOOLEAN DEFAULT true,
  telegram_notify BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Indexes for performance ───
CREATE INDEX IF NOT EXISTS idx_po_status ON ordenes_compra(status);
CREATE INDEX IF NOT EXISTS idx_po_cliente ON ordenes_compra(cliente_id);
CREATE INDEX IF NOT EXISTS idx_po_items_po ON ordenes_compra_items(po_id);
CREATE INDEX IF NOT EXISTS idx_mov_material ON movimientos_inventario(material_tipo, material_id);
CREATE INDEX IF NOT EXISTS idx_mov_tipo ON movimientos_inventario(tipo);
CREATE INDEX IF NOT EXISTS idx_mov_fecha ON movimientos_inventario(created_at DESC);

-- ─── 6. Auto-update timestamp trigger ───
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_po_updated
  BEFORE UPDATE ON ordenes_compra
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── 7. Add stock_minimo to resinas if not exists ───
DO $$ BEGIN
  ALTER TABLE resinas ADD COLUMN IF NOT EXISTS stock_minimo NUMERIC(12,2) DEFAULT 50;
  ALTER TABLE resinas ADD COLUMN IF NOT EXISTS nombre TEXT;
  ALTER TABLE papel_bobinas ADD COLUMN IF NOT EXISTS stock_minimo INTEGER DEFAULT 3;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ─── 8. Initial alert configs ───
INSERT INTO alertas_config (tipo, material_tipo, umbral) VALUES
  ('stock_minimo', 'resina', 100),
  ('stock_minimo', 'papel', 5),
  ('factura_vencida', NULL, 30),
  ('ot_retrasada', NULL, 7)
ON CONFLICT DO NOTHING;

-- ─── 9. Row Level Security (Basic) ───
ALTER TABLE ordenes_compra ENABLE ROW LEVEL SECURITY;
ALTER TABLE ordenes_compra_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas_config ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users (anon key = basic auth)
CREATE POLICY "Allow all for anon" ON ordenes_compra FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON ordenes_compra_items FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON movimientos_inventario FOR ALL USING (true);
CREATE POLICY "Allow all for anon" ON alertas_config FOR ALL USING (true);

SELECT 'Migration complete! Tables created: ordenes_compra, ordenes_compra_items, movimientos_inventario, alertas_config' AS result;
