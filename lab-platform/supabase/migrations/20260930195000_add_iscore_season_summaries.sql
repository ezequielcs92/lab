-- Store iScore season summaries separately from game-level statistics.
-- The XLSX exports contain player/team totals by phase, not box scores.

CREATE TABLE IF NOT EXISTS public.iscore_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  season_year INTEGER NOT NULL,
  workbook_manifest JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(workbook_manifest) = 'array'),
  pdf_manifest JSONB NOT NULL DEFAULT '[]'::jsonb
    CHECK (jsonb_typeof(pdf_manifest) = 'array'),
  summary JSONB NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(summary) = 'object'),
  imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, season_year)
);

CREATE TABLE IF NOT EXISTS public.estadisticas_temporada_fuente (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_batch_id UUID NOT NULL REFERENCES public.iscore_import_batches(id) ON DELETE RESTRICT,
  temporada_id UUID NOT NULL REFERENCES public.temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES public.clubes(id) ON DELETE RESTRICT,
  jugador_id UUID NOT NULL REFERENCES public.jugadores(id) ON DELETE CASCADE,
  fase TEXT NOT NULL CHECK (fase IN ('regular', 'playoffs')),
  scope TEXT NOT NULL CHECK (scope IN ('batting', 'pitching', 'fielding')),
  source_file TEXT NOT NULL,
  source_sha256 TEXT NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  stats JSONB NOT NULL CHECK (jsonb_typeof(stats) = 'object'),
  raw_stats JSONB NOT NULL CHECK (jsonb_typeof(raw_stats) = 'object'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_iscore_season_scope UNIQUE (temporada_id, club_id, jugador_id, fase, scope)
);

CREATE INDEX IF NOT EXISTS idx_iscore_season_stats_player
  ON public.estadisticas_temporada_fuente (jugador_id, temporada_id, fase);
CREATE INDEX IF NOT EXISTS idx_iscore_season_stats_club
  ON public.estadisticas_temporada_fuente (temporada_id, club_id, fase, scope);
CREATE INDEX IF NOT EXISTS idx_iscore_season_stats_batch
  ON public.estadisticas_temporada_fuente (import_batch_id);

ALTER TABLE public.iscore_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estadisticas_temporada_fuente ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.iscore_import_batches FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.iscore_import_batches TO authenticated;

DROP POLICY IF EXISTS "Admin gestiona lotes iScore" ON public.iscore_import_batches;
CREATE POLICY "Admin gestiona lotes iScore" ON public.iscore_import_batches
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin_liga')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin_liga')
  );

DROP POLICY IF EXISTS "Estadisticas iScore visibles" ON public.estadisticas_temporada_fuente;
CREATE POLICY "Estadisticas iScore visibles" ON public.estadisticas_temporada_fuente
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admin modifica estadisticas iScore" ON public.estadisticas_temporada_fuente;
CREATE POLICY "Admin modifica estadisticas iScore" ON public.estadisticas_temporada_fuente
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin_liga')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin_liga')
  );

REVOKE ALL ON public.estadisticas_temporada_fuente FROM anon, authenticated;
GRANT SELECT (temporada_id, club_id, jugador_id, fase, scope, stats)
  ON public.estadisticas_temporada_fuente TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.estadisticas_temporada_fuente TO authenticated;

