-- ============================================================
-- Liga Argentina de Beisbol - Clubes historicos 2017/2018
-- Aguilas y Condores se resuelven en el importador como aliases.
-- Pampas y Pumas conservan identidad de club independiente.
-- ============================================================

INSERT INTO clubes (nombre, slug, nombre_corto, colores, activo)
VALUES
  ('Arias', 'arias', 'Arias', '{"primario":"#C8102E","secundario":"#FFD700","acento":"#FFFFFF"}', true),
  ('Falcons', 'falcons', 'Falcons', '{"primario":"#1A3A6B","secundario":"#5AABDF","acento":"#FFFFFF"}', true),
  ('Pampas', 'pampas', 'Pampas', '{"primario":"#5B6770","secundario":"#FFFFFF","acento":"#C8102E"}', true),
  ('Pumas', 'pumas', 'Pumas', '{"primario":"#1B5E20","secundario":"#FDD835","acento":"#FFFFFF"}', true)
ON CONFLICT (slug) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  nombre_corto = EXCLUDED.nombre_corto,
  colores = EXCLUDED.colores,
  activo = true;
