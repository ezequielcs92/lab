-- =============================================================
-- Limpieza de datos de prueba deportivos
-- Deja páginas públicas de fixture/tabla/estadísticas sin información
-- =============================================================

-- Fixture y posiciones
DELETE FROM posiciones;
DELETE FROM partidos;

-- Estadísticas individuales de jugadores
UPDATE jugadores
SET
  avg = NULL,
  hr = NULL,
  rbi = NULL,
  era = NULL,
  w = NULL,
  l = NULL,
  so = NULL,
  bb = NULL,
  h = NULL,
  ab = NULL,
  r = NULL,
  sb = NULL,
  obp = NULL,
  slg = NULL,
  ip = NULL;
