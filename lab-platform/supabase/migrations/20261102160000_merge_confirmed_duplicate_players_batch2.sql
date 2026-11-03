-- Merge the duplicate player identities that the client confirmed on 2026-11-02 (all the pairs
-- listed below are the same person, plus Pedro Agustín Figueras across Arias, Patriots and DAOM).
-- The BallClubz 2023-2025 load could not link them because the stored name lacked the middle name
-- or the full surname. Only stable_id changes, for every row of the old identity in that club:
-- every profile, inscription and statistic is kept, and each row is recorded in
-- jugador_identidad_merge_audit. Re-running the migration changes nothing.
-- The explicit transaction keeps the temporary tables alive when it is pasted in the SQL editor.
BEGIN;
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

CREATE TEMP TABLE confirmed_identity_merges (
  stable_id_anterior UUID NOT NULL,
  stable_id_canonico UUID NOT NULL,
  club_id UUID NOT NULL
) ON COMMIT DROP;

INSERT INTO confirmed_identity_merges (stable_id_anterior, stable_id_canonico, club_id) VALUES
  -- arias: Nicolás Bou [sin] -> Nicolas Bou [2019]
  ('70bab307-d871-5971-941b-ffe79972e57f', 'd2205ac5-49d2-5209-9df1-cd0f2fe024b6', '849602c7-fe7e-4fca-a941-4f67495d4aa7'),
  -- arias: Tanco Agustin Jose [2024,2025] -> Agustin Tanco / Agustín Tanco [2017,2018,2019,sin]
  ('b44a8bbd-1e1d-5878-a9d8-c10ef53f96ba', '1806e063-aec7-5c38-af47-f561a796ea06', '849602c7-fe7e-4fca-a941-4f67495d4aa7'),
  -- arias: Tanco Federico Jos [2025] -> Federico Tanco [2017,2018,2019,sin]
  ('c96fac0e-5fa3-58ad-a04b-ca743c3c9062', 'bb996b80-a97d-5762-9fec-8a3b544944af', '849602c7-fe7e-4fca-a941-4f67495d4aa7'),
  -- cachorros: Cortese Tomas Nahu [2025] -> Tomás Cortese [2024,sin]
  ('2415bf69-529f-5e4a-8a9e-cda4c0c48bc7', 'ecaef790-cfdf-5759-b175-3b31c71f1571', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Facundo Em Pizarro [2023] -> Facundo Pizarro [2017,2018,2019]
  ('f2249a7f-db49-5154-8800-2a309ada03b0', '199e6db9-8ee7-5079-9964-8cddb5a27840', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Jorge Guzmán Ortega [2024,2025,sin] -> Jorge Guzman [2017,2018,2019]
  ('367dc265-2d8e-54f5-ad18-ace8c4b9b9ec', '774b8b7c-eea3-580f-8fd5-2da8f03abeb1', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Juan Ignacio Turlione [2024,sin] -> Juan Turlione [2017,2018,2019]
  ('0fec5be5-7d6e-57c2-9cbd-163356f64968', '2b273a16-8847-55eb-96de-59247cf89ae7', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Leonardo Blanco Reyes [2019] -> Leonardo Blanco [2018]
  ('4316234b-d377-5d0e-9679-3f930b2acb37', 'a60376fa-5f20-5de4-97fc-41e46bc44756', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Lucas F Rementeria [2025] -> Lucas Rementeria [2023,2024]
  ('5fe6352b-ef49-58b7-82ef-329888119e66', 'f71588b9-c2a8-5f07-b89c-e7c0848a9d2b', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Samuel Moisés Cortez Peña [sin] -> Cortez Samuel [2025]
  ('57862d05-f25c-5f97-8e58-f5eaece19e6b', '702acb61-b77e-5372-93f6-e8470bae2e6b', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- cachorros: Schiavoni Mauro Se [2024,2025] -> Mauro Schiavoni [2017,2018,2019]
  ('383f0f47-d70f-503d-9c0d-721347115167', '932e4519-f509-54d1-b7d8-db5e42365024', 'cd5c00dc-c234-4737-add3-13de5405de8d'),
  -- falcons: Sciarroni Marco [2024,2025] -> Sciarroni Marcos [2023]
  ('307bfe99-b608-59ac-ac3e-835cda479e85', 'fa151db8-67ee-57b7-89d8-6ede9f8b4420', '0271e102-c140-473c-8dff-6122f120f87d'),
  -- Infernales: Borrino Agustin Da [2025] -> Agustin Borrino [2019]
  ('cf0c0562-7dc4-5481-bcf6-cfbd54cacd0d', '241345d4-5406-5666-b2b1-c4bf08bc57a8', 'db02195a-dc8c-4c88-82da-512817fa634f'),
  -- Infernales: Jose Maximil Gerez [2023,2024] -> Jose Gerez / José Gerez [2017,2018,2019,sin]
  ('e0730ad4-4622-5697-99aa-4043fb1bc1f8', 'c94cfbf5-39b9-56c7-b303-92824d423991', 'db02195a-dc8c-4c88-82da-512817fa634f'),
  -- Infernales: Martín Cruz [sin] -> Martin Vicent Cruz [2023,2024,2025]
  ('7f211c2a-626e-5f02-bfdb-b0c293abab82', '4c602a1a-aae5-5e7e-ad03-32efd093e4cd', 'db02195a-dc8c-4c88-82da-512817fa634f'),
  -- Infernales: Mateo Santiago Gerez [sin] -> Gerez Mateo [2023,2024,2025]
  ('55f27236-c5ef-51b5-8f13-2e49e95de4bb', 'ffc664f9-fb38-5f03-a544-ff9e7cae76da', 'db02195a-dc8c-4c88-82da-512817fa634f'),
  -- patriots: Julián Carrol [sin] -> Carroll Julian [2024,2025]
  ('1ced3d22-d147-503e-a522-dda3d4f81d4b', '8473b7d5-f261-5357-adcd-043aa2e51e4d', '64cbffbf-7f3f-45f2-9d92-0ecb0c7a221d'),
  -- patriots: Pedro Agu Figueras [2023,2024,2025] -> Agustín Figueras (R) / Pedro Figueras [2019,sin]
  ('6ef0aec0-a8c4-5dbc-aefe-7869244eb3e3', '283a5211-d4a2-5438-b5e4-fb5791322baf', '64cbffbf-7f3f-45f2-9d92-0ecb0c7a221d');

-- Rows that still carry the old identity, only when the canonical identity exists in the database.
CREATE TEMP TABLE pending_identity_merges ON COMMIT DROP AS
SELECT player.id AS source_jugador_id, merge.stable_id_anterior, merge.stable_id_canonico,
       player.nombre, player.club_id, player.temporada_id
FROM confirmed_identity_merges merge
JOIN public.jugadores player
  ON player.stable_id = merge.stable_id_anterior AND player.club_id = merge.club_id
WHERE EXISTS (SELECT 1 FROM public.jugadores target WHERE target.stable_id = merge.stable_id_canonico);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pending_identity_merges pending
    JOIN public.jugadores other
      ON other.stable_id = pending.stable_id_canonico
     AND other.club_id = pending.club_id
     AND other.temporada_id IS NOT DISTINCT FROM pending.temporada_id
  ) THEN
    RAISE EXCEPTION 'La identidad destino ya tiene una inscripción en la misma temporada y club';
  END IF;
END $$;

ALTER TABLE public.jugadores DISABLE TRIGGER tr_jugadores_stable_id;

INSERT INTO public.jugador_identidad_merge_audit (
  source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id, criterio
)
SELECT source_jugador_id, stable_id_anterior, stable_id_canonico, nombre, club_id, 'confirmed_by_client_2026-11-02'
FROM pending_identity_merges
ON CONFLICT (source_jugador_id) DO NOTHING;

UPDATE public.jugadores player
SET stable_id = pending.stable_id_canonico,
    updated_at = NOW()
FROM pending_identity_merges pending
WHERE player.id = pending.source_jugador_id
  AND player.stable_id = pending.stable_id_anterior;

ALTER TABLE public.jugadores ENABLE TRIGGER tr_jugadores_stable_id;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pending_identity_merges pending
    JOIN public.jugadores player ON player.id = pending.source_jugador_id
    WHERE player.stable_id IS DISTINCT FROM pending.stable_id_canonico
  ) THEN
    RAISE EXCEPTION 'La verificación de identidades fusionadas falló';
  END IF;
END $$;

COMMIT;
