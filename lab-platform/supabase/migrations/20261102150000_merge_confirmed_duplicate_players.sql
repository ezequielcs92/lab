-- Merge player identities that the client confirmed are the same person (2026-11-02):
--   * Jacinto Cipriota: the seasonless DAOM profile joins the identity that already holds his
--     2017 DAOM and 2018/2019 Falcons history.
--   * Pedro (Agustín) Figueras: the seasonless Arias profile "Agustín Figueras (R)" joins the
--     identity of the 2019 Arias profile "Pedro Figueras".
-- Only stable_id changes. Every player row, inscription and statistic is kept, and each link is
-- recorded in jugador_identidad_merge_audit. Re-running the migration changes nothing.
SET LOCAL lock_timeout = '30s';

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

CREATE TEMP TABLE confirmed_player_merges (
  source_jugador_id UUID PRIMARY KEY,
  stable_id_anterior UUID NOT NULL,
  stable_id_canonico UUID NOT NULL
) ON COMMIT DROP;

INSERT INTO confirmed_player_merges (source_jugador_id, stable_id_anterior, stable_id_canonico) VALUES
  -- Jacinto Cipriota, DAOM, seasonless -> identity of the 2017 DAOM / 2018-2019 Falcons profiles
  ('1892f5df-11bc-4871-a1d2-69ba0f99352c', 'dd341ad7-5de2-5c5c-bb8a-45ef46b728c2', '99c6bf4b-e269-5faf-b5d3-1f35002b8261'),
  -- Agustín Figueras (R), Arias, seasonless -> identity of Pedro Figueras, Arias 2019
  ('13fd2ae1-c019-4483-a134-b9dcffe229c8', '5fb32311-328a-5ee3-8a1d-560c6f91311e', '283a5211-d4a2-5438-b5e4-fb5791322baf');

-- Only rows that still carry the old identity, and only when the target identity exists.
CREATE TEMP TABLE pending_player_merges ON COMMIT DROP AS
SELECT merge.*, player.nombre, player.club_id
FROM confirmed_player_merges merge
JOIN public.jugadores player
  ON player.id = merge.source_jugador_id AND player.stable_id = merge.stable_id_anterior
WHERE EXISTS (SELECT 1 FROM public.jugadores target WHERE target.stable_id = merge.stable_id_canonico);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pending_player_merges merge
    JOIN public.jugadores other
      ON other.stable_id = merge.stable_id_canonico
     AND other.club_id = merge.club_id
     AND other.temporada_id IS NULL
     AND other.id <> merge.source_jugador_id
  ) THEN
    RAISE EXCEPTION 'La identidad destino ya tiene un perfil sin temporada en el mismo club';
  END IF;
END $$;

ALTER TABLE public.jugadores DISABLE TRIGGER tr_jugadores_stable_id;

INSERT INTO public.jugador_identidad_merge_audit (
  source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id, criterio
)
SELECT source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id, 'confirmed_by_client_2026-11-02'
FROM pending_player_merges
ON CONFLICT (source_jugador_id) DO NOTHING;

UPDATE public.jugadores player
SET stable_id = merge.stable_id_canonico,
    updated_at = NOW()
FROM pending_player_merges merge
WHERE player.id = merge.source_jugador_id
  AND player.stable_id = merge.stable_id_anterior;

ALTER TABLE public.jugadores ENABLE TRIGGER tr_jugadores_stable_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pending_player_merges merge
    JOIN public.jugadores player ON player.id = merge.source_jugador_id
    WHERE player.stable_id IS DISTINCT FROM merge.stable_id_canonico
  ) THEN
    RAISE EXCEPTION 'La verificación de identidades fusionadas falló';
  END IF;
END $$;
