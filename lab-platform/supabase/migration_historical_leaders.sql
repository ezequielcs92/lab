-- ============================================================
-- Liga Argentina de Beisbol - Lideres historicos acumulados
-- Solo expone las categorias aprobadas por el cliente en la UI.
-- ============================================================

CREATE OR REPLACE VIEW v_stats_bateo_historico WITH (security_invoker = true) AS
WITH totals AS (
  SELECT
    j.stable_id,
    SUM(s.ab)::integer AS ab,
    SUM(s.r)::integer AS r,
    SUM(s.h)::integer AS h,
    SUM(s.doble)::integer AS doble,
    SUM(s.triple)::integer AS triple,
    SUM(s.hr)::integer AS hr,
    SUM(s.rbi)::integer AS rbi,
    SUM(s.bb)::integer AS bb,
    SUM(s.so)::integer AS so,
    SUM(s.sb)::integer AS sb,
    SUM(s.cs)::integer AS cs,
    SUM(s.sf)::integer AS sf,
    SUM(s.hbp)::integer AS hbp
  FROM estadisticas_bateo s
  JOIN jugadores j ON j.id = s.jugador_id
  JOIN partidos p ON p.id = s.partido_id
  WHERE p.estado = 'finalizado'
  GROUP BY j.stable_id
)
SELECT
  ficha.id AS jugador_id,
  ficha.club_id,
  totals.stable_id,
  totals.ab, totals.r, totals.h, totals.doble, totals.triple, totals.hr, totals.rbi,
  totals.bb, totals.so, totals.sb, totals.cs, totals.sf, totals.hbp,
  CASE WHEN totals.ab > 0 THEN ROUND(totals.h::numeric / totals.ab, 3) ELSE 0 END AS avg,
  CASE WHEN totals.ab + totals.bb + totals.hbp + totals.sf > 0
    THEN ROUND((totals.h + totals.bb + totals.hbp)::numeric / (totals.ab + totals.bb + totals.hbp + totals.sf), 3)
    ELSE 0 END AS obp,
  CASE WHEN totals.ab > 0
    THEN ROUND((totals.h + totals.doble + 2 * totals.triple + 3 * totals.hr)::numeric / totals.ab, 3)
    ELSE 0 END AS slg,
  CASE WHEN totals.ab > 0
    THEN ROUND((totals.h + totals.doble + 2 * totals.triple + 3 * totals.hr)::numeric / totals.ab, 3)
    ELSE 0 END
  + CASE WHEN totals.ab + totals.bb + totals.hbp + totals.sf > 0
    THEN ROUND((totals.h + totals.bb + totals.hbp)::numeric / (totals.ab + totals.bb + totals.hbp + totals.sf), 3)
    ELSE 0 END AS ops,
  NULL::uuid AS temporada_id,
  'historico'::text AS fase
FROM totals
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = totals.stable_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW v_stats_pitcheo_historico WITH (security_invoker = true) AS
WITH totals AS (
  SELECT
    j.stable_id,
    SUM(TRUNC(s.ip)::integer * 3 + ROUND((s.ip - TRUNC(s.ip)) * 10)::integer)::integer AS outs,
    SUM(s.h)::integer AS h,
    SUM(s.r)::integer AS r,
    SUM(s.er)::integer AS er,
    SUM(s.bb)::integer AS bb,
    SUM(s.so)::integer AS so,
    SUM(s.hr)::integer AS hr,
    SUM(CASE WHEN s.w THEN 1 ELSE 0 END)::integer AS w,
    SUM(CASE WHEN s.l THEN 1 ELSE 0 END)::integer AS l,
    SUM(CASE WHEN s.sv THEN 1 ELSE 0 END)::integer AS sv,
    SUM(s.hld)::integer AS hld,
    SUM(s.wp)::integer AS wp,
    SUM(s.bk)::integer AS bk,
    SUM(s.bf)::integer AS bf
  FROM estadisticas_pitcheo s
  JOIN jugadores j ON j.id = s.jugador_id
  JOIN partidos p ON p.id = s.partido_id
  WHERE p.estado = 'finalizado'
  GROUP BY j.stable_id
)
SELECT
  ficha.id AS jugador_id,
  ficha.club_id,
  totals.stable_id,
  (TRUNC(totals.outs / 3.0) + MOD(totals.outs, 3) / 10.0)::numeric(7,1) AS ip,
  totals.h, totals.r, totals.er, totals.bb, totals.so, totals.hr, totals.w, totals.l, totals.sv,
  totals.hld, totals.wp, totals.bk, totals.bf,
  CASE WHEN totals.outs > 0 THEN ROUND(27 * totals.er::numeric / totals.outs, 2) ELSE 0 END AS era,
  CASE WHEN totals.outs > 0 THEN ROUND(3 * (totals.bb + totals.h)::numeric / totals.outs, 3) ELSE 0 END AS whip,
  NULL::uuid AS temporada_id,
  'historico'::text AS fase
FROM totals
JOIN LATERAL (
  SELECT j.id, j.club_id
  FROM jugadores j
  WHERE j.stable_id = totals.stable_id
  ORDER BY COALESCE(j.activo, false) DESC, j.updated_at DESC
  LIMIT 1
) ficha ON true;