-- Combine game-level and season-summary statistics into the same public shape.
CREATE OR REPLACE VIEW public.v_stats_bateo_completo WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE(s.ab, 0)::BIGINT AS ab,
    COALESCE(s.r, 0)::BIGINT AS r,
    COALESCE(s.h, 0)::BIGINT AS h,
    COALESCE(s.doble, 0)::BIGINT AS doble,
    COALESCE(s.triple, 0)::BIGINT AS triple,
    COALESCE(s.hr, 0)::BIGINT AS hr,
    COALESCE(s.rbi, 0)::BIGINT AS rbi,
    COALESCE(s.bb, 0)::BIGINT AS bb,
    COALESCE(s.so, 0)::BIGINT AS so,
    COALESCE(s.sb, 0)::BIGINT AS sb,
    COALESCE(s.cs, 0)::BIGINT AS cs,
    COALESCE(s.sf, 0)::BIGINT AS sf,
    COALESCE(s.hbp, 0)::BIGINT AS hbp
  FROM public.v_stats_bateo_agregado s
  JOIN public.jugadores j ON j.id = s.jugador_id

  UNION ALL

  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE((s.stats->>'ab')::BIGINT, 0),
    COALESCE((s.stats->>'r')::BIGINT, 0),
    COALESCE((s.stats->>'h')::BIGINT, 0),
    COALESCE((s.stats->>'doble')::BIGINT, 0),
    COALESCE((s.stats->>'triple')::BIGINT, 0),
    COALESCE((s.stats->>'hr')::BIGINT, 0),
    COALESCE((s.stats->>'rbi')::BIGINT, 0),
    COALESCE((s.stats->>'bb')::BIGINT, 0),
    COALESCE((s.stats->>'so')::BIGINT, 0),
    COALESCE((s.stats->>'sb')::BIGINT, 0),
    COALESCE((s.stats->>'cs')::BIGINT, 0),
    COALESCE((s.stats->>'sf')::BIGINT, 0),
    COALESCE((s.stats->>'hbp')::BIGINT, 0)
  FROM public.estadisticas_temporada_fuente s
  JOIN public.jugadores j ON j.id = s.jugador_id
  WHERE s.scope = 'batting'
), totals AS (
  SELECT
    stable_id, temporada_id, club_id, fase,
    SUM(ab)::INTEGER AS ab, SUM(r)::INTEGER AS r, SUM(h)::INTEGER AS h,
    SUM(doble)::INTEGER AS doble, SUM(triple)::INTEGER AS triple,
    SUM(hr)::INTEGER AS hr, SUM(rbi)::INTEGER AS rbi, SUM(bb)::INTEGER AS bb,
    SUM(so)::INTEGER AS so, SUM(sb)::INTEGER AS sb, SUM(cs)::INTEGER AS cs,
    SUM(sf)::INTEGER AS sf, SUM(hbp)::INTEGER AS hbp
  FROM source_rows
  GROUP BY stable_id, temporada_id, club_id, fase
)
SELECT
  ficha.id AS jugador_id,
  t.temporada_id,
  t.club_id,
  t.ab, t.r, t.h, t.doble, t.triple, t.hr, t.rbi, t.bb, t.so, t.sb, t.cs, t.sf, t.hbp,
  CASE WHEN t.ab > 0 THEN ROUND(t.h::NUMERIC / t.ab, 3) ELSE 0 END AS avg,
  CASE WHEN t.ab + t.bb + t.hbp + t.sf > 0
    THEN ROUND((t.h + t.bb + t.hbp)::NUMERIC / (t.ab + t.bb + t.hbp + t.sf), 3)
    ELSE 0 END AS obp,
  CASE WHEN t.ab > 0
    THEN ROUND((t.h + t.doble + 2 * t.triple + 3 * t.hr)::NUMERIC / t.ab, 3)
    ELSE 0 END AS slg,
  (CASE WHEN t.ab > 0
    THEN ROUND((t.h + t.doble + 2 * t.triple + 3 * t.hr)::NUMERIC / t.ab, 3)
    ELSE 0 END
   + CASE WHEN t.ab + t.bb + t.hbp + t.sf > 0
    THEN ROUND((t.h + t.bb + t.hbp)::NUMERIC / (t.ab + t.bb + t.hbp + t.sf), 3)
    ELSE 0 END) AS ops,
  t.fase
