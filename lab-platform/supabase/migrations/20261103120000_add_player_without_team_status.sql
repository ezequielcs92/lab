-- Players who retired or are not playing this year keep their club, history and statistics,
-- but must not appear in the public rosters. The status lives on every row of the person
-- (all rows sharing stable_id); NULL means the player is on a team as usual.
ALTER TABLE public.jugadores
  ADD COLUMN IF NOT EXISTS sin_equipo_motivo TEXT;

ALTER TABLE public.jugadores
  DROP CONSTRAINT IF EXISTS jugadores_sin_equipo_motivo_check;

ALTER TABLE public.jugadores
  ADD CONSTRAINT jugadores_sin_equipo_motivo_check
  CHECK (sin_equipo_motivo IS NULL OR sin_equipo_motivo IN ('retirado', 'no_juega'));

COMMENT ON COLUMN public.jugadores.sin_equipo_motivo IS
  'NULL = on a team. retirado / no_juega = hidden from public rosters; history and stats are kept.';
