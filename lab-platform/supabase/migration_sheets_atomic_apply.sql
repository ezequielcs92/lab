-- ============================================================
-- Google Sheets: preview y aplicacion atomicos e idempotentes
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_google_sheets_preview(
  p_estado TEXT,
  p_resumen JSONB,
  p_conflictos JSONB,
  p_temporada_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lote import_lotes%ROWTYPE;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'
  ) THEN
    RAISE EXCEPTION 'Se requiere rol de administrador' USING ERRCODE = '42501';
  END IF;
  IF p_estado NOT IN ('preview', 'bloqueado') THEN
    RAISE EXCEPTION 'Estado inicial de lote invalido';
  END IF;

  INSERT INTO import_lotes (fuente, temporada_id, estado, resumen, conflictos)
  VALUES ('google_sheets', p_temporada_id, p_estado, p_resumen, COALESCE(p_conflictos, '[]'::jsonb))
  RETURNING * INTO lote;

  INSERT INTO sync_conflictos (
    lote_id, fuente, tipo, entidad, clave_externa, lab_payload, external_payload
  )
  SELECT
    lote.id, 'google_sheets', item.tipo, item.entidad, item.clave_externa,
    item.lab_payload, item.external_payload
  FROM jsonb_to_recordset(COALESCE(p_conflictos, '[]'::jsonb)) AS item(
    tipo TEXT,
    entidad TEXT,
    clave_externa TEXT,
    lab_payload JSONB,
    external_payload JSONB
  );

  RETURN jsonb_build_object(
    'id', lote.id,
    'estado', lote.estado,
    'created_at', lote.created_at
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.apply_google_sheets_batch(
  p_lote_id UUID,
  p_partidos JSONB,
  p_bateo JSONB,
  p_pitcheo JSONB,
  p_fildeo JSONB,
  p_sync JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  lote import_lotes%ROWTYPE;
  applied_rows INTEGER := jsonb_array_length(COALESCE(p_sync, '[]'::jsonb));
  error_message TEXT;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'
  ) THEN
    RAISE EXCEPTION 'Se requiere rol de administrador' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO lote FROM import_lotes WHERE id = p_lote_id FOR UPDATE;
  IF lote.id IS NULL OR lote.fuente <> 'google_sheets' THEN
    RAISE EXCEPTION 'Lote no encontrado';
  END IF;
  IF lote.estado = 'aplicado' THEN
    RETURN jsonb_build_object(
      'status', 'already_applied',
      'id', lote.id,
      'estado', lote.estado,
      'applied_at', lote.applied_at,
      'appliedRows', COALESCE((lote.resumen->>'appliedRows')::integer, 0)
    );
  END IF;
  IF lote.estado NOT IN ('preview', 'listo') THEN
    RAISE EXCEPTION 'El lote esta en estado % y no puede aplicarse', lote.estado;
  END IF;
  IF EXISTS (SELECT 1 FROM sync_conflictos WHERE lote_id = p_lote_id AND estado = 'pendiente') THEN
    RAISE EXCEPTION 'El lote tiene conflictos pendientes';
  END IF;

  UPDATE import_lotes SET estado = 'aplicando' WHERE id = p_lote_id;

  BEGIN
    INSERT INTO partidos (
      id, temporada_id, external_source, external_key, fecha_numero, local_id, visitante_id,
      fecha_hora, estadio, estado, fase, marcador_local, marcador_visitante,
      marcador_innings, streaming_url
    )
    SELECT
      item.id, item.temporada_id, item.external_source, item.external_key, item.fecha_numero,
      item.local_id, item.visitante_id, item.fecha_hora, item.estadio,
      item.estado::estado_partido, item.fase, item.marcador_local,
      item.marcador_visitante, item.marcador_innings, item.streaming_url
    FROM jsonb_to_recordset(COALESCE(p_partidos, '[]'::jsonb)) AS item(
      id UUID, temporada_id UUID, external_source TEXT, external_key TEXT, fecha_numero INTEGER,
      local_id UUID, visitante_id UUID, fecha_hora TIMESTAMPTZ, estadio TEXT, estado TEXT,
      fase TEXT, marcador_local INTEGER, marcador_visitante INTEGER,
      marcador_innings JSONB, streaming_url TEXT
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
      streaming_url = EXCLUDED.streaming_url,
      updated_at = NOW();

    INSERT INTO estadisticas_bateo (
      partido_id, jugador_id, temporada_id, club_id, orden_bateo, ab, r, h, doble,
      triple, hr, rbi, bb, so, sb, cs, sf, hbp, extras
    )
    SELECT
      item.partido_id, item.jugador_id, item.temporada_id, item.club_id, item.orden_bateo,
      item.ab, item.r, item.h, item.doble, item.triple, item.hr, item.rbi, item.bb,
      item.so, item.sb, item.cs, item.sf, item.hbp, item.extras
    FROM jsonb_to_recordset(COALESCE(p_bateo, '[]'::jsonb)) AS item(
      partido_id UUID, jugador_id UUID, temporada_id UUID, club_id UUID,
      orden_bateo INTEGER, ab INTEGER, r INTEGER, h INTEGER, doble INTEGER,
      triple INTEGER, hr INTEGER, rbi INTEGER, bb INTEGER, so INTEGER, sb INTEGER,
      cs INTEGER, sf INTEGER, hbp INTEGER, extras JSONB
    )
    ON CONFLICT (partido_id, jugador_id) DO UPDATE SET
      orden_bateo = EXCLUDED.orden_bateo, ab = EXCLUDED.ab, r = EXCLUDED.r,
      h = EXCLUDED.h, doble = EXCLUDED.doble, triple = EXCLUDED.triple,
      hr = EXCLUDED.hr, rbi = EXCLUDED.rbi, bb = EXCLUDED.bb, so = EXCLUDED.so,
      sb = EXCLUDED.sb, cs = EXCLUDED.cs, sf = EXCLUDED.sf, hbp = EXCLUDED.hbp,
      extras = EXCLUDED.extras, updated_at = NOW();

    INSERT INTO estadisticas_pitcheo (
      partido_id, jugador_id, temporada_id, club_id, ip, h, r, er, bb, so, hr,
      w, l, sv, hld, wp, bk, bf, extras
    )
    SELECT
      item.partido_id, item.jugador_id, item.temporada_id, item.club_id, item.ip,
      item.h, item.r, item.er, item.bb, item.so, item.hr, item.w, item.l, item.sv,
      item.hld, item.wp, item.bk, item.bf, item.extras
    FROM jsonb_to_recordset(COALESCE(p_pitcheo, '[]'::jsonb)) AS item(
      partido_id UUID, jugador_id UUID, temporada_id UUID, club_id UUID,
      ip NUMERIC, h INTEGER, r INTEGER, er INTEGER, bb INTEGER, so INTEGER,
      hr INTEGER, w BOOLEAN, l BOOLEAN, sv BOOLEAN, hld INTEGER, wp INTEGER,
      bk INTEGER, bf INTEGER, extras JSONB
    )
    ON CONFLICT (partido_id, jugador_id) DO UPDATE SET
      ip = EXCLUDED.ip, h = EXCLUDED.h, r = EXCLUDED.r, er = EXCLUDED.er,
      bb = EXCLUDED.bb, so = EXCLUDED.so, hr = EXCLUDED.hr, w = EXCLUDED.w,
      l = EXCLUDED.l, sv = EXCLUDED.sv, hld = EXCLUDED.hld, wp = EXCLUDED.wp,
      bk = EXCLUDED.bk, bf = EXCLUDED.bf, extras = EXCLUDED.extras, updated_at = NOW();

    INSERT INTO estadisticas_fildeo (
      partido_id, jugador_id, temporada_id, club_id, po, a, e, dp, extras
    )
    SELECT
      item.partido_id, item.jugador_id, item.temporada_id, item.club_id,
      item.po, item.a, item.e, item.dp, item.extras
    FROM jsonb_to_recordset(COALESCE(p_fildeo, '[]'::jsonb)) AS item(
      partido_id UUID, jugador_id UUID, temporada_id UUID, club_id UUID,
      po INTEGER, a INTEGER, e INTEGER, dp INTEGER, extras JSONB
    )
    ON CONFLICT (partido_id, jugador_id) DO UPDATE SET
      po = EXCLUDED.po, a = EXCLUDED.a, e = EXCLUDED.e, dp = EXCLUDED.dp,
      extras = EXCLUDED.extras, updated_at = NOW();

    INSERT INTO sync_registros (
      fuente, pestaña, clave_externa, lab_hash, sheet_hash, last_synced_at
    )
    SELECT
      'google_sheets', item.pestaña, item.clave_externa,
      item.lab_hash, item.sheet_hash, NOW()
    FROM jsonb_to_recordset(COALESCE(p_sync, '[]'::jsonb)) AS item(
      pestaña TEXT, clave_externa TEXT, lab_hash TEXT, sheet_hash TEXT
    )
    ON CONFLICT (fuente, pestaña, clave_externa) DO UPDATE SET
      lab_hash = EXCLUDED.lab_hash,
      sheet_hash = EXCLUDED.sheet_hash,
      last_synced_at = NOW();

    UPDATE import_lotes
    SET estado = 'aplicado', applied_at = NOW(),
        resumen = resumen || jsonb_build_object('appliedRows', applied_rows)
    WHERE id = p_lote_id
    RETURNING * INTO lote;

    RETURN jsonb_build_object(
      'status', 'applied',
      'id', lote.id,
      'estado', lote.estado,
      'applied_at', lote.applied_at,
      'appliedRows', applied_rows
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

REVOKE ALL ON FUNCTION public.create_google_sheets_preview(TEXT, JSONB, JSONB, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.apply_google_sheets_batch(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_google_sheets_preview(TEXT, JSONB, JSONB, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.apply_google_sheets_batch(UUID, JSONB, JSONB, JSONB, JSONB, JSONB) TO authenticated, service_role;