FROM totals t
JOIN LATERAL (
  SELECT j.id
  FROM public.jugadores j
  WHERE j.stable_id = t.stable_id
    AND j.temporada_id = t.temporada_id
    AND j.club_id = t.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_pitcheo_completo WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    (TRUNC(COALESCE(s.ip, 0))::INTEGER * 3
      + ROUND((COALESCE(s.ip, 0) - TRUNC(COALESCE(s.ip, 0))) * 10)::INTEGER)::BIGINT AS outs,
    COALESCE(s.h, 0)::BIGINT AS h, COALESCE(s.r, 0)::BIGINT AS r,
    COALESCE(s.er, 0)::BIGINT AS er, COALESCE(s.bb, 0)::BIGINT AS bb,
    COALESCE(s.so, 0)::BIGINT AS so, COALESCE(s.hr, 0)::BIGINT AS hr,
    COALESCE(s.w, 0)::BIGINT AS w, COALESCE(s.l, 0)::BIGINT AS l,
    COALESCE(s.sv, 0)::BIGINT AS sv, COALESCE(s.hld, 0)::BIGINT AS hld,
    COALESCE(s.wp, 0)::BIGINT AS wp, COALESCE(s.bk, 0)::BIGINT AS bk,
    COALESCE(s.bf, 0)::BIGINT AS bf
  FROM public.v_stats_pitcheo_agregado s
  JOIN public.jugadores j ON j.id = s.jugador_id

  UNION ALL

  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE((s.stats->>'ip_outs')::BIGINT, 0),
    COALESCE((s.stats->>'h')::BIGINT, 0),
    COALESCE((s.stats->>'r')::BIGINT, 0),
    COALESCE((s.stats->>'er')::BIGINT, 0),
    COALESCE((s.stats->>'bb')::BIGINT, 0),
    COALESCE((s.stats->>'so')::BIGINT, 0),
    COALESCE((s.stats->>'hr')::BIGINT, 0),
    COALESCE((s.stats->>'w')::BIGINT, 0),
    COALESCE((s.stats->>'l')::BIGINT, 0),
    COALESCE((s.stats->>'sv')::BIGINT, 0),
    COALESCE((s.stats->>'hld')::BIGINT, 0),
    COALESCE((s.stats->>'wp')::BIGINT, 0),
    COALESCE((s.stats->>'bk')::BIGINT, 0),
    COALESCE((s.stats->>'bf')::BIGINT, 0)
  FROM public.estadisticas_temporada_fuente s
  JOIN public.jugadores j ON j.id = s.jugador_id
  WHERE s.scope = 'pitching'
), totals AS (
  SELECT
    stable_id, temporada_id, club_id, fase,
    SUM(outs)::INTEGER AS outs,
    SUM(h)::INTEGER AS h, SUM(r)::INTEGER AS r, SUM(er)::INTEGER AS er,
    SUM(bb)::INTEGER AS bb, SUM(so)::INTEGER AS so, SUM(hr)::INTEGER AS hr,
    SUM(w)::INTEGER AS w, SUM(l)::INTEGER AS l, SUM(sv)::INTEGER AS sv,
    SUM(hld)::INTEGER AS hld, SUM(wp)::INTEGER AS wp, SUM(bk)::INTEGER AS bk,
    SUM(bf)::INTEGER AS bf
  FROM source_rows
  GROUP BY stable_id, temporada_id, club_id, fase
)
SELECT
  ficha.id AS jugador_id,
  t.temporada_id,
  t.club_id,
  (TRUNC(t.outs / 3.0) + MOD(t.outs, 3) / 10.0)::NUMERIC(7,1) AS ip,
  t.h, t.r, t.er, t.bb, t.so, t.hr, t.w, t.l, t.sv, t.hld, t.wp, t.bk, t.bf,
  CASE WHEN t.outs > 0 THEN ROUND(27 * t.er::NUMERIC / t.outs, 2) ELSE 0 END AS era,
  CASE WHEN t.bf > 0 THEN ROUND(t.so::NUMERIC / t.bf, 3) ELSE 0 END AS so_pct,
  CASE WHEN t.outs > 0 THEN ROUND(3 * (t.bb + t.h)::NUMERIC / t.outs, 3) ELSE 0 END AS whip,
  t.fase
FROM totals t
JOIN LATERAL (
  SELECT j.id
  FROM public.jugadores j
  WHERE j.stable_id = t.stable_id
    AND j.temporada_id = t.temporada_id
    AND j.club_id = t.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_fildeo_completo WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE(s.po, 0)::BIGINT AS po, COALESCE(s.a, 0)::BIGINT AS a,
    COALESCE(s.e, 0)::BIGINT AS e, COALESCE(s.dp, 0)::BIGINT AS dp
  FROM public.v_stats_fildeo_agregado s
  JOIN public.jugadores j ON j.id = s.jugador_id

  UNION ALL

  SELECT
    j.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE((s.stats->>'po')::BIGINT, 0),
    COALESCE((s.stats->>'a')::BIGINT, 0),
    COALESCE((s.stats->>'e')::BIGINT, 0),
    COALESCE((s.stats->>'dp')::BIGINT, 0)
  FROM public.estadisticas_temporada_fuente s
  JOIN public.jugadores j ON j.id = s.jugador_id
  WHERE s.scope = 'fielding'
), totals AS (
  SELECT
    stable_id, temporada_id, club_id, fase,
    SUM(po)::INTEGER AS po, SUM(a)::INTEGER AS a,
    SUM(e)::INTEGER AS e, SUM(dp)::INTEGER AS dp
  FROM source_rows
  GROUP BY stable_id, temporada_id, club_id, fase
)
SELECT
  ficha.id AS jugador_id,
  t.temporada_id,
  t.club_id,
  t.po, t.a, t.e, t.dp,
  CASE WHEN t.po + t.a + t.e > 0
    THEN ROUND((t.po + t.a)::NUMERIC / (t.po + t.a + t.e), 3)
    ELSE 0 END AS fld_pct,
  t.fase
