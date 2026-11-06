-- A player profile asks the statistics views for one player, but the views aggregate every player and only
-- then apply the filter on jugador_id, so each profile cost the database about a second per view and a
-- burst of profile visits could saturate it. Exposing stable_id, which every view already groups by, lets
-- Postgres apply `stable_id = ...` before aggregating.
--
-- Only a column is added, at the end of each view; existing columns and results do not change. The
-- season-total views now read stable_id straight from the per-game aggregate instead of joining
-- jugadores again, which is the same value because that join was on the row the aggregate picked.
-- Safe to run more than once.

CREATE OR REPLACE VIEW public.v_stats_bateo_agregado WITH (security_invoker = true) AS
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
  a.fase,
  a.stable_id
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_pitcheo_agregado WITH (security_invoker = true) AS
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
  a.fase,
  a.stable_id
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_fildeo_agregado WITH (security_invoker = true) AS
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
  a.fase,
  a.stable_id
FROM agregadas a
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = a.stable_id AND j.temporada_id = a.temporada_id
    AND j.club_id = a.club_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_bateo_completo WITH (security_invoker = true) AS
WITH source_rows AS (
  SELECT
    s.stable_id, s.temporada_id, s.club_id, s.fase,
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
  t.fase,
  t.stable_id
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
    s.stable_id, s.temporada_id, s.club_id, s.fase,
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
  t.fase,
  t.stable_id
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
    s.stable_id, s.temporada_id, s.club_id, s.fase,
    COALESCE(s.po, 0)::BIGINT AS po, COALESCE(s.a, 0)::BIGINT AS a,
    COALESCE(s.e, 0)::BIGINT AS e, COALESCE(s.dp, 0)::BIGINT AS dp
  FROM public.v_stats_fildeo_agregado s

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
  t.fase,
  t.stable_id
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
