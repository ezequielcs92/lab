-- Prueba transaccional: no conserva usuarios, lotes ni partidos.
BEGIN;

SELECT set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
INSERT INTO auth.users (id) VALUES ('11111111-1111-4111-8111-111111111111');
INSERT INTO perfiles (id, nombre, rol)
VALUES ('11111111-1111-4111-8111-111111111111', 'Atomic Test', 'admin_liga');

CREATE TEMP TABLE sheets_atomic_test (
  case_name TEXT PRIMARY KEY,
  lote_id UUID NOT NULL,
  first_status TEXT,
  retry_status TEXT
);

INSERT INTO sheets_atomic_test (case_name, lote_id)
VALUES (
  'success',
  (create_google_sheets_preview('preview', '{"test":true}'::jsonb, '[]'::jsonb, NULL)->>'id')::uuid
), (
  'rollback',
  (create_google_sheets_preview('preview', '{"test":true}'::jsonb, '[]'::jsonb, NULL)->>'id')::uuid
);

UPDATE sheets_atomic_test
SET first_status = apply_google_sheets_batch(lote_id, '[]', '[]', '[]', '[]', '[]')->>'status'
WHERE case_name = 'success';

UPDATE sheets_atomic_test
SET retry_status = apply_google_sheets_batch(lote_id, '[]', '[]', '[]', '[]', '[]')->>'status'
WHERE case_name = 'success';

UPDATE sheets_atomic_test
SET first_status = apply_google_sheets_batch(
  lote_id,
  jsonb_build_array(jsonb_build_object(
    'id', '22222222-2222-4222-8222-222222222222',
    'temporada_id', (SELECT id FROM temporadas WHERE activa LIMIT 1),
    'external_source', 'google_sheets',
    'external_key', 'atomic-test-invalid',
    'local_id', '33333333-3333-4333-8333-333333333333',
    'visitante_id', '44444444-4444-4444-8444-444444444444',
    'fecha_hora', NOW(),
    'estado', 'programado',
    'fase', 'regular',
    'marcador_innings', '[]'::jsonb
  )),
  '[]', '[]', '[]', '[]'
)->>'status'
WHERE case_name = 'rollback';

DO $$
DECLARE
  success_row sheets_atomic_test%ROWTYPE;
  rollback_row sheets_atomic_test%ROWTYPE;
BEGIN
  SELECT * INTO success_row FROM sheets_atomic_test WHERE case_name = 'success';
  SELECT * INTO rollback_row FROM sheets_atomic_test WHERE case_name = 'rollback';

  IF success_row.first_status <> 'applied' OR success_row.retry_status <> 'already_applied' THEN
    RAISE EXCEPTION 'La aplicacion idempotente no devolvio los estados esperados';
  END IF;
  IF rollback_row.first_status <> 'failed' THEN
    RAISE EXCEPTION 'El lote invalido no fallo como se esperaba';
  END IF;
  IF EXISTS (SELECT 1 FROM partidos WHERE external_source = 'google_sheets' AND external_key = 'atomic-test-invalid') THEN
    RAISE EXCEPTION 'La transaccion dejo un partido parcial';
  END IF;
  IF (SELECT estado FROM import_lotes WHERE id = rollback_row.lote_id) <> 'fallido' THEN
    RAISE EXCEPTION 'El lote fallido no quedo auditado';
  END IF;
END;
$$;

SELECT
  case_name,
  first_status,
  retry_status,
  (SELECT estado FROM import_lotes WHERE id = test.lote_id) AS lote_estado
FROM sheets_atomic_test test
ORDER BY case_name;

ROLLBACK;