FROM totals t
JOIN LATERAL (
  SELECT j.id
  FROM public.jugadores j
  WHERE j.stable_id = t.stable_id
    AND j.temporada_id = t.temporada_id
    AND j.club_id = t.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_bateo_historico WITH (security_invoker = true) AS
WITH totals AS (
  SELECT
    j.stable_id,
    SUM(s.ab)::INTEGER AS ab, SUM(s.r)::INTEGER AS r, SUM(s.h)::INTEGER AS h,
    SUM(s.doble)::INTEGER AS doble, SUM(s.triple)::INTEGER AS triple,
    SUM(s.hr)::INTEGER AS hr, SUM(s.rbi)::INTEGER AS rbi,
    SUM(s.bb)::INTEGER AS bb, SUM(s.so)::INTEGER AS so, SUM(s.sb)::INTEGER AS sb,
    SUM(s.cs)::INTEGER AS cs, SUM(s.sf)::INTEGER AS sf, SUM(s.hbp)::INTEGER AS hbp
  FROM public.v_stats_bateo_completo s
  JOIN public.jugadores j ON j.id = s.jugador_id
  GROUP BY j.stable_id
)
SELECT
  ficha.id AS jugador_id, ficha.club_id, totals.stable_id,
  totals.ab, totals.r, totals.h, totals.doble, totals.triple, totals.hr, totals.rbi,
  totals.bb, totals.so, totals.sb, totals.cs, totals.sf, totals.hbp,
  CASE WHEN totals.ab > 0 THEN ROUND(totals.h::NUMERIC / totals.ab, 3) ELSE 0 END AS avg,
  CASE WHEN totals.ab + totals.bb + totals.hbp + totals.sf > 0
    THEN ROUND((totals.h + totals.bb + totals.hbp)::NUMERIC / (totals.ab + totals.bb + totals.hbp + totals.sf), 3)
    ELSE 0 END AS obp,
  CASE WHEN totals.ab > 0
    THEN ROUND((totals.h + totals.doble + 2 * totals.triple + 3 * totals.hr)::NUMERIC / totals.ab, 3)
    ELSE 0 END AS slg,
  (CASE WHEN totals.ab > 0
    THEN ROUND((totals.h + totals.doble + 2 * totals.triple + 3 * totals.hr)::NUMERIC / totals.ab, 3)
    ELSE 0 END
   + CASE WHEN totals.ab + totals.bb + totals.hbp + totals.sf > 0
    THEN ROUND((totals.h + totals.bb + totals.hbp)::NUMERIC / (totals.ab + totals.bb + totals.hbp + totals.sf), 3)
    ELSE 0 END) AS ops,
  NULL::UUID AS temporada_id,
  'historico'::TEXT AS fase
FROM totals
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM public.jugadores j
  WHERE j.stable_id = totals.stable_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_pitcheo_historico WITH (security_invoker = true) AS
WITH totals AS (
  SELECT
    j.stable_id,
    SUM(TRUNC(s.ip)::INTEGER * 3 + ROUND((s.ip - TRUNC(s.ip)) * 10)::INTEGER)::INTEGER AS outs,
    SUM(s.h)::INTEGER AS h, SUM(s.r)::INTEGER AS r, SUM(s.er)::INTEGER AS er,
    SUM(s.bb)::INTEGER AS bb, SUM(s.so)::INTEGER AS so, SUM(s.hr)::INTEGER AS hr,
    SUM(s.w)::INTEGER AS w, SUM(s.l)::INTEGER AS l, SUM(s.sv)::INTEGER AS sv,
    SUM(s.hld)::INTEGER AS hld, SUM(s.wp)::INTEGER AS wp, SUM(s.bk)::INTEGER AS bk,
    SUM(s.bf)::INTEGER AS bf
  FROM public.v_stats_pitcheo_completo s
  JOIN public.jugadores j ON j.id = s.jugador_id
  GROUP BY j.stable_id
)
SELECT
  ficha.id AS jugador_id, ficha.club_id, totals.stable_id,
  (TRUNC(totals.outs / 3.0) + MOD(totals.outs, 3) / 10.0)::NUMERIC(7,1) AS ip,
  totals.h, totals.r, totals.er, totals.bb, totals.so, totals.hr,
  totals.w, totals.l, totals.sv, totals.hld, totals.wp, totals.bk, totals.bf,
  CASE WHEN totals.outs > 0 THEN ROUND(27 * totals.er::NUMERIC / totals.outs, 2) ELSE 0 END AS era,
  CASE WHEN totals.outs > 0 THEN ROUND(3 * (totals.bb + totals.h)::NUMERIC / totals.outs, 3) ELSE 0 END AS whip,
  NULL::UUID AS temporada_id,
  'historico'::TEXT AS fase
FROM totals
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM public.jugadores j
  WHERE j.stable_id = totals.stable_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

GRANT SELECT ON public.v_stats_bateo_completo TO anon, authenticated;
GRANT SELECT ON public.v_stats_pitcheo_completo TO anon, authenticated;
GRANT SELECT ON public.v_stats_fildeo_completo TO anon, authenticated;
GRANT SELECT ON public.v_stats_bateo_historico TO anon, authenticated;
GRANT SELECT ON public.v_stats_pitcheo_historico TO anon, authenticated;
