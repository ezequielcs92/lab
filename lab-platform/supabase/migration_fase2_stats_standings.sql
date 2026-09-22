-- ============================================================
-- Liga Argentina de Béisbol (LAB) - Fase 2
-- Estadisticas por partido, standings y configuracion de lideres
-- Idempotente · aditiva · no rompe el schema base de la Fase 1
-- ============================================================

-- Asegurar extension UUID (necesaria para IDs estables de jugador)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Funcion de updated_at (idempotente, misma que en schema.sql)
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. IDs ESTABLES DE JUGADOR
-- ============================================================

ALTER TABLE jugadores
  ADD COLUMN IF NOT EXISTS stable_id UUID;

ALTER TABLE jugadores DROP CONSTRAINT IF EXISTS jugadores_stable_id_key;
CREATE INDEX IF NOT EXISTS idx_jugadores_stable_id ON jugadores(stable_id);

-- Rellenar stable_id para jugadores existentes de forma deterministica
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM jugadores WHERE stable_id IS NULL LIMIT 1) THEN
    UPDATE jugadores
    SET stable_id = uuid_generate_v5(uuid_ns_url(), 'jugador:' || COALESCE(slug, id::text))
    WHERE stable_id IS NULL;
  END IF;
END $$;

-- Generar automaticamente stable_id en inserciones futuras (solo si no se envia)
CREATE OR REPLACE FUNCTION set_jugador_stable_id()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.stable_id IS DISTINCT FROM OLD.stable_id THEN
    RAISE EXCEPTION 'stable_id no puede modificarse';
  END IF;
  IF NEW.stable_id IS NULL THEN
    NEW.stable_id := uuid_generate_v5(uuid_ns_url(), 'jugador:' || COALESCE(NEW.slug, NEW.id::text));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_jugadores_stable_id ON jugadores;
CREATE TRIGGER tr_jugadores_stable_id
  BEFORE INSERT OR UPDATE ON jugadores
  FOR EACH ROW EXECUTE FUNCTION set_jugador_stable_id();

ALTER TABLE jugadores ALTER COLUMN stable_id SET NOT NULL;

-- ============================================================
-- 2. STANDINGS - COLUMNAS JJ/JG/JP/PCT/GB
-- Se agregan a la tabla posiciones existente para no romper la Fase 1
-- ============================================================

