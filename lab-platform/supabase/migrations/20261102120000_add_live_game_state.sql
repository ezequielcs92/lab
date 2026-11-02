-- Estado manual de un partido en vivo: inning actual, mitad, hits y errores.
-- Columnas aditivas y nulas: no alteran partidos, marcadores ni estadísticas existentes.
ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS inning_actual SMALLINT,
  ADD COLUMN IF NOT EXISTS mitad_inning TEXT,
  ADD COLUMN IF NOT EXISTS hits_local SMALLINT,
  ADD COLUMN IF NOT EXISTS hits_visitante SMALLINT,
  ADD COLUMN IF NOT EXISTS errores_local SMALLINT,
  ADD COLUMN IF NOT EXISTS errores_visitante SMALLINT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_inning_actual') THEN
    ALTER TABLE partidos ADD CONSTRAINT chk_partidos_inning_actual
      CHECK (inning_actual IS NULL OR inning_actual BETWEEN 1 AND 30);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_mitad_inning') THEN
    ALTER TABLE partidos ADD CONSTRAINT chk_partidos_mitad_inning
      CHECK (mitad_inning IS NULL OR (mitad_inning IN ('alta', 'baja') AND inning_actual IS NOT NULL));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_partidos_hits_errores') THEN
    ALTER TABLE partidos ADD CONSTRAINT chk_partidos_hits_errores
      CHECK (
        (hits_local IS NULL OR hits_local >= 0)
        AND (hits_visitante IS NULL OR hits_visitante >= 0)
        AND (errores_local IS NULL OR errores_local >= 0)
        AND (errores_visitante IS NULL OR errores_visitante >= 0)
      );
  END IF;
END $$;
