-- Run after the phase-view migration in the SAME transaction; caller rolls back.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM (
      SELECT j.stable_id,s.fase,SUM(s.ab) AS ab,SUM(s.h) AS h,SUM(s.hr) AS hr
      FROM public.v_stats_bateo_completo s JOIN public.jugadores j ON j.id=s.jugador_id
      GROUP BY j.stable_id,s.fase
    ) expected FULL JOIN public.v_stats_bateo_historico_fase actual USING(stable_id,fase)
    WHERE expected.ab IS DISTINCT FROM actual.ab OR expected.h IS DISTINCT FROM actual.h OR expected.hr IS DISTINCT FROM actual.hr
  ) THEN RAISE EXCEPTION 'Batting phase totals mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT j.stable_id,s.fase,SUM(s.so) AS so,SUM(s.w) AS w,
        SUM(TRUNC(s.ip)*3+ROUND((s.ip-TRUNC(s.ip))*10)) AS outs
      FROM public.v_stats_pitcheo_completo s JOIN public.jugadores j ON j.id=s.jugador_id
      GROUP BY j.stable_id,s.fase
    ) expected FULL JOIN public.v_stats_pitcheo_historico_fase actual USING(stable_id,fase)
    WHERE expected.so IS DISTINCT FROM actual.so OR expected.w IS DISTINCT FROM actual.w
      OR expected.outs IS DISTINCT FROM (TRUNC(actual.ip)*3+ROUND((actual.ip-TRUNC(actual.ip))*10))
  ) THEN RAISE EXCEPTION 'Pitching phase totals mismatch'; END IF;
  IF EXISTS (
    SELECT 1 FROM (
      SELECT j.stable_id,s.fase,SUM(s.po) AS po,SUM(s.a) AS a,SUM(s.e) AS e
      FROM public.v_stats_fildeo_completo s JOIN public.jugadores j ON j.id=s.jugador_id
      GROUP BY j.stable_id,s.fase
    ) expected FULL JOIN public.v_stats_fildeo_historico_fase actual USING(stable_id,fase)
    WHERE expected.po IS DISTINCT FROM actual.po OR expected.a IS DISTINCT FROM actual.a OR expected.e IS DISTINCT FROM actual.e
  ) THEN RAISE EXCEPTION 'Fielding phase totals mismatch'; END IF;
  IF EXISTS(SELECT 1 FROM public.v_stats_bateo_historico_fase WHERE fase NOT IN('regular','playoffs')) THEN
    RAISE EXCEPTION 'Historical phase was not preserved';
  END IF;
END $$;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.v_stats_bateo_historico_fase WHERE fase='regular') OR
     NOT EXISTS(SELECT 1 FROM public.v_stats_bateo_historico_fase WHERE fase='playoffs') OR
     NOT EXISTS(SELECT 1 FROM public.v_stats_pitcheo_historico_fase WHERE fase='playoffs') OR
     NOT EXISTS(SELECT 1 FROM public.v_stats_fildeo_historico_fase WHERE fase='playoffs') THEN
    RAISE EXCEPTION 'Public phase views unavailable';
  END IF;
END $$;
RESET ROLE;
SELECT 'phase totals and anonymous access verified; transaction will roll back' AS verification;
