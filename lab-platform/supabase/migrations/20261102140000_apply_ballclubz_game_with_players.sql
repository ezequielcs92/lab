-- BallClubz: enroll new players in the same transaction as the game import.
--
-- The admin importer can now create or enroll players while confirming a box score. Doing that
-- from the API with a compensating DELETE could remove an inscription another import had already
-- reused (and, through ON DELETE CASCADE, its statistics). apply_ballclubz_game now receives the
-- new inscriptions in p_jugadores and inserts them before the statistics, so everything commits
-- or rolls back together.
--
-- The previous five-argument signature is dropped: keeping both would make calls without
-- p_jugadores ambiguous.

DROP FUNCTION IF EXISTS public.apply_ballclubz_game(UUID, JSONB, JSONB, JSONB, JSONB);

CREATE OR REPLACE FUNCTION public.apply_ballclubz_game(
  p_lote_id UUID,
  p_partido JSONB,
  p_bateo JSONB,
  p_pitcheo JSONB,
  p_fildeo JSONB,
  p_jugadores JSONB DEFAULT '[]'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lote import_lotes%ROWTYPE;
  v_partido_id UUID := (p_partido->>'id')::uuid;
  v_temporada_id UUID := (p_partido->>'temporada_id')::uuid;
  v_local_id UUID := (p_partido->>'local_id')::uuid;
  v_visitante_id UUID := (p_partido->>'visitante_id')::uuid;
  error_message TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'
  ) THEN
    RAISE EXCEPTION 'Se requiere rol de administrador' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO lote FROM import_lotes WHERE id = p_lote_id FOR UPDATE;
  IF lote.id IS NULL OR lote.fuente <> 'ballclubz' THEN
    RAISE EXCEPTION 'Lote BallClubz no encontrado';
  END IF;
  IF lote.estado = 'aplicado' THEN
    RETURN jsonb_build_object(
      'status', 'already_applied', 'id', lote.id, 'estado', lote.estado,
      'partido_id', v_partido_id, 'applied_at', lote.applied_at
    );
  END IF;
  IF lote.estado NOT IN ('preview', 'listo', 'bloqueado') THEN
    RAISE EXCEPTION 'El lote esta en estado % y no puede aplicarse', lote.estado;
  END IF;

  UPDATE import_lotes SET estado = 'aplicando' WHERE id = p_lote_id;

  BEGIN
    -- New inscriptions must belong to this game's season and clubs.
    IF EXISTS (
      SELECT 1
      FROM jsonb_to_recordset(COALESCE(p_jugadores, '[]'::jsonb)) AS item(temporada_id UUID, club_id UUID)
      WHERE item.temporada_id IS DISTINCT FROM v_temporada_id
         OR item.club_id NOT IN (v_local_id, v_visitante_id)
    ) THEN
      RAISE EXCEPTION 'Las inscripciones nuevas deben ser de la temporada y los clubes del partido';
    END IF;

    INSERT INTO jugadores (
      id, nombre, slug, posicion, club_id, temporada_id, activo, stable_id,
      numero_camiseta, fecha_nacimiento, lugar_nacimiento, batea, lanza, foto_url, bio
    )
    SELECT
      item.id, item.nombre, item.slug, item.posicion::posicion_jugador, item.club_id,
      item.temporada_id, COALESCE(item.activo, true), item.stable_id,
      item.numero_camiseta, item.fecha_nacimiento, item.lugar_nacimiento, item.batea,
      item.lanza, item.foto_url, item.bio
    FROM jsonb_to_recordset(COALESCE(p_jugadores, '[]'::jsonb)) AS item(
      id UUID, nombre TEXT, slug TEXT, posicion TEXT, club_id UUID, temporada_id UUID,
      activo BOOLEAN, stable_id UUID, numero_camiseta INTEGER, fecha_nacimiento DATE,
      lugar_nacimiento TEXT, batea TEXT, lanza TEXT, foto_url TEXT, bio TEXT
    );

    INSERT INTO partidos (
      id, temporada_id, external_source, external_key, fecha_numero, local_id,
      visitante_id, fecha_hora, estadio, estado, fase, marcador_local,
      marcador_visitante, marcador_innings, finalizado_at
    ) VALUES (
      v_partido_id,
      v_temporada_id,
      'ballclubz',
      p_partido->>'external_key',
      NULLIF(p_partido->>'fecha_numero', '')::integer,
      v_local_id,
      v_visitante_id,
      (p_partido->>'fecha_hora')::timestamptz,
      NULLIF(p_partido->>'estadio', ''),
      'finalizado',
      COALESCE(NULLIF(p_partido->>'fase', ''), 'regular'),
      (p_partido->>'marcador_local')::integer,
      (p_partido->>'marcador_visitante')::integer,
      COALESCE(p_partido->'marcador_innings', '[]'::jsonb),
      COALESCE(NULLIF(p_partido->>'finalizado_at', '')::timestamptz, (p_partido->>'fecha_hora')::timestamptz)
    )
    ON CONFLICT (external_source, external_key)
      WHERE external_source IS NOT NULL AND external_key IS NOT NULL
    DO UPDATE SET
      temporada_id = EXCLUDED.temporada_id,
      fecha_numero = EXCLUDED.fecha_numero,
      local_id = EXCLUDED.local_id,
      visitante_id = EXCLUDED.visitante_id,
      fecha_hora = EXCLUDED.fecha_hora,
      estadio = EXCLUDED.estadio,
      estado = EXCLUDED.estado,
      fase = EXCLUDED.fase,
      marcador_local = EXCLUDED.marcador_local,
      marcador_visitante = EXCLUDED.marcador_visitante,
      marcador_innings = EXCLUDED.marcador_innings,
      finalizado_at = EXCLUDED.finalizado_at,
      updated_at = NOW()
    RETURNING id INTO v_partido_id;

    -- El box score es una fotografia completa: reemplaza las filas previas del partido.
    DELETE FROM estadisticas_bateo WHERE partido_id = v_partido_id;
    DELETE FROM estadisticas_pitcheo WHERE partido_id = v_partido_id;
    DELETE FROM estadisticas_fildeo WHERE partido_id = v_partido_id;

    INSERT INTO estadisticas_bateo (
      partido_id, jugador_id, temporada_id, club_id, orden_bateo, ab, r, h,
      doble, triple, hr, rbi, bb, so, sb, cs, sf, hbp, extras
    )
    SELECT
      v_partido_id, item.jugador_id, v_temporada_id, item.club_id, item.orden_bateo,
      item.ab, item.r, item.h, item.doble, item.triple, item.hr, item.rbi,
      item.bb, item.so, item.sb, item.cs, item.sf, item.hbp, item.extras
    FROM jsonb_to_recordset(COALESCE(p_bateo, '[]'::jsonb)) AS item(
      jugador_id UUID, club_id UUID, orden_bateo INTEGER, ab INTEGER, r INTEGER,
      h INTEGER, doble INTEGER, triple INTEGER, hr INTEGER, rbi INTEGER,
      bb INTEGER, so INTEGER, sb INTEGER, cs INTEGER, sf INTEGER, hbp INTEGER,
      extras JSONB
    );

    INSERT INTO estadisticas_pitcheo (
      partido_id, jugador_id, temporada_id, club_id, ip, h, r, er, bb, so, hr,
      w, l, sv, hld, wp, bk, bf, extras
    )
    SELECT
      v_partido_id, item.jugador_id, v_temporada_id, item.club_id, item.ip, item.h,
      item.r, item.er, item.bb, item.so, item.hr, item.w, item.l, item.sv,
      0, item.wp, item.bk, item.bf, item.extras
    FROM jsonb_to_recordset(COALESCE(p_pitcheo, '[]'::jsonb)) AS item(
      jugador_id UUID, club_id UUID, ip NUMERIC, h INTEGER, r INTEGER, er INTEGER,
      bb INTEGER, so INTEGER, hr INTEGER, w BOOLEAN, l BOOLEAN, sv BOOLEAN,
      wp INTEGER, bk INTEGER, bf INTEGER, extras JSONB
    );

    INSERT INTO estadisticas_fildeo (
      partido_id, jugador_id, temporada_id, club_id, po, a, e, dp, extras
    )
    SELECT
      v_partido_id, item.jugador_id, v_temporada_id, item.club_id,
      item.po, item.a, item.e, item.dp, item.extras
    FROM jsonb_to_recordset(COALESCE(p_fildeo, '[]'::jsonb)) AS item(
      jugador_id UUID, club_id UUID, po INTEGER, a INTEGER, e INTEGER,
      dp INTEGER, extras JSONB
    );

    PERFORM recalculate_standings(v_temporada_id);

    UPDATE import_lotes
    SET estado = 'aplicado', applied_at = NOW(),
        resumen = resumen || jsonb_build_object(
          'partido_id', v_partido_id,
          'battingRows', jsonb_array_length(COALESCE(p_bateo, '[]'::jsonb)),
          'pitchingRows', jsonb_array_length(COALESCE(p_pitcheo, '[]'::jsonb)),
          'fieldingRows', jsonb_array_length(COALESCE(p_fildeo, '[]'::jsonb)),
          'inscriptionsCreated', jsonb_array_length(COALESCE(p_jugadores, '[]'::jsonb))
        )
    WHERE id = p_lote_id
    RETURNING * INTO lote;

    RETURN jsonb_build_object(
      'status', 'applied', 'id', lote.id, 'estado', lote.estado,
      'partido_id', v_partido_id, 'applied_at', lote.applied_at
    );
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS error_message = MESSAGE_TEXT;
    UPDATE import_lotes
    SET estado = 'fallido', resumen = resumen || jsonb_build_object('applyError', error_message)
    WHERE id = p_lote_id;
    RETURN jsonb_build_object('status', 'failed', 'error', error_message);
  END;
END;
$$;

REVOKE ALL ON FUNCTION public.apply_ballclubz_game(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_ballclubz_game(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated, service_role;
