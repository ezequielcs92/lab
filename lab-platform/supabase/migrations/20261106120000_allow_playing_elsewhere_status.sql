-- A duplicated or transferred player can still appear on the roster of a club he no longer belongs to.
-- "otro_equipo" hides that single inscription from the public roster of that club (the other
-- inscriptions of the same person are not touched) while keeping its history and statistics.
ALTER TABLE public.jugadores
  DROP CONSTRAINT IF EXISTS jugadores_sin_equipo_motivo_check;

ALTER TABLE public.jugadores
  ADD CONSTRAINT jugadores_sin_equipo_motivo_check
  CHECK (sin_equipo_motivo IS NULL OR sin_equipo_motivo IN ('retirado', 'no_juega', 'otro_equipo'));

COMMENT ON COLUMN public.jugadores.sin_equipo_motivo IS
  'NULL = on a team. retirado / no_juega = person hidden from every public roster (set on all their rows). otro_equipo = only this inscription is hidden because the player now plays for another club. History and stats are kept.';
