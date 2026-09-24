-- Prueba transaccional: no conserva usuarios, jugadores, lotes ni partidos.
BEGIN;

SELECT set_config('request.jwt.claim.sub', '51111111-1111-4111-8111-111111111111', true);
INSERT INTO auth.users (id) VALUES ('51111111-1111-4111-8111-111111111111');
INSERT INTO perfiles (id, nombre, rol)
VALUES ('51111111-1111-4111-8111-111111111111', 'BallClubz Test', 'admin_liga');

CREATE TEMP TABLE ballclubz_refs AS
SELECT
  (SELECT id FROM temporadas WHERE activa LIMIT 1) AS season_id,
  (SELECT tc.club_id FROM temporada_clubes tc JOIN temporadas t ON t.id = tc.temporada_id WHERE t.activa AND tc.visible ORDER BY tc.club_id LIMIT 1) AS visitor_club_id,
  (SELECT tc.club_id FROM temporada_clubes tc JOIN temporadas t ON t.id = tc.temporada_id WHERE t.activa AND tc.visible ORDER BY tc.club_id OFFSET 1 LIMIT 1) AS home_club_id;

INSERT INTO jugadores (id, nombre, slug, posicion, club_id, temporada_id, activo)
SELECT '52222222-2222-4222-8222-222222222222', 'Visitor Test', 'ballclubz-visitor-test', 'utility', visitor_club_id, season_id, true
FROM ballclubz_refs;
INSERT INTO jugadores (id, nombre, slug, posicion, club_id, temporada_id, activo)
SELECT '53333333-3333-4333-8333-333333333333', 'Home Test', 'ballclubz-home-test', 'utility', home_club_id, season_id, true
FROM ballclubz_refs;

CREATE TEMP TABLE ballclubz_lotes (name TEXT PRIMARY KEY, id UUID, status TEXT, retry_status TEXT);
INSERT INTO import_lotes (fuente, temporada_id, estado, resumen)
SELECT 'ballclubz', season_id, 'preview', '{"test":true}'::jsonb FROM ballclubz_refs
RETURNING id;

INSERT INTO ballclubz_lotes (name, id)
SELECT 'first', id FROM import_lotes WHERE fuente = 'ballclubz' ORDER BY created_at DESC LIMIT 1;

DO $$
DECLARE lote UUID; result JSONB; refs ballclubz_refs%ROWTYPE;
BEGIN
  SELECT id INTO lote FROM ballclubz_lotes WHERE name = 'first';
  SELECT * INTO refs FROM ballclubz_refs;
  result := apply_ballclubz_game(
    lote,
    jsonb_build_object(
      'id', '54444444-4444-4444-8444-444444444444', 'temporada_id', refs.season_id,
      'external_key', 'ballclubz:test:boxscore:1', 'fecha_numero', 1,
      'local_id', refs.home_club_id, 'visitante_id', refs.visitor_club_id,
      'fecha_hora', '2026-09-23T18:00:00Z', 'estadio', 'Test', 'fase', 'regular',
      'marcador_local', 1, 'marcador_visitante', 2,
      'marcador_innings', '[{"inning":1,"local":1,"visitante":2}]'::jsonb
    ),
    '[{"jugador_id":"52222222-2222-4222-8222-222222222222","club_id":"00000000-0000-0000-0000-000000000000","orden_bateo":1,"ab":1,"r":1,"h":1,"doble":0,"triple":0,"hr":0,"rbi":0,"bb":0,"so":0,"sb":0,"cs":0,"sf":0,"hbp":0,"extras":{}}]'::jsonb,
    '[]'::jsonb, '[]'::jsonb
  );
  UPDATE ballclubz_lotes SET status = result->>'status' WHERE id = lote;
END;
$$;

