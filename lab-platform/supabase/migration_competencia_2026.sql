-- ============================================================
-- Liga Argentina de Beisbol (LAB) - Competencia 2026
-- Divisiones, inscripciones y posiciones automaticas corregibles
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Debe ejecutarse antes de migration_fase2_stats_standings.sql.
ALTER TABLE posiciones
  ADD COLUMN IF NOT EXISTS jj INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jg INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS jp INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pct NUMERIC(5,4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS gb NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS racha TEXT;

CREATE TABLE IF NOT EXISTS divisiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0 CHECK (orden >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_division_temporada UNIQUE (temporada_id, nombre),
  CONSTRAINT unique_division_id_temporada UNIQUE (id, temporada_id)
);

CREATE TABLE IF NOT EXISTS temporada_clubes (
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  division_id UUID NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (temporada_id, club_id),
  FOREIGN KEY (division_id, temporada_id) REFERENCES divisiones(id, temporada_id) ON DELETE RESTRICT
);

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS fase TEXT NOT NULL DEFAULT 'regular'
    CHECK (fase IN ('regular', 'playoffs')),
  ADD COLUMN IF NOT EXISTS marcador_innings JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(marcador_innings) = 'array'),
  ADD COLUMN IF NOT EXISTS outs_ofensivos_local INTEGER CHECK (outs_ofensivos_local IS NULL OR outs_ofensivos_local >= 0),
  ADD COLUMN IF NOT EXISTS outs_defensivos_local INTEGER CHECK (outs_defensivos_local IS NULL OR outs_defensivos_local >= 0),
  ADD COLUMN IF NOT EXISTS outs_ofensivos_visitante INTEGER CHECK (outs_ofensivos_visitante IS NULL OR outs_ofensivos_visitante >= 0),
  ADD COLUMN IF NOT EXISTS outs_defensivos_visitante INTEGER CHECK (outs_defensivos_visitante IS NULL OR outs_defensivos_visitante >= 0);

CREATE TABLE IF NOT EXISTS posiciones_ajustes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  division_id UUID,
  scope_key UUID GENERATED ALWAYS AS (COALESCE(division_id, '00000000-0000-0000-0000-000000000000'::uuid)) STORED,
  jj INTEGER CHECK (jj IS NULL OR jj >= 0),
  jg INTEGER CHECK (jg IS NULL OR jg >= 0),
  jp INTEGER CHECK (jp IS NULL OR jp >= 0),
  pct NUMERIC(5,4) CHECK (pct IS NULL OR pct BETWEEN 0 AND 1),
  gb NUMERIC(5,2) CHECK (gb IS NULL OR gb >= 0),
  racha TEXT,
  orden_manual INTEGER CHECK (orden_manual IS NULL OR orden_manual >= 0),
  motivo TEXT NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_posicion_ajuste_scope UNIQUE (temporada_id, club_id, scope_key),
  CONSTRAINT fk_ajuste_division_temporada FOREIGN KEY (division_id, temporada_id)
    REFERENCES divisiones(id, temporada_id) ON DELETE CASCADE,
  CONSTRAINT chk_ajuste_resultados CHECK (
    jj IS NULL OR ((jg IS NULL OR jg <= jj) AND (jp IS NULL OR jp <= jj)
      AND (jg IS NULL OR jp IS NULL OR jg + jp <= jj))
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_posiciones_ajustes_general
  ON posiciones_ajustes(temporada_id, club_id) WHERE division_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_posiciones_ajustes_division
  ON posiciones_ajustes(temporada_id, club_id, division_id) WHERE division_id IS NOT NULL;

CREATE OR REPLACE FUNCTION audit_posicion_ajuste()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_audit_posicion_ajuste ON posiciones_ajustes;
CREATE TRIGGER tr_audit_posicion_ajuste BEFORE INSERT OR UPDATE ON posiciones_ajustes
  FOR EACH ROW EXECUTE FUNCTION audit_posicion_ajuste();

CREATE OR REPLACE FUNCTION validate_partido_competencia()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'finalizado' AND (
    NEW.marcador_local IS NULL OR NEW.marcador_visitante IS NULL
    OR NEW.marcador_local < 0 OR NEW.marcador_visitante < 0
    OR NEW.marcador_local = NEW.marcador_visitante
  ) THEN
    RAISE EXCEPTION 'Un partido finalizado debe tener marcadores validos y un ganador';
  END IF;

  IF EXISTS (SELECT 1 FROM temporada_clubes WHERE temporada_id = NEW.temporada_id)
    AND (
      NOT EXISTS (SELECT 1 FROM temporada_clubes WHERE temporada_id = NEW.temporada_id AND club_id = NEW.local_id AND visible)
      OR NOT EXISTS (SELECT 1 FROM temporada_clubes WHERE temporada_id = NEW.temporada_id AND club_id = NEW.visitante_id AND visible)
    ) THEN
    RAISE EXCEPTION 'Ambos clubes deben estar inscriptos y visibles en la temporada';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM partidos
    WHERE estado = 'finalizado' AND (
      marcador_local IS NULL OR marcador_visitante IS NULL
      OR marcador_local < 0 OR marcador_visitante < 0
      OR marcador_local = marcador_visitante
    )
  ) THEN
    RAISE EXCEPTION 'Hay partidos finalizados preexistentes sin un marcador valido o ganador';
  END IF;
