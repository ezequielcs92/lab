-- ============================================================
-- Liga Argentina de Beisbol (LAB) - Importaciones y Google Sheets
-- Auditoria, idempotencia y conflictos sin aplicar cambios automaticos
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS external_source TEXT,
  ADD COLUMN IF NOT EXISTS external_key TEXT;

ALTER TABLE partidos DROP CONSTRAINT IF EXISTS chk_partido_external_identity;
ALTER TABLE partidos ADD CONSTRAINT chk_partido_external_identity CHECK (
  (external_source IS NULL AND external_key IS NULL)
  OR (external_source IS NOT NULL AND external_key IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partidos_external_key
  ON partidos(external_source, external_key)
  WHERE external_source IS NOT NULL AND external_key IS NOT NULL;

CREATE TABLE IF NOT EXISTS import_lotes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fuente TEXT NOT NULL CHECK (fuente IN ('iscore', 'google_sheets')),
  temporada_id UUID REFERENCES temporadas(id) ON DELETE RESTRICT,
  estado TEXT NOT NULL DEFAULT 'preview'
    CHECK (estado IN ('preview', 'bloqueado', 'listo', 'aplicando', 'aplicado', 'fallido')),
  resumen JSONB NOT NULL DEFAULT '{}'::jsonb,
  conflictos JSONB NOT NULL DEFAULT '[]'::jsonb,
  creado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sync_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fuente TEXT NOT NULL DEFAULT 'google_sheets' CHECK (fuente = 'google_sheets'),
  pestaña TEXT NOT NULL CHECK (pestaña IN ('Partidos', 'Bateo', 'Pitcheo', 'Fildeo')),
  clave_externa TEXT NOT NULL,
  lab_hash TEXT,
  sheet_hash TEXT,
  last_synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_sync_registro UNIQUE(fuente, pestaña, clave_externa)
);

CREATE TABLE IF NOT EXISTS sync_conflictos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lote_id UUID REFERENCES import_lotes(id) ON DELETE SET NULL,
  fuente TEXT NOT NULL CHECK (fuente IN ('iscore', 'google_sheets')),
  tipo TEXT NOT NULL,
  entidad TEXT NOT NULL,
  clave_externa TEXT NOT NULL,
  lab_payload JSONB,
  external_payload JSONB,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'usar_lab', 'usar_externo', 'fusionado', 'omitido')),
  resuelto_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_import_lotes_estado ON import_lotes(estado);
CREATE INDEX IF NOT EXISTS idx_sync_conflictos_estado ON sync_conflictos(estado);
CREATE INDEX IF NOT EXISTS idx_sync_conflictos_clave ON sync_conflictos(fuente, entidad, clave_externa);

CREATE OR REPLACE FUNCTION audit_import_sync()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'import_lotes' AND TG_OP = 'INSERT' THEN NEW.creado_por := auth.uid(); END IF;
  IF TG_TABLE_NAME = 'sync_conflictos' AND NEW.estado <> 'pendiente' THEN
    NEW.resuelto_por := auth.uid();
    NEW.resolved_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_audit_import_lotes ON import_lotes;
CREATE TRIGGER tr_audit_import_lotes BEFORE INSERT ON import_lotes
  FOR EACH ROW EXECUTE FUNCTION audit_import_sync();
DROP TRIGGER IF EXISTS tr_audit_sync_conflictos ON sync_conflictos;
CREATE TRIGGER tr_audit_sync_conflictos BEFORE INSERT OR UPDATE ON sync_conflictos
  FOR EACH ROW EXECUTE FUNCTION audit_import_sync();

ALTER TABLE import_lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_conflictos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admin gestiona lotes de importacion" ON import_lotes;
CREATE POLICY "Admin gestiona lotes de importacion" ON import_lotes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

DROP POLICY IF EXISTS "Admin gestiona registros sincronizados" ON sync_registros;
CREATE POLICY "Admin gestiona registros sincronizados" ON sync_registros FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

DROP POLICY IF EXISTS "Admin gestiona conflictos de sincronizacion" ON sync_conflictos;
CREATE POLICY "Admin gestiona conflictos de sincronizacion" ON sync_conflictos FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));