-- Reemplazar el club ficticio del payload por el club real y reintentar en un lote nuevo.
-- La primera llamada debe fallar completa y no dejar el partido parcial.
DO $$
DECLARE first_lote UUID;
BEGIN
  SELECT id INTO first_lote FROM ballclubz_lotes WHERE name = 'first';
  IF (SELECT status FROM ballclubz_lotes WHERE name = 'first') <> 'failed' THEN
    RAISE EXCEPTION 'El lote invalido no fallo';
  END IF;
  IF EXISTS (SELECT 1 FROM partidos WHERE external_source = 'ballclubz' AND external_key = 'ballclubz:test:boxscore:1') THEN
    RAISE EXCEPTION 'El lote invalido dejo un partido parcial';
  END IF;
  IF (SELECT estado FROM import_lotes WHERE id = first_lote) <> 'fallido' THEN
    RAISE EXCEPTION 'El lote fallido no quedo auditado';
  END IF;
END;
$$;

INSERT INTO import_lotes (fuente, temporada_id, estado, resumen)
SELECT 'ballclubz', season_id, 'preview', '{"test":true}'::jsonb FROM ballclubz_refs;
INSERT INTO ballclubz_lotes (name, id)
SELECT 'success', id FROM import_lotes WHERE fuente = 'ballclubz' AND estado = 'preview' ORDER BY created_at DESC LIMIT 1;

DO $$
DECLARE lote UUID; result JSONB; retry JSONB; refs ballclubz_refs%ROWTYPE;
BEGIN
  SELECT id INTO lote FROM ballclubz_lotes WHERE name = 'success';
  SELECT * INTO refs FROM ballclubz_refs;
  result := apply_ballclubz_game(
    lote,
    jsonb_build_object(
      'id', '54444444-4444-4444-8444-444444444444', 'temporada_id', refs.season_id,
      'external_key', 'ballclubz:test:boxscore:1', 'fecha_numero', 1,
      'local_id', refs.home_club_id, 'visitante_id', refs.visitor_club_id,
      'fecha_hora', '2026-09-23T18:00:00Z', 'estadio', 'Test', 'fase', 'regular',
      'marcador_local', 1, 'marcador_visitante', 2,
      'marcador_innings', '[{"inning":1,"local":1,"visitante":2}]'::jsonb
    ),
    jsonb_build_array(jsonb_build_object(
      'jugador_id', '52222222-2222-4222-8222-222222222222', 'club_id', refs.visitor_club_id,
      'orden_bateo', 1, 'ab', 1, 'r', 1, 'h', 1, 'doble', 0, 'triple', 0,
      'hr', 0, 'rbi', 0, 'bb', 0, 'so', 0, 'sb', 0, 'cs', 0, 'sf', 0, 'hbp', 0, 'extras', '{}'::jsonb
    )),
    '[]'::jsonb,
    jsonb_build_array(jsonb_build_object(
      'jugador_id', '52222222-2222-4222-8222-222222222222', 'club_id', refs.visitor_club_id,
      'po', 1, 'a', 0, 'e', 0, 'dp', 0, 'extras', '{}'::jsonb
    ))
  );
  IF result->>'status' <> 'applied' THEN
    RAISE EXCEPTION 'La importacion valida fallo: %', result->>'error';
  END IF;
  retry := apply_ballclubz_game(lote, '{}'::jsonb, '[]', '[]', '[]');
  UPDATE ballclubz_lotes SET status = result->>'status', retry_status = retry->>'status' WHERE id = lote;
END;
$$;

DO $$
BEGIN
  IF (SELECT status FROM ballclubz_lotes WHERE name = 'success') <> 'applied'
     OR (SELECT retry_status FROM ballclubz_lotes WHERE name = 'success') <> 'already_applied' THEN
    RAISE EXCEPTION 'La importacion BallClubz no fue idempotente';
  END IF;
  IF (SELECT COUNT(*) FROM partidos WHERE external_source = 'ballclubz' AND external_key = 'ballclubz:test:boxscore:1') <> 1 THEN
    RAISE EXCEPTION 'Cantidad inesperada de partidos BallClubz';
  END IF;
  IF (SELECT COUNT(*) FROM estadisticas_bateo b JOIN partidos p ON p.id = b.partido_id WHERE p.external_key = 'ballclubz:test:boxscore:1') <> 1 THEN
    RAISE EXCEPTION 'Cantidad inesperada de filas de bateo';
  END IF;
END;
$$;

SELECT name, status, retry_status FROM ballclubz_lotes ORDER BY name;
ROLLBACK;