END $$;

DROP TRIGGER IF EXISTS tr_validate_partido_competencia ON partidos;
CREATE TRIGGER tr_validate_partido_competencia
  BEFORE INSERT OR UPDATE ON partidos
  FOR EACH ROW EXECUTE FUNCTION validate_partido_competencia();

CREATE OR REPLACE FUNCTION recalculate_standings(target_temporada UUID)
RETURNS VOID AS $$
DECLARE
  club_record RECORD;
  game_record RECORD;
  streak_result TEXT;
  streak_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(target_temporada::text, 0));

  INSERT INTO posiciones (temporada_id, club_id, pj, pg, pp, pe, cf, cc, pts, jj, jg, jp, pct, gb, racha)
  SELECT
    tc.temporada_id,
    tc.club_id,
    COUNT(p.id)::integer,
    COUNT(p.id) FILTER (
      WHERE (p.local_id = tc.club_id AND p.marcador_local > p.marcador_visitante)
         OR (p.visitante_id = tc.club_id AND p.marcador_visitante > p.marcador_local)
    )::integer,
    COUNT(p.id) FILTER (
      WHERE (p.local_id = tc.club_id AND p.marcador_local < p.marcador_visitante)
         OR (p.visitante_id = tc.club_id AND p.marcador_visitante < p.marcador_local)
    )::integer,
    0,
    COALESCE(SUM(CASE WHEN p.local_id = tc.club_id THEN p.marcador_local ELSE p.marcador_visitante END), 0)::integer,
    COALESCE(SUM(CASE WHEN p.local_id = tc.club_id THEN p.marcador_visitante ELSE p.marcador_local END), 0)::integer,
    0,
    COUNT(p.id)::integer,
    COUNT(p.id) FILTER (
      WHERE (p.local_id = tc.club_id AND p.marcador_local > p.marcador_visitante)
         OR (p.visitante_id = tc.club_id AND p.marcador_visitante > p.marcador_local)
    )::integer,
    COUNT(p.id) FILTER (
      WHERE (p.local_id = tc.club_id AND p.marcador_local < p.marcador_visitante)
         OR (p.visitante_id = tc.club_id AND p.marcador_visitante < p.marcador_local)
    )::integer,
    CASE WHEN COUNT(p.id) > 0 THEN ROUND(
      COUNT(p.id) FILTER (
        WHERE (p.local_id = tc.club_id AND p.marcador_local > p.marcador_visitante)
           OR (p.visitante_id = tc.club_id AND p.marcador_visitante > p.marcador_local)
      )::numeric / COUNT(p.id), 4
    ) ELSE 0 END,
    0,
    NULL
  FROM temporada_clubes tc
  LEFT JOIN partidos p ON p.temporada_id = tc.temporada_id
    AND p.estado = 'finalizado'
    AND (p.local_id = tc.club_id OR p.visitante_id = tc.club_id)
  WHERE tc.temporada_id = target_temporada AND tc.visible
  GROUP BY tc.temporada_id, tc.club_id
  ON CONFLICT (temporada_id, club_id) DO UPDATE SET
    pj = EXCLUDED.pj, pg = EXCLUDED.pg, pp = EXCLUDED.pp, pe = EXCLUDED.pe,
    cf = EXCLUDED.cf, cc = EXCLUDED.cc, pts = EXCLUDED.pts,
    jj = EXCLUDED.jj, jg = EXCLUDED.jg, jp = EXCLUDED.jp,
    pct = EXCLUDED.pct, gb = EXCLUDED.gb, racha = EXCLUDED.racha,
    updated_at = NOW();

  DELETE FROM posiciones p
  WHERE p.temporada_id = target_temporada
    AND NOT EXISTS (
      SELECT 1 FROM temporada_clubes tc
      WHERE tc.temporada_id = target_temporada AND tc.club_id = p.club_id AND tc.visible
    );

  FOR club_record IN SELECT club_id FROM posiciones WHERE temporada_id = target_temporada LOOP
    streak_result := NULL;
    streak_count := 0;
    FOR game_record IN
      SELECT CASE
        WHEN (local_id = club_record.club_id AND marcador_local > marcador_visitante)
          OR (visitante_id = club_record.club_id AND marcador_visitante > marcador_local) THEN 'G'
        ELSE 'P'
      END AS resultado
      FROM partidos
      WHERE temporada_id = target_temporada AND estado = 'finalizado'
        AND (local_id = club_record.club_id OR visitante_id = club_record.club_id)
      ORDER BY fecha_hora DESC, fecha_numero DESC NULLS LAST, id DESC
    LOOP
      IF streak_result IS NULL THEN
        streak_result := game_record.resultado;
      ELSIF streak_result <> game_record.resultado THEN
        EXIT;
      END IF;
      streak_count := streak_count + 1;
    END LOOP;
    UPDATE posiciones
    SET racha = CASE WHEN streak_count > 0 THEN streak_result || streak_count ELSE NULL END
    WHERE temporada_id = target_temporada AND club_id = club_record.club_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION refresh_standings_after_partido()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_standings(OLD.temporada_id);
    RETURN OLD;
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM recalculate_standings(NEW.temporada_id);
    RETURN NEW;
  ELSE
    IF NEW.temporada_id IS DISTINCT FROM OLD.temporada_id THEN
      PERFORM recalculate_standings(OLD.temporada_id);
    END IF;
    PERFORM recalculate_standings(NEW.temporada_id);
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS tr_refresh_standings ON partidos;
CREATE TRIGGER tr_refresh_standings
  AFTER INSERT OR UPDATE OR DELETE ON partidos
  FOR EACH ROW EXECUTE FUNCTION refresh_standings_after_partido();