ALTER TABLE posiciones
  ADD COLUMN IF NOT EXISTS jj INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jg INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jp INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pct NUMERIC(5,4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gb NUMERIC(5,2) DEFAULT 0;

-- Migrar los valores de fase 1 una sola vez: las columnas nuevas nacen en cero.
UPDATE posiciones
SET jj = COALESCE(pj, 0), jg = COALESCE(pg, 0), jp = COALESCE(pp, 0)
WHERE jj = 0 AND jg = 0 AND jp = 0
  AND (COALESCE(pj, 0) <> 0 OR COALESCE(pg, 0) <> 0 OR COALESCE(pp, 0) <> 0);

UPDATE posiciones
SET pct = CASE WHEN jj > 0 THEN ROUND(jg::numeric / jj, 4) ELSE 0 END;

ALTER TABLE posiciones
  ALTER COLUMN jj SET NOT NULL,
  ALTER COLUMN jg SET NOT NULL,
  ALTER COLUMN jp SET NOT NULL,
  ALTER COLUMN pct SET NOT NULL,
  ALTER COLUMN gb SET NOT NULL;

ALTER TABLE posiciones DROP CONSTRAINT IF EXISTS chk_posiciones_fase2;
ALTER TABLE posiciones ADD CONSTRAINT chk_posiciones_fase2 CHECK (
  jj >= 0 AND jg >= 0 AND jp >= 0 AND jg + jp <= jj
  AND pct BETWEEN 0 AND 1 AND gb >= 0
);

-- ============================================================
-- 3. ESTADISTICAS POR PARTIDO
-- ============================================================

-- Bateo
CREATE TABLE IF NOT EXISTS estadisticas_bateo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  orden_bateo INTEGER CHECK (orden_bateo IS NULL OR orden_bateo >= 0),
  ab INTEGER NOT NULL DEFAULT 0 CHECK (ab >= 0),
  r INTEGER NOT NULL DEFAULT 0 CHECK (r >= 0),
  h INTEGER NOT NULL DEFAULT 0 CHECK (h >= 0),
  doble INTEGER NOT NULL DEFAULT 0 CHECK (doble >= 0),
  triple INTEGER NOT NULL DEFAULT 0 CHECK (triple >= 0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK (hr >= 0),
  rbi INTEGER NOT NULL DEFAULT 0 CHECK (rbi >= 0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK (bb >= 0),
  so INTEGER NOT NULL DEFAULT 0 CHECK (so >= 0),
  sb INTEGER NOT NULL DEFAULT 0 CHECK (sb >= 0),
  cs INTEGER NOT NULL DEFAULT 0 CHECK (cs >= 0),
  sf INTEGER NOT NULL DEFAULT 0 CHECK (sf >= 0),
  hbp INTEGER NOT NULL DEFAULT 0 CHECK (hbp >= 0),
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_bateo_partido_jugador UNIQUE(partido_id, jugador_id)
);

CREATE INDEX IF NOT EXISTS idx_bateo_partido ON estadisticas_bateo(partido_id);
CREATE INDEX IF NOT EXISTS idx_bateo_jugador ON estadisticas_bateo(jugador_id);
CREATE INDEX IF NOT EXISTS idx_bateo_temporada ON estadisticas_bateo(temporada_id);
CREATE INDEX IF NOT EXISTS idx_bateo_club ON estadisticas_bateo(club_id);

-- Pitcheo
CREATE TABLE IF NOT EXISTS estadisticas_pitcheo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  ip NUMERIC(5,2) NOT NULL DEFAULT 0,
  h INTEGER NOT NULL DEFAULT 0 CHECK (h >= 0),
  r INTEGER NOT NULL DEFAULT 0 CHECK (r >= 0),
  er INTEGER NOT NULL DEFAULT 0 CHECK (er >= 0),
  bb INTEGER NOT NULL DEFAULT 0 CHECK (bb >= 0),
  so INTEGER NOT NULL DEFAULT 0 CHECK (so >= 0),
  hr INTEGER NOT NULL DEFAULT 0 CHECK (hr >= 0),
  w BOOLEAN NOT NULL DEFAULT false,
  l BOOLEAN NOT NULL DEFAULT false,
  sv BOOLEAN NOT NULL DEFAULT false,
  hld INTEGER NOT NULL DEFAULT 0 CHECK (hld >= 0),
  wp INTEGER NOT NULL DEFAULT 0 CHECK (wp >= 0),
  bk INTEGER NOT NULL DEFAULT 0 CHECK (bk >= 0),
  bf INTEGER NOT NULL DEFAULT 0 CHECK (bf >= 0),
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_pitcheo_partido_jugador UNIQUE(partido_id, jugador_id)
);

ALTER TABLE estadisticas_pitcheo
  DROP CONSTRAINT IF EXISTS chk_pitcheo_ip_baseball;
ALTER TABLE estadisticas_pitcheo
  ADD CONSTRAINT chk_pitcheo_ip_baseball
  CHECK (ip >= 0 AND ip IN (TRUNC(ip), TRUNC(ip) + 0.1, TRUNC(ip) + 0.2));

CREATE INDEX IF NOT EXISTS idx_pitcheo_partido ON estadisticas_pitcheo(partido_id);
CREATE INDEX IF NOT EXISTS idx_pitcheo_jugador ON estadisticas_pitcheo(jugador_id);
CREATE INDEX IF NOT EXISTS idx_pitcheo_temporada ON estadisticas_pitcheo(temporada_id);
CREATE INDEX IF NOT EXISTS idx_pitcheo_club ON estadisticas_pitcheo(club_id);

-- Fildeo
CREATE TABLE IF NOT EXISTS estadisticas_fildeo (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  po INTEGER NOT NULL DEFAULT 0 CHECK (po >= 0),
  a INTEGER NOT NULL DEFAULT 0 CHECK (a >= 0),
  e INTEGER NOT NULL DEFAULT 0 CHECK (e >= 0),
  dp INTEGER NOT NULL DEFAULT 0 CHECK (dp >= 0),
  extras JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_fildeo_partido_jugador UNIQUE(partido_id, jugador_id)
);

CREATE INDEX IF NOT EXISTS idx_fildeo_partido ON estadisticas_fildeo(partido_id);
CREATE INDEX IF NOT EXISTS idx_fildeo_jugador ON estadisticas_fildeo(jugador_id);
CREATE INDEX IF NOT EXISTS idx_fildeo_temporada ON estadisticas_fildeo(temporada_id);
CREATE INDEX IF NOT EXISTS idx_fildeo_club ON estadisticas_fildeo(club_id);

-- La fila estadistica debe corresponder al partido, temporada, club y jugador.
CREATE OR REPLACE FUNCTION validate_estadistica_context()
RETURNS TRIGGER AS $$
DECLARE
  partido_temporada UUID;
  partido_local UUID;
  partido_visitante UUID;
  jugador_temporada UUID;
  jugador_club UUID;
BEGIN
  SELECT temporada_id, local_id, visitante_id
  INTO partido_temporada, partido_local, partido_visitante
  FROM partidos WHERE id = NEW.partido_id;

  SELECT temporada_id, club_id
  INTO jugador_temporada, jugador_club
  FROM jugadores WHERE id = NEW.jugador_id;

  IF NEW.temporada_id IS DISTINCT FROM partido_temporada
    OR NEW.club_id NOT IN (partido_local, partido_visitante)
    OR NEW.temporada_id IS DISTINCT FROM jugador_temporada
    OR NEW.club_id IS DISTINCT FROM jugador_club THEN
    RAISE EXCEPTION 'La estadistica no coincide con el partido, la temporada, el club y el jugador';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_bateo_validate_context ON estadisticas_bateo;
CREATE TRIGGER tr_bateo_validate_context BEFORE INSERT OR UPDATE ON estadisticas_bateo
  FOR EACH ROW EXECUTE FUNCTION validate_estadistica_context();
DROP TRIGGER IF EXISTS tr_pitcheo_validate_context ON estadisticas_pitcheo;
CREATE TRIGGER tr_pitcheo_validate_context BEFORE INSERT OR UPDATE ON estadisticas_pitcheo
  FOR EACH ROW EXECUTE FUNCTION validate_estadistica_context();
DROP TRIGGER IF EXISTS tr_fildeo_validate_context ON estadisticas_fildeo;
CREATE TRIGGER tr_fildeo_validate_context BEFORE INSERT OR UPDATE ON estadisticas_fildeo
  FOR EACH ROW EXECUTE FUNCTION validate_estadistica_context();

-- Triggers updated_at
DROP TRIGGER IF EXISTS tr_estadisticas_bateo_updated ON estadisticas_bateo;
CREATE TRIGGER tr_estadisticas_bateo_updated
  BEFORE UPDATE ON estadisticas_bateo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_estadisticas_pitcheo_updated ON estadisticas_pitcheo;
CREATE TRIGGER tr_estadisticas_pitcheo_updated
  BEFORE UPDATE ON estadisticas_pitcheo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS tr_estadisticas_fildeo_updated ON estadisticas_fildeo;
CREATE TRIGGER tr_estadisticas_fildeo_updated
  BEFORE UPDATE ON estadisticas_fildeo
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 4. CONFIGURACION DE LIDERES
-- ============================================================

CREATE TABLE IF NOT EXISTS lideres_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  categoria VARCHAR(50) NOT NULL,
  etiqueta VARCHAR(100) NOT NULL,
  scope VARCHAR(20) NOT NULL CHECK (scope IN ('bateo', 'pitcheo', 'fildeo')),
  metrica VARCHAR(30) NOT NULL CHECK (
    (scope = 'bateo' AND metrica IN ('ab', 'r', 'h', 'doble', 'triple', 'hr', 'rbi', 'bb', 'so', 'sb', 'cs', 'sf', 'hbp', 'avg', 'obp', 'slg', 'ops'))
    OR (scope = 'pitcheo' AND metrica IN ('ip', 'h', 'r', 'er', 'bb', 'so', 'hr', 'w', 'l', 'sv', 'hld', 'wp', 'bk', 'bf', 'era', 'so_pct', 'whip'))
    OR (scope = 'fildeo' AND metrica IN ('po', 'a', 'e', 'dp', 'fld_pct'))
  ),
  orden INTEGER NOT NULL DEFAULT 0 CHECK (orden >= 0),
  activo BOOLEAN NOT NULL DEFAULT true,
  limite INTEGER NOT NULL DEFAULT 10 CHECK (limite BETWEEN 1 AND 100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_lider_temporada_categoria UNIQUE(temporada_id, categoria)
);

CREATE INDEX IF NOT EXISTS idx_lideres_config_temporada ON lideres_config(temporada_id);
CREATE INDEX IF NOT EXISTS idx_lideres_config_activo ON lideres_config(activo);

DROP TRIGGER IF EXISTS tr_lideres_config_updated ON lideres_config;
CREATE TRIGGER tr_lideres_config_updated
  BEFORE UPDATE ON lideres_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE estadisticas_bateo ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_pitcheo ENABLE ROW LEVEL SECURITY;
ALTER TABLE estadisticas_fildeo ENABLE ROW LEVEL SECURITY;
ALTER TABLE lideres_config ENABLE ROW LEVEL SECURITY;

-- Select publico
DROP POLICY IF EXISTS "Estadisticas de bateo visibles" ON estadisticas_bateo;
CREATE POLICY "Estadisticas de bateo visibles" ON estadisticas_bateo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Estadisticas de pitcheo visibles" ON estadisticas_pitcheo;
CREATE POLICY "Estadisticas de pitcheo visibles" ON estadisticas_pitcheo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Estadisticas de fildeo visibles" ON estadisticas_fildeo;
CREATE POLICY "Estadisticas de fildeo visibles" ON estadisticas_fildeo FOR SELECT USING (true);

DROP POLICY IF EXISTS "Config de lideres visible" ON lideres_config;
CREATE POLICY "Config de lideres visible" ON lideres_config FOR SELECT USING (true);

-- Admin Liga: acceso total
DROP POLICY IF EXISTS "Admin modifica estadisticas de bateo" ON estadisticas_bateo;
CREATE POLICY "Admin modifica estadisticas de bateo" ON estadisticas_bateo FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

DROP POLICY IF EXISTS "Admin modifica estadisticas de pitcheo" ON estadisticas_pitcheo;
CREATE POLICY "Admin modifica estadisticas de pitcheo" ON estadisticas_pitcheo FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

DROP POLICY IF EXISTS "Admin modifica estadisticas de fildeo" ON estadisticas_fildeo;
CREATE POLICY "Admin modifica estadisticas de fildeo" ON estadisticas_fildeo FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

DROP POLICY IF EXISTS "Admin modifica lideres config" ON lideres_config;
CREATE POLICY "Admin modifica lideres config" ON lideres_config FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

-- ============================================================
-- 6. VISTAS AGREGADAS PARA LIDERES
-- ============================================================

CREATE OR REPLACE VIEW v_stats_bateo_agregado WITH (security_invoker = true) AS
WITH agregadas AS (
SELECT
  j.stable_id,
  s.temporada_id,
  s.club_id,
  p.fase,
  SUM(s.ab) AS ab,
  SUM(s.r) AS r,
  SUM(s.h) AS h,
  SUM(s.doble) AS doble,
  SUM(s.triple) AS triple,
  SUM(s.hr) AS hr,
  SUM(s.rbi) AS rbi,
  SUM(s.bb) AS bb,
  SUM(s.so) AS so,
  SUM(s.sb) AS sb,
  SUM(s.cs) AS cs,
  SUM(s.sf) AS sf,
  SUM(s.hbp) AS hbp
FROM estadisticas_bateo s
JOIN jugadores j ON j.id = s.jugador_id
JOIN partidos p ON p.id = s.partido_id
WHERE p.estado = 'finalizado'
GROUP BY j.stable_id, s.temporada_id, s.club_id, p.fase
)
SELECT
  ficha.id AS jugador_id,
  a.temporada_id,
  a.club_id,
  a.ab, a.r, a.h, a.doble, a.triple, a.hr, a.rbi, a.bb, a.so, a.sb, a.cs, a.sf, a.hbp,
  CASE WHEN a.ab > 0 THEN ROUND(a.h::numeric / a.ab, 3) ELSE 0 END AS avg,
  CASE WHEN a.ab + a.bb + a.hbp + a.sf > 0
    THEN ROUND((a.h + a.bb + a.hbp)::numeric / (a.ab + a.bb + a.hbp + a.sf), 3)
    ELSE 0 END AS obp,
  CASE WHEN a.ab > 0
    THEN ROUND((a.h + a.doble + 2 * a.triple + 3 * a.hr)::numeric / a.ab, 3)
    ELSE 0 END AS slg,
  (CASE WHEN a.ab + a.bb + a.hbp + a.sf > 0
    THEN ROUND((a.h + a.bb + a.hbp)::numeric / (a.ab + a.bb + a.hbp + a.sf), 3)
    ELSE 0 END
  + CASE WHEN a.ab > 0
    THEN ROUND((a.h + a.doble + 2 * a.triple + 3 * a.hr)::numeric / a.ab, 3)
    ELSE 0 END) AS ops,
  a.fase
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW v_stats_pitcheo_agregado WITH (security_invoker = true) AS
WITH stats AS (
  SELECT
    s.*,
    j.stable_id,
    p.fase,
    (TRUNC(s.ip)::integer * 3 + ROUND((s.ip - TRUNC(s.ip)) * 10)::integer) AS outs
  FROM estadisticas_pitcheo s
  JOIN jugadores j ON j.id = s.jugador_id
  JOIN partidos p ON p.id = s.partido_id
  WHERE p.estado = 'finalizado'
), agregadas AS (
SELECT
  s.stable_id,
  s.temporada_id,
  s.club_id,
  s.fase,
  SUM(s.outs) AS outs,
  SUM(s.h) AS h,
  SUM(s.r) AS r,
  SUM(s.er) AS er,
  SUM(s.bb) AS bb,
  SUM(s.so) AS so,
  SUM(s.hr) AS hr,
  SUM(CASE WHEN s.w THEN 1 ELSE 0 END) AS w,
  SUM(CASE WHEN s.l THEN 1 ELSE 0 END) AS l,
  SUM(CASE WHEN s.sv THEN 1 ELSE 0 END) AS sv,
  SUM(s.hld) AS hld,
  SUM(s.wp) AS wp,
  SUM(s.bk) AS bk,
  SUM(s.bf) AS bf
FROM stats s
GROUP BY s.stable_id, s.temporada_id, s.club_id, s.fase
)
SELECT
  ficha.id AS jugador_id,
  a.temporada_id,
  a.club_id,
  (TRUNC(a.outs / 3.0) + MOD(a.outs, 3) / 10.0)::numeric(7,1) AS ip,
  a.h, a.r, a.er, a.bb, a.so, a.hr, a.w, a.l, a.sv, a.hld, a.wp, a.bk, a.bf,
  CASE WHEN a.outs > 0 THEN ROUND(27 * a.er::numeric / a.outs, 2) ELSE 0 END AS era,
  CASE WHEN a.bf > 0 THEN ROUND(a.so::numeric / a.bf, 3) ELSE 0 END AS so_pct,
  CASE WHEN a.outs > 0 THEN ROUND(3 * (a.bb + a.h)::numeric / a.outs, 3) ELSE 0 END AS whip,
  a.fase
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

INSERT INTO lideres_config (temporada_id, categoria, etiqueta, scope, metrica, orden, activo, limite)
SELECT t.id, defaults.categoria, defaults.etiqueta, defaults.scope, defaults.metrica, defaults.orden, true, 10
FROM temporadas t
CROSS JOIN (VALUES
  ('bateo_avg', 'Promedio de bateo', 'bateo', 'avg', 10),
  ('bateo_hr', 'Jonrones', 'bateo', 'hr', 20),
  ('bateo_rbi', 'Carreras impulsadas', 'bateo', 'rbi', 30),
  ('pitcheo_era', 'Efectividad', 'pitcheo', 'era', 40),
  ('pitcheo_so', 'Ponches', 'pitcheo', 'so', 50),
  ('fildeo_pct', 'Porcentaje de fildeo', 'fildeo', 'fld_pct', 60)
) AS defaults(categoria, etiqueta, scope, metrica, orden)
ON CONFLICT (temporada_id, categoria) DO NOTHING;

UPDATE lideres_config SET limite = 10 WHERE limite = 5;

CREATE OR REPLACE VIEW v_stats_fildeo_agregado WITH (security_invoker = true) AS
WITH agregadas AS (
SELECT
  j.stable_id,
  s.temporada_id,
  s.club_id,
  p.fase,
  SUM(s.po) AS po,
  SUM(s.a) AS a,
  SUM(s.e) AS e,
  SUM(s.dp) AS dp
FROM estadisticas_fildeo s
JOIN jugadores j ON j.id = s.jugador_id
JOIN partidos p ON p.id = s.partido_id
WHERE p.estado = 'finalizado'
GROUP BY j.stable_id, s.temporada_id, s.club_id, p.fase
)
SELECT
  ficha.id AS jugador_id,
  a.temporada_id,
  a.club_id,
  a.po, a.a, a.e, a.dp,
  CASE WHEN a.po + a.a + a.e > 0
    THEN ROUND((a.po + a.a)::numeric / (a.po + a.a + a.e), 3)
    ELSE 0 END AS fld_pct,
  a.fase
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;
