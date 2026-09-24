-- ============================================================
-- Normaliza slugs heredados y fusiona clubes duplicados
-- ============================================================

CREATE TEMP TABLE club_merge_map (old_id UUID PRIMARY KEY, canonical_id UUID NOT NULL);

INSERT INTO club_merge_map (old_id, canonical_id)
SELECT legacy.id, canonical.id
FROM clubes legacy
JOIN clubes canonical ON canonical.slug = LOWER(legacy.slug)
WHERE legacy.slug IN ('Docta', 'Falcons')
  AND legacy.id <> canonical.id;

UPDATE clubes canonical
SET
  historia = COALESCE(canonical.historia, legacy.historia),
  fundacion = COALESCE(canonical.fundacion, legacy.fundacion),
  sede = COALESCE(canonical.sede, legacy.sede),
  estadio_nombre = COALESCE(canonical.estadio_nombre, legacy.estadio_nombre),
  estadio_coords = COALESCE(canonical.estadio_coords, legacy.estadio_coords),
  colores = COALESCE(legacy.colores, canonical.colores),
  logo_url = COALESCE(canonical.logo_url, legacy.logo_url),
  banner_url = COALESCE(canonical.banner_url, legacy.banner_url),
  contacto_email = COALESCE(canonical.contacto_email, legacy.contacto_email),
  redes_sociales = CASE
    WHEN canonical.redes_sociales = '{}'::jsonb THEN legacy.redes_sociales
    ELSE canonical.redes_sociales
  END,
  updated_at = NOW()
FROM club_merge_map mapping
JOIN clubes legacy ON legacy.id = mapping.old_id
WHERE canonical.id = mapping.canonical_id;

UPDATE archivo_historico row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE estadisticas_bateo row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE estadisticas_fildeo row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE estadisticas_pitcheo row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE galeria_clubes row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE jugadores row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE noticias row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE partidos row SET local_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.local_id = mapping.old_id;
UPDATE partidos row SET visitante_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.visitante_id = mapping.old_id;
UPDATE perfiles row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE posiciones row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE posiciones_ajustes row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE staff_clubes row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;
UPDATE temporada_clubes row SET club_id = mapping.canonical_id FROM club_merge_map mapping WHERE row.club_id = mapping.old_id;

DELETE FROM clubes WHERE id IN (SELECT old_id FROM club_merge_map);
DROP TABLE club_merge_map;

UPDATE clubes SET slug = LOWER(slug), updated_at = NOW() WHERE slug IN ('Patriots', 'Velez');

UPDATE clubes
SET activo = slug IN ('docta', 'infernales', 'cachorros', 'daom', 'patriots', 'velez'),
    updated_at = NOW()
WHERE slug IN ('docta', 'infernales', 'cachorros', 'daom', 'patriots', 'velez', 'arias', 'falcons', 'pampas', 'pumas');

INSERT INTO temporada_clubes (temporada_id, club_id, division_id, visible)
SELECT t.id, c.id, d.id, true
FROM temporadas t
JOIN (VALUES
  ('docta', 'Norte'), ('infernales', 'Norte'), ('cachorros', 'Norte'),
  ('daom', 'Capital'), ('patriots', 'Capital'), ('velez', 'Capital')
) AS membership(slug, division) ON true
JOIN clubes c ON c.slug = membership.slug
JOIN divisiones d ON d.temporada_id = t.id AND d.nombre = membership.division
WHERE t.anio = 2026
ON CONFLICT (temporada_id, club_id) DO UPDATE SET division_id = EXCLUDED.division_id, visible = true;

SELECT recalculate_standings(id) FROM temporadas WHERE anio = 2026;