CREATE OR REPLACE VIEW v_posiciones_efectivas AS
WITH scopes AS (
  SELECT tc.temporada_id, tc.club_id, NULL::UUID AS division_id
  FROM temporada_clubes tc WHERE tc.visible
  UNION ALL
  SELECT tc.temporada_id, tc.club_id, tc.division_id
  FROM temporada_clubes tc WHERE tc.visible
), effective AS (
  SELECT
    p.id,
    s.temporada_id,
    s.club_id,
    s.division_id,
    COALESCE(a.jj, p.jj) AS jj,
    COALESCE(a.jg, p.jg) AS jg,
    COALESCE(a.jp, p.jp) AS jp,
    COALESCE(a.pct, CASE WHEN COALESCE(a.jj, p.jj) > 0
      THEN ROUND(COALESCE(a.jg, p.jg)::numeric / COALESCE(a.jj, p.jj), 4) ELSE 0 END) AS pct,
    COALESCE(a.racha, p.racha) AS racha,
    a.gb AS gb_override,
    a.orden_manual
  FROM scopes s
  JOIN posiciones p ON p.temporada_id = s.temporada_id AND p.club_id = s.club_id
  LEFT JOIN posiciones_ajustes a ON a.temporada_id = s.temporada_id
    AND a.club_id = s.club_id AND a.division_id IS NOT DISTINCT FROM s.division_id
), tiebreaks AS (
  SELECT e.*,
    tie.serie_ganada,
    tie.tqb,
    tie.carreras_empatados
  FROM effective e
  LEFT JOIN LATERAL (
    SELECT
      COUNT(p.id) FILTER (WHERE
        (p.local_id = e.club_id AND p.marcador_local > p.marcador_visitante)
        OR (p.visitante_id = e.club_id AND p.marcador_visitante > p.marcador_local)
      )::integer AS serie_ganada,
      SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_local ELSE p.marcador_visitante END)::integer AS carreras_empatados,
      CASE WHEN COUNT(p.id) > 0 AND BOOL_AND(
        CASE WHEN p.local_id = e.club_id
          THEN p.outs_ofensivos_local IS NOT NULL AND p.outs_defensivos_local IS NOT NULL
          ELSE p.outs_ofensivos_visitante IS NOT NULL AND p.outs_defensivos_visitante IS NOT NULL
        END
      ) THEN
        3 * SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_local ELSE p.marcador_visitante END)::numeric
          / NULLIF(SUM(CASE WHEN p.local_id = e.club_id THEN p.outs_ofensivos_local ELSE p.outs_ofensivos_visitante END), 0)
        - 3 * SUM(CASE WHEN p.local_id = e.club_id THEN p.marcador_visitante ELSE p.marcador_local END)::numeric
          / NULLIF(SUM(CASE WHEN p.local_id = e.club_id THEN p.outs_defensivos_local ELSE p.outs_defensivos_visitante END), 0)
      END AS tqb
    FROM effective opponent
    JOIN partidos p ON p.temporada_id = e.temporada_id AND p.estado = 'finalizado'
      AND ((p.local_id = e.club_id AND p.visitante_id = opponent.club_id)
        OR (p.visitante_id = e.club_id AND p.local_id = opponent.club_id))
    WHERE opponent.temporada_id = e.temporada_id
      AND opponent.division_id IS NOT DISTINCT FROM e.division_id
      AND opponent.club_id <> e.club_id
      AND opponent.pct = e.pct
  ) tie ON true
), leaders AS (
  SELECT e.*,
    FIRST_VALUE(jg) OVER scope_order AS leader_jg,
    FIRST_VALUE(jp) OVER scope_order AS leader_jp
  FROM tiebreaks e
  WINDOW scope_order AS (
    PARTITION BY temporada_id, division_id
    ORDER BY pct DESC, jg DESC, jp ASC, club_id
  )
)
SELECT
  id, temporada_id, club_id, division_id, jj, jg, jp, pct,
  COALESCE(gb_override, GREATEST(0, ((leader_jg - jg) + (jp - leader_jp))::numeric / 2)) AS gb,
  racha, orden_manual, serie_ganada, tqb, carreras_empatados
