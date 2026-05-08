-- Add staff category so each club can manage Cuerpo Tecnico and Autoridades separately.
ALTER TABLE public.staff_clubes
ADD COLUMN IF NOT EXISTS categoria text;

UPDATE public.staff_clubes
SET categoria = CASE
  WHEN lower(cargo) LIKE '%president%'
    OR lower(cargo) LIKE '%vicepresident%'
    OR lower(cargo) LIKE '%director%'
    OR lower(cargo) LIKE '%tesorer%'
    OR lower(cargo) LIKE '%secretari%'
    OR lower(cargo) LIKE '%vocal%'
    OR lower(cargo) LIKE '%comision%'
  THEN 'autoridades'
  ELSE 'cuerpo_tecnico'
END
WHERE categoria IS NULL;

ALTER TABLE public.staff_clubes
ALTER COLUMN categoria SET DEFAULT 'cuerpo_tecnico';

ALTER TABLE public.staff_clubes
ALTER COLUMN categoria SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'staff_clubes_categoria_check'
  ) THEN
    ALTER TABLE public.staff_clubes
    ADD CONSTRAINT staff_clubes_categoria_check
    CHECK (categoria IN ('cuerpo_tecnico', 'autoridades'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_clubes_club_categoria_orden
ON public.staff_clubes (club_id, categoria, orden);
