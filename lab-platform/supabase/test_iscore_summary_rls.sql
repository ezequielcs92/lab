-- Staging-only verification. No lasting writes; rollback restores role/state.
BEGIN;
SET LOCAL ROLE anon;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.v_stats_bateo_completo s JOIN public.temporadas t ON t.id=s.temporada_id WHERE t.anio=2019)<>179 THEN
    RAISE EXCEPTION 'Anonymous batting coverage mismatch';
  END IF;
  IF (SELECT count(*) FROM public.v_stats_pitcheo_completo s JOIN public.temporadas t ON t.id=s.temporada_id WHERE t.anio=2019)<>102 THEN
    RAISE EXCEPTION 'Anonymous pitching coverage mismatch';
  END IF;
  BEGIN
    PERFORM raw_stats FROM public.estadisticas_temporada_fuente LIMIT 1;
    RAISE EXCEPTION 'Unexpected anonymous access to raw source columns';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM id FROM public.iscore_import_batches LIMIT 1;
    RAISE EXCEPTION 'Unexpected anonymous access to audit manifest';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    DELETE FROM public.estadisticas_temporada_fuente WHERE false;
    RAISE EXCEPTION 'Unexpected anonymous mutation grant';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $$ BEGIN
  IF (SELECT count(*) FROM public.iscore_import_batches)<>0 THEN
    RAISE EXCEPTION 'Unauthenticated JWT-less role can see protected audit manifests';
  END IF;
  IF EXISTS(SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='estadisticas_temporada_fuente' AND cmd='ALL' AND qual NOT LIKE '%admin_liga%') THEN
    RAISE EXCEPTION 'Unexpected broad write policy';
  END IF;
END $$;
ROLLBACK;
