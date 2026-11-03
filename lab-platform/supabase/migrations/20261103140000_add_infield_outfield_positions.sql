-- Players who can cover any infield or any outfield spot get their own positions (INF / OF).
-- Safe to run more than once.
ALTER TYPE public.posicion_jugador ADD VALUE IF NOT EXISTS 'infield' AFTER 'shortstop';
ALTER TYPE public.posicion_jugador ADD VALUE IF NOT EXISTS 'outfield' AFTER 'right_field';
