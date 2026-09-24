-- ============================================================
-- Votacion MVP: ventana, elegibilidad y deduplicacion server-side
-- ============================================================

ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS finalizado_at TIMESTAMPTZ;

REVOKE INSERT, SELECT ON public.votos_mvp FROM anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_mvp_vote_summary(
  p_partido_id UUID,
  p_visitor_hash TEXT,
  p_ip_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_row RECORD;
  is_votable BOOLEAN := false;
  has_voted BOOLEAN := false;
  vote_counts JSONB := '{}'::jsonb;
BEGIN
  SELECT id, temporada_id, local_id, visitante_id, estado, fecha_hora, finalizado_at
  INTO match_row
  FROM partidos
  WHERE id = p_partido_id;

  IF match_row.id IS NOT NULL THEN
    is_votable := match_row.estado = 'finalizado'
      AND NOW() >= COALESCE(match_row.finalizado_at, match_row.fecha_hora)
      AND NOW() < COALESCE(match_row.finalizado_at, match_row.fecha_hora) + INTERVAL '24 hours';

    SELECT EXISTS (
      SELECT 1
      FROM votos_mvp v
      WHERE v.partido_id = p_partido_id
        AND (v.session_id = p_visitor_hash OR (p_ip_hash IS NOT NULL AND v.ip_hash = p_ip_hash))
    ) INTO has_voted;

    SELECT COALESCE(jsonb_object_agg(votes.jugador_id::text, votes.total), '{}'::jsonb)
    INTO vote_counts
    FROM (
      SELECT v.jugador_id, COUNT(*)::INTEGER AS total
      FROM votos_mvp v
      JOIN jugadores j ON j.id = v.jugador_id
      WHERE v.partido_id = p_partido_id
        AND j.activo
        AND j.temporada_id = match_row.temporada_id
        AND j.club_id IN (match_row.local_id, match_row.visitante_id)
      GROUP BY v.jugador_id
    ) votes;
  END IF;

  RETURN jsonb_build_object(
    'counts', vote_counts,
    'has_voted', has_voted,
    'votable', is_votable
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.cast_mvp_vote(
  p_partido_id UUID,
  p_jugador_id UUID,
  p_visitor_hash TEXT,
  p_ip_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  match_row RECORD;
  is_votable BOOLEAN := false;
  summary JSONB;
BEGIN
  -- Serializa votos del mismo partido para que el control IP/hash sea atómico.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_partido_id::text, 0));

  SELECT id, temporada_id, local_id, visitante_id, estado, fecha_hora, finalizado_at
  INTO match_row
  FROM partidos
  WHERE id = p_partido_id;

  IF match_row.id IS NOT NULL THEN
    is_votable := match_row.estado = 'finalizado'
      AND NOW() >= COALESCE(match_row.finalizado_at, match_row.fecha_hora)
      AND NOW() < COALESCE(match_row.finalizado_at, match_row.fecha_hora) + INTERVAL '24 hours';
  END IF;

  IF NOT is_votable THEN
    RETURN jsonb_build_object('status', 'not_votable');
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jugadores j
    WHERE j.id = p_jugador_id
      AND j.activo
      AND j.temporada_id = match_row.temporada_id
      AND j.club_id IN (match_row.local_id, match_row.visitante_id)
  ) THEN
    RETURN jsonb_build_object('status', 'invalid_player');
  END IF;

  IF EXISTS (
    SELECT 1
    FROM votos_mvp v
    WHERE v.partido_id = p_partido_id
      AND (v.session_id = p_visitor_hash OR (p_ip_hash IS NOT NULL AND v.ip_hash = p_ip_hash))
  ) THEN
    summary := public.get_mvp_vote_summary(p_partido_id, p_visitor_hash, p_ip_hash);
    RETURN summary || jsonb_build_object('status', 'already_voted');
  END IF;

  INSERT INTO votos_mvp (partido_id, jugador_id, session_id, ip_hash)
  VALUES (p_partido_id, p_jugador_id, p_visitor_hash, p_ip_hash);

  summary := public.get_mvp_vote_summary(p_partido_id, p_visitor_hash, p_ip_hash);
  RETURN summary || jsonb_build_object('status', 'ok');
EXCEPTION
  WHEN unique_violation THEN
    summary := public.get_mvp_vote_summary(p_partido_id, p_visitor_hash, p_ip_hash);
    RETURN summary || jsonb_build_object('status', 'already_voted');
END;
$$;

REVOKE ALL ON FUNCTION public.get_mvp_vote_summary(UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cast_mvp_vote(UUID, UUID, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_mvp_vote_summary(UUID, TEXT, TEXT) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.cast_mvp_vote(UUID, UUID, TEXT, TEXT) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_mvp_vote_summary(UUID, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.cast_mvp_vote(UUID, UUID, TEXT, TEXT) TO service_role;
