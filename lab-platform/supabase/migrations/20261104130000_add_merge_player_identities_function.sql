-- Let the league admin merge a duplicated player from the admin panel.
--
-- merge_player_identities(p_keep_id, p_remove_id) folds the identity of p_remove_id into the identity
-- of p_keep_id, in one transaction:
--   * every inscription (season + club) of the removed identity that the kept identity does not have
--     is re-pointed to the kept identity (only stable_id changes: statistics stay attached);
--   * when both identities already have an inscription for the same season and club, the statistics,
--     MVP votes and MVP awards of the duplicate row move to the kept row and the duplicate row is
--     deleted. If both rows have statistics for the same game the whole merge is refused.
-- Every folded row is recorded in jugador_identidad_merge_audit.

CREATE TABLE IF NOT EXISTS public.jugador_identidad_merge_audit (
  source_jugador_id UUID PRIMARY KEY,
  stable_id_anterior UUID NOT NULL,
  stable_id_canonico UUID NOT NULL,
  nombre TEXT NOT NULL,
  club_id UUID NOT NULL,
  criterio TEXT NOT NULL DEFAULT 'same_normalized_name_and_club_2017_2018',
  merged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.jugador_identidad_merge_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.jugador_identidad_merge_audit FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.merge_player_identities(p_keep_id UUID, p_remove_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  keep_row jugadores%ROWTYPE;
  remove_row jugadores%ROWTYPE;
  duplicate_row jugadores%ROWTYPE;
  target_id UUID;
  v_relinked INTEGER := 0;
  v_folded INTEGER := 0;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'
  ) THEN
    RAISE EXCEPTION 'Se requiere rol de administrador' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO keep_row FROM jugadores WHERE id = p_keep_id;
  SELECT * INTO remove_row FROM jugadores WHERE id = p_remove_id;
  IF keep_row.id IS NULL OR remove_row.id IS NULL THEN
    RAISE EXCEPTION 'No se encontró alguno de los dos jugadores';
  END IF;
  IF keep_row.stable_id = remove_row.stable_id THEN
    RAISE EXCEPTION 'Los dos perfiles ya son el mismo jugador';
  END IF;

  ALTER TABLE jugadores DISABLE TRIGGER tr_jugadores_stable_id;

  FOR duplicate_row IN
    SELECT * FROM jugadores WHERE stable_id = remove_row.stable_id ORDER BY temporada_id NULLS LAST, created_at
  LOOP
    INSERT INTO jugador_identidad_merge_audit (
      source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id, criterio
    ) VALUES (
      duplicate_row.id, duplicate_row.stable_id, keep_row.stable_id, duplicate_row.nombre,
      duplicate_row.club_id, 'merged_from_admin'
    ) ON CONFLICT (source_jugador_id) DO NOTHING;

    SELECT id INTO target_id
    FROM jugadores
    WHERE stable_id = keep_row.stable_id
      AND club_id = duplicate_row.club_id
      AND temporada_id IS NOT DISTINCT FROM duplicate_row.temporada_id
    LIMIT 1;

    IF target_id IS NULL THEN
      UPDATE jugadores SET stable_id = keep_row.stable_id, updated_at = NOW() WHERE id = duplicate_row.id;
      v_relinked := v_relinked + 1;
    ELSE
      BEGIN
        UPDATE estadisticas_bateo SET jugador_id = target_id WHERE jugador_id = duplicate_row.id;
        UPDATE estadisticas_pitcheo SET jugador_id = target_id WHERE jugador_id = duplicate_row.id;
        UPDATE estadisticas_fildeo SET jugador_id = target_id WHERE jugador_id = duplicate_row.id;
        UPDATE estadisticas_temporada_fuente SET jugador_id = target_id WHERE jugador_id = duplicate_row.id;
      EXCEPTION WHEN unique_violation THEN
        RAISE EXCEPTION 'Los dos perfiles tienen estadísticas cargadas para el mismo partido o temporada (%). Revisalo antes de unificar.', duplicate_row.nombre;
      END;
      UPDATE votos_mvp SET jugador_id = target_id WHERE jugador_id = duplicate_row.id;
      UPDATE partidos SET mvp_jugador_id = target_id WHERE mvp_jugador_id = duplicate_row.id;
      DELETE FROM jugadores WHERE id = duplicate_row.id;
      v_folded := v_folded + 1;
    END IF;
  END LOOP;

  ALTER TABLE jugadores ENABLE TRIGGER tr_jugadores_stable_id;

  RETURN jsonb_build_object(
    'keep_id', keep_row.id,
    'stable_id', keep_row.stable_id,
    'inscriptions_relinked', v_relinked,
    'inscriptions_folded', v_folded
  );
END;
$$;

REVOKE ALL ON FUNCTION public.merge_player_identities(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.merge_player_identities(UUID, UUID) TO authenticated, service_role;
