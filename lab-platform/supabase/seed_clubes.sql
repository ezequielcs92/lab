-- =============================================================
-- LAB - Seed de Clubes Reales
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================

-- Limpiar datos de clubes de prueba existentes
DELETE FROM clubes;

-- ============================================================
-- FALCONS (Dolphins Béisbol Club - Córdoba)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, contacto_email, redes_sociales, activo)
VALUES (
  'Falcons',
  'falcons',
  'Falcons',
  'Dolphins Béisbol Club Córdoba es una de las principales instituciones dedicadas al desarrollo del béisbol en la provincia. Desde sus inicios, en 1995, el club se enfocó en la formación de jugadores y en la difusión del deporte en la región, consolidándose como un referente local. A lo largo de los años, la institución ha trabajado en el crecimiento de sus divisiones formativas y en la participación en competencias nacionales. Con una base sólida de jugadores formados en el club y refuerzos estratégicos, participa activamente en distintas competencias nacionales y regionales. Campeón de la Liga Argentina de Béisbol en 2018, 2021 y 2022.',
  1995,
  'Madre Sacramento 1300, Villa Eucarística, Córdoba',
  'Madre Sacramento',
  '{"primario": "#1A3A6B", "secundario": "#5AABDF", "acento": "#FFFFFF"}'::jsonb,
  'mariajosemajul@yahoo.com.ar',
  '{"instagram": "https://www.instagram.com/clubdolphinscba", "facebook": "https://www.facebook.com/Dolphinscordoba"}'::jsonb,
  true
);

-- ============================================================
-- ARIAS (Córdoba)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, colores, activo)
VALUES (
  'Arias',
  'arias',
  'Arias',
  'Club de béisbol de la ciudad de Arias, Córdoba. Integrante de la Liga Argentina de Béisbol desde sus primeras temporadas, representa al interior de Córdoba en la principal competencia interprovincial del béisbol argentino.',
  NULL,
  'Arias, Córdoba',
  '{"primario": "#C8102E", "secundario": "#FFD700", "acento": "#FFFFFF"}'::jsonb,
  true
);

-- ============================================================
-- CACHORROS (Salta)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, colores, contacto_email, redes_sociales, activo)
VALUES (
  'Cachorros',
  'cachorros',
  'Cachorros',
  'El Club Cachorros nace oficialmente el 7 de febrero de 1983 en la barriada Sur de la Ciudad de Salta, con el impulso de Alberto Pastrana y varios jóvenes apasionados por el béisbol. Tal fue el éxito de esos primeros años que el club llegó a contar con cinco equipos de infantiles, dos sextas y dos terceras. En el año 2017 el Club Cachorros se convirtió en socio fundador de la LAB y desde esa primera edición participa en todas las temporadas. La disciplina más representativa de su cantera es el béisbol, que le dio a Salta la mayor cantidad de títulos nacionales e internacionales. Fue tetracampeón del Torneo Honor de la Liga Local (2005-2008) y logró la Summer Cup 2025. Se destaca el paso de Mauro Schiavoni, Olimpia de Plata en 2006 y primer jugador en firmar para la LMB.',
  1983,
  'Roberto Romero, RN51 S/N Km 2,6, Salta',
  '{"primario": "#006847", "secundario": "#FFFFFF", "acento": "#C8102E"}'::jsonb,
  'loscachorrosclub@gmail.com',
  '{"instagram": "https://www.instagram.com/cachorrossalta", "facebook": "https://www.facebook.com/CachorrosSalta"}'::jsonb,
  true
);

-- ============================================================
-- INFERNALES (Club Atlético Popeye - Salta)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, colores, activo)
VALUES (
  'Infernales',
  'infernales',
  'Infernales',
  'Los Infernales de Salta son el equipo de béisbol del Club Atlético Popeye, una institución histórica del béisbol salteño. Integrante de la Liga Argentina de Béisbol, representa a Salta junto a los Cachorros en la principal competencia interprovincial del béisbol argentino.',
  NULL,
  'Salta, Argentina',
  '{"primario": "#C8102E", "secundario": "#1A1A1A", "acento": "#FF6600"}'::jsonb,
  true
);

-- ============================================================
-- DAOM (Club Atlético Obras Municipales - Buenos Aires)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, contacto_email, redes_sociales, activo)
VALUES (
  'DAOM',
  'daom',
  'DAOM',
  'El Club Atlético Obras Municipales (DAOM) fue fundado en 1927 como una institución vinculada a los trabajadores municipales de la Ciudad de Buenos Aires. El 12 de octubre de 1947 disputó oficialmente su primer partido de béisbol frente a Boca Juniors, marcando el inicio de su participación en la disciplina. Con el paso de los años, el club se convirtió en uno de los más importantes del béisbol argentino y el único con campo de béisbol dentro de la Ciudad de Buenos Aires. DAOM es campeón de la Liga Argentina de Béisbol en 2024 y 2025, y representó al país en la Serie de las Américas en Nicaragua (2025) y Venezuela (2026).',
  1927,
  'Av. Varela 1802, Flores, Ciudad de Buenos Aires',
  'Horacio "Chipomo" Blanco',
  '{"primario": "#0A3D91", "secundario": "#FFFFFF", "acento": "#C8102E"}'::jsonb,
  'daombeisbol@gmail.com',
  '{"instagram": "https://www.instagram.com/daombeisbol", "facebook": "https://www.facebook.com/daombeisbol", "tiktok": "https://www.tiktok.com/@daom.beisbol", "youtube": "https://www.youtube.com/@daombeisbol"}'::jsonb,
  true
);

-- ============================================================
-- PATRIOTS (Buenos Aires)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, colores, activo)
VALUES (
  'Patriots',
  'patriots',
  'Patriots',
  'Los Patriots son el equipo de béisbol de Buenos Aires que compite en la Liga Argentina de Béisbol desde su incorporación en 2023 junto a DAOM, cuando la competencia se extendió a la Ciudad de Buenos Aires. Representan la expansión de la LAB hacia la capital del país.',
  NULL,
  'Buenos Aires, Argentina',
  '{"primario": "#041E42", "secundario": "#C8102E", "acento": "#FFFFFF"}'::jsonb,
  true
);
