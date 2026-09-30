-- Link seasonless roster profiles to the unique 2017/2018 identity matching
-- their normalized name and club. Preserve all player rows and log every link.
SET LOCAL lock_timeout = '30s';
SET LOCAL search_path = public, extensions;

CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions;

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

CREATE TEMP TABLE player_identity_merge_matches ON COMMIT DROP AS
WITH normalized AS (
  SELECT
    j.id,
    j.stable_id,
    j.nombre,
    j.club_id,
    j.temporada_id,
    lower(regexp_replace(unaccent(btrim(j.nombre)), '\s+', ' ', 'g')) AS nombre_normalizado
  FROM public.jugadores j
)
SELECT
  source.id AS source_jugador_id,
  source.stable_id AS stable_id_anterior,
  source.nombre,
  source.club_id,
  COUNT(DISTINCT historical.stable_id)::INTEGER AS cantidad_identidades_historicas,
  MIN(historical.stable_id::TEXT)::UUID AS stable_id_canonico
FROM normalized source
JOIN normalized historical
  ON historical.club_id = source.club_id
  AND historical.temporada_id IS NOT NULL
  AND historical.nombre_normalizado = source.nombre_normalizado
JOIN public.temporadas season ON season.id = historical.temporada_id
WHERE source.temporada_id IS NULL
  AND season.anio IN (2017, 2018)
GROUP BY source.id, source.stable_id, source.nombre, source.club_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM player_identity_merge_matches
    WHERE cantidad_identidades_historicas <> 1
  ) THEN
    RAISE EXCEPTION 'Hay perfiles sin temporada con más de una identidad histórica candidata; no se fusionó ningún registro';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM player_identity_merge_matches candidate
    JOIN public.jugadores existing
      ON existing.stable_id = candidate.stable_id_canonico
      AND existing.club_id = candidate.club_id
      AND existing.temporada_id IS NULL
      AND existing.id <> candidate.source_jugador_id
    WHERE candidate.stable_id_anterior <> candidate.stable_id_canonico
  ) THEN
    RAISE EXCEPTION 'La fusión generaría dos perfiles sin temporada para la misma identidad y club';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM player_identity_merge_matches
    WHERE stable_id_anterior <> stable_id_canonico
    GROUP BY stable_id_canonico, club_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'La fusión generaría múltiples perfiles sin temporada de la misma identidad y club';
  END IF;
END;
$$;

CREATE TEMP TABLE player_identity_merge_candidates ON COMMIT DROP AS
SELECT *
FROM player_identity_merge_matches
WHERE cantidad_identidades_historicas = 1
  AND stable_id_anterior <> stable_id_canonico;

ALTER TABLE public.jugadores DISABLE TRIGGER tr_jugadores_stable_id;

INSERT INTO public.jugador_identidad_merge_audit (
  source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id
)
SELECT source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id
FROM player_identity_merge_candidates
ON CONFLICT (source_jugador_id) DO NOTHING;

UPDATE public.jugadores player
SET stable_id = candidate.stable_id_canonico,
    updated_at = NOW()
FROM player_identity_merge_candidates candidate
WHERE player.id = candidate.source_jugador_id
  AND player.stable_id = candidate.stable_id_anterior;

ALTER TABLE public.jugadores ENABLE TRIGGER tr_jugadores_stable_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jugadores_stable_season_club
  ON public.jugadores (stable_id, temporada_id, club_id)
  WHERE temporada_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_jugadores_stable_unassigned_club
  ON public.jugadores (stable_id, club_id)
  WHERE temporada_id IS NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.jugador_identidad_merge_audit audit
    JOIN public.jugadores player ON player.id = audit.source_jugador_id
    WHERE player.stable_id IS DISTINCT FROM audit.stable_id_canonico
  ) THEN
    RAISE EXCEPTION 'La verificación de identidades fusionadas falló';
  END IF;
END;
$$;
