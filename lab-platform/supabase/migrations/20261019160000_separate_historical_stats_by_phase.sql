-- Add phase-specific career views without changing legacy view semantics.
-- No source statistics, player identities or games are rewritten.
CREATE OR REPLACE VIEW public.v_stats_bateo_historico_fase WITH (security_invoker = true) AS
WITH totals AS (
  SELECT j.stable_id, s.fase,
    SUM(s.ab)::INTEGER AS ab, SUM(s.r)::INTEGER AS r, SUM(s.h)::INTEGER AS h,
    SUM(s.doble)::INTEGER AS doble, SUM(s.triple)::INTEGER AS triple,
    SUM(s.hr)::INTEGER AS hr, SUM(s.rbi)::INTEGER AS rbi,
    SUM(s.bb)::INTEGER AS bb, SUM(s.so)::INTEGER AS so, SUM(s.sb)::INTEGER AS sb,
    SUM(s.cs)::INTEGER AS cs, SUM(s.sf)::INTEGER AS sf, SUM(s.hbp)::INTEGER AS hbp
  FROM public.v_stats_bateo_completo s
  JOIN public.jugadores j ON j.id=s.jugador_id
  GROUP BY j.stable_id, s.fase
)
SELECT ficha.id AS jugador_id, ficha.club_id, totals.stable_id,
  totals.ab, totals.r, totals.h, totals.doble, totals.triple, totals.hr, totals.rbi,
  totals.bb, totals.so, totals.sb, totals.cs, totals.sf, totals.hbp,
  CASE WHEN totals.ab>0 THEN ROUND(totals.h::NUMERIC/totals.ab,3) ELSE 0 END AS avg,
  CASE WHEN totals.ab+totals.bb+totals.hbp+totals.sf>0
    THEN ROUND((totals.h+totals.bb+totals.hbp)::NUMERIC/(totals.ab+totals.bb+totals.hbp+totals.sf),3) ELSE 0 END AS obp,
  CASE WHEN totals.ab>0 THEN ROUND((totals.h+totals.doble+2*totals.triple+3*totals.hr)::NUMERIC/totals.ab,3) ELSE 0 END AS slg,
  (CASE WHEN totals.ab>0 THEN ROUND((totals.h+totals.doble+2*totals.triple+3*totals.hr)::NUMERIC/totals.ab,3) ELSE 0 END
   + CASE WHEN totals.ab+totals.bb+totals.hbp+totals.sf>0
     THEN ROUND((totals.h+totals.bb+totals.hbp)::NUMERIC/(totals.ab+totals.bb+totals.hbp+totals.sf),3) ELSE 0 END) AS ops,
  NULL::UUID AS temporada_id, totals.fase
FROM totals
JOIN LATERAL (
  SELECT j.id,j.club_id FROM public.jugadores j WHERE j.stable_id=totals.stable_id
  ORDER BY COALESCE(j.activo,false) DESC,j.updated_at DESC,j.id LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_pitcheo_historico_fase WITH (security_invoker = true) AS
WITH totals AS (
  SELECT j.stable_id,s.fase,
    SUM(TRUNC(s.ip)::INTEGER*3+ROUND((s.ip-TRUNC(s.ip))*10)::INTEGER)::INTEGER AS outs,
    SUM(s.h)::INTEGER AS h,SUM(s.r)::INTEGER AS r,SUM(s.er)::INTEGER AS er,
    SUM(s.bb)::INTEGER AS bb,SUM(s.so)::INTEGER AS so,SUM(s.hr)::INTEGER AS hr,
    SUM(s.w)::INTEGER AS w,SUM(s.l)::INTEGER AS l,SUM(s.sv)::INTEGER AS sv,
    SUM(s.hld)::INTEGER AS hld,SUM(s.wp)::INTEGER AS wp,SUM(s.bk)::INTEGER AS bk,SUM(s.bf)::INTEGER AS bf
  FROM public.v_stats_pitcheo_completo s JOIN public.jugadores j ON j.id=s.jugador_id
  GROUP BY j.stable_id,s.fase
)
SELECT ficha.id AS jugador_id,ficha.club_id,totals.stable_id,
  (TRUNC(totals.outs/3.0)+MOD(totals.outs,3)/10.0)::NUMERIC(7,1) AS ip,
  totals.h,totals.r,totals.er,totals.bb,totals.so,totals.hr,totals.w,totals.l,totals.sv,
  totals.hld,totals.wp,totals.bk,totals.bf,
  CASE WHEN totals.outs>0 THEN ROUND(27*totals.er::NUMERIC/totals.outs,2) ELSE 0 END AS era,
  CASE WHEN totals.outs>0 THEN ROUND(3*(totals.bb+totals.h)::NUMERIC/totals.outs,3) ELSE 0 END AS whip,
  NULL::UUID AS temporada_id,totals.fase
FROM totals
JOIN LATERAL (
  SELECT j.id,j.club_id FROM public.jugadores j WHERE j.stable_id=totals.stable_id
  ORDER BY COALESCE(j.activo,false) DESC,j.updated_at DESC,j.id LIMIT 1
) ficha ON true;

CREATE OR REPLACE VIEW public.v_stats_fildeo_historico_fase WITH (security_invoker = true) AS
WITH totals AS (
  SELECT j.stable_id,s.fase,SUM(s.po)::INTEGER AS po,SUM(s.a)::INTEGER AS a,
    SUM(s.e)::INTEGER AS e,SUM(s.dp)::INTEGER AS dp
  FROM public.v_stats_fildeo_completo s JOIN public.jugadores j ON j.id=s.jugador_id
  GROUP BY j.stable_id,s.fase
)
SELECT ficha.id AS jugador_id,ficha.club_id,totals.stable_id,
  totals.po,totals.a,totals.e,totals.dp,
  CASE WHEN totals.po+totals.a+totals.e>0
    THEN ROUND((totals.po+totals.a)::NUMERIC/(totals.po+totals.a+totals.e),3) ELSE 0 END AS fld_pct,
  NULL::UUID AS temporada_id,totals.fase
FROM totals
JOIN LATERAL (
  SELECT j.id,j.club_id FROM public.jugadores j WHERE j.stable_id=totals.stable_id
  ORDER BY COALESCE(j.activo,false) DESC,j.updated_at DESC,j.id LIMIT 1
) ficha ON true;

GRANT SELECT ON public.v_stats_bateo_historico_fase,public.v_stats_pitcheo_historico_fase,public.v_stats_fildeo_historico_fase TO anon,authenticated;