FROM leaders;

ALTER TABLE divisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporada_clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posiciones_ajustes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Divisiones visibles" ON divisiones;
CREATE POLICY "Divisiones visibles" ON divisiones FOR SELECT USING (true);
DROP POLICY IF EXISTS "Inscripciones visibles" ON temporada_clubes;
CREATE POLICY "Inscripciones visibles" ON temporada_clubes FOR SELECT USING (visible = true);
DROP POLICY IF EXISTS "Ajustes de posiciones visibles" ON posiciones_ajustes;

DROP POLICY IF EXISTS "Admin gestiona divisiones" ON divisiones;
CREATE POLICY "Admin gestiona divisiones" ON divisiones FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));
DROP POLICY IF EXISTS "Admin gestiona inscripciones" ON temporada_clubes;
CREATE POLICY "Admin gestiona inscripciones" ON temporada_clubes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));
DROP POLICY IF EXISTS "Admin gestiona ajustes de posiciones" ON posiciones_ajustes;
CREATE POLICY "Admin gestiona ajustes de posiciones" ON posiciones_ajustes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'))
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

INSERT INTO clubes (nombre, slug, nombre_corto, activo)
VALUES ('Docta', 'docta', 'Docta', true)
ON CONFLICT (slug) DO UPDATE SET nombre = EXCLUDED.nombre, nombre_corto = EXCLUDED.nombre_corto, activo = true;

UPDATE clubes SET activo = false WHERE slug IN ('arias', 'falcons');

UPDATE temporadas SET activa = false WHERE anio <> 2026 AND activa = true;
CREATE UNIQUE INDEX IF NOT EXISTS idx_temporada_activa_unica
  ON temporadas (activa) WHERE activa = true;
INSERT INTO temporadas (anio, nombre, fecha_inicio, activa)
VALUES (2026, 'Temporada 2026', '2026-10-31', true)
ON CONFLICT (anio) DO UPDATE SET nombre = EXCLUDED.nombre, fecha_inicio = EXCLUDED.fecha_inicio, activa = true;

INSERT INTO divisiones (temporada_id, nombre, orden)
SELECT id, division.nombre, division.orden
FROM temporadas
CROSS JOIN (VALUES ('Norte', 10), ('Capital', 20)) AS division(nombre, orden)
WHERE anio = 2026
ON CONFLICT (temporada_id, nombre) DO UPDATE SET orden = EXCLUDED.orden;

INSERT INTO temporada_clubes (temporada_id, club_id, division_id, visible)
SELECT t.id, c.id, d.id, true
FROM temporadas t
JOIN (VALUES
  ('docta', 'Norte'), ('infernales', 'Norte'), ('cachorros', 'Norte'),
  ('daom', 'Capital'), ('patriots', 'Capital'), ('velez', 'Capital')
) AS membership(slug, division) ON true
JOIN clubes c ON c.slug = membership.slug
JOIN divisiones d ON d.temporada_id = t.id AND d.nombre = membership.division
WHERE t.anio = 2026
ON CONFLICT (temporada_id, club_id) DO UPDATE SET division_id = EXCLUDED.division_id, visible = true;

SELECT recalculate_standings(id) FROM temporadas WHERE anio = 2026;
