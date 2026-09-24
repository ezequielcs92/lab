-- ============================================================
-- Liga Argentina de Béisbol (LAB) - Módulo de Sponsors
-- ============================================================

-- Tipo enumerado para ubicaciones de sponsor
DO $$ BEGIN
  CREATE TYPE sponsor_location AS ENUM ('home_top', 'home_between', 'match', 'news');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Tabla de sponsors
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  logo_url TEXT NOT NULL,
  destino_url TEXT,
  ubicacion sponsor_location NOT NULL DEFAULT 'home_top',
  orden INTEGER NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT true,
  vigencia_inicio DATE,
  vigencia_fin DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_sponsor_logo_https CHECK (logo_url ~ '^https://'),
  CONSTRAINT chk_sponsor_destino_http CHECK (destino_url IS NULL OR destino_url ~ '^https?://'),
  CONSTRAINT chk_sponsor_vigencia CHECK (
    vigencia_inicio IS NULL OR vigencia_fin IS NULL OR vigencia_inicio <= vigencia_fin
  )
);

CREATE INDEX IF NOT EXISTS idx_sponsors_ubicacion ON sponsors(ubicacion);
CREATE INDEX IF NOT EXISTS idx_sponsors_activo ON sponsors(activo);
CREATE INDEX IF NOT EXISTS idx_sponsors_orden ON sponsors(orden);
CREATE INDEX IF NOT EXISTS idx_sponsors_vigencia ON sponsors(vigencia_inicio, vigencia_fin);

CREATE OR REPLACE FUNCTION limit_home_top_sponsors()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.activo AND NEW.ubicacion = 'home_top' AND (
    SELECT COUNT(*) FROM sponsors
    WHERE activo AND ubicacion = 'home_top' AND id IS DISTINCT FROM NEW.id
  ) >= 2 THEN
    RAISE EXCEPTION 'Solo puede haber hasta dos sponsors principales activos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_limit_home_top_sponsors ON sponsors;
CREATE TRIGGER tr_limit_home_top_sponsors BEFORE INSERT OR UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION limit_home_top_sponsors();

-- Row Level Security
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;

-- Lectura pública: solo activos y dentro de vigencia (si tiene fechas)
DROP POLICY IF EXISTS "Sponsors visibles públicamente" ON sponsors;
CREATE POLICY "Sponsors visibles públicamente" ON sponsors FOR SELECT
  USING (
    activo = true
    AND (vigencia_inicio IS NULL OR vigencia_inicio <= CURRENT_DATE)
    AND (vigencia_fin IS NULL OR vigencia_fin >= CURRENT_DATE)
  );

-- Admin Liga: acceso total
DROP POLICY IF EXISTS "Admin modifica sponsors" ON sponsors;
CREATE POLICY "Admin modifica sponsors" ON sponsors FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

-- Trigger updated_at
DROP TRIGGER IF EXISTS tr_sponsors_updated ON sponsors;
CREATE TRIGGER tr_sponsors_updated BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
