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
-- ARIAS (Villa Allende, Córdoba)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, contacto_email, redes_sociales, activo)
VALUES (
  'Arias',
  'arias',
  'Arias',
  'Arias BC se fundó en 2007 en Villa Allende, Córdoba, tras la fusión de exjugadores de Alas Argentinas y La Salle, dos equipos que desaparecieron en 2006. El nombre rinde homenaje a Don Arturo Arias, entrenador de Alas Argentinas de toda la vida. Desde su creación hasta 2013, el club participó en los torneos de Reserva y Primera. A partir de 2015 comenzó a competir en categorías infantiles, U15 y U18 de la Federación Cordobesa, obteniendo múltiples campeonatos. Desde la creación de la categoría U18/Desarrollo en 2020, el club obtuvo 9 títulos de los 10 torneos disputados. Actualmente compite en las cuatro categorías de la FCBYS y forma parte de la Liga Argentina de Béisbol. Entre sus logros se destacan el Campeonato Nacional de clubes en 2010 (venciendo en la final al Club Dolphins), la Summer Cup en 2012 y el Campeonato Nacional en 2015.',
  2007,
  'Av. Goycochea 1810, Villa Allende, Córdoba',
  'Camping General San Martín',
  '{"primario": "#C8102E", "secundario": "#FFD700", "acento": "#FFFFFF"}'::jsonb,
  'ariasbc2011@gmail.com',
  '{"instagram": "https://www.instagram.com/ariasbeisbol", "facebook": "https://www.facebook.com/AriasBCVillaAllende", "telefono": "3543-627060"}'::jsonb,
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
-- INFERNALES (Club Popeye - Salta)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, redes_sociales, activo)
VALUES (
  'Infernales',
  'infernales',
  'Infernales',
  'Popeye Béisbol Club es un equipo fundacional del béisbol argentino, nacido el 11 de febrero de 1963. Desde entonces ha sido participante activo de todos los torneos nacionales y un proveedor histórico de jugadores para la Selección nacional. Compite en la Liga Argentina de Béisbol desde su creación en 2017. Con el tiempo la institución fue incorporando otras disciplinas: actualmente el hockey tiene un rol muy importante, posicionando al club como uno de los más importantes de Salta, con la participación de varias jugadoras en Las Leonas. El club cuenta con amplias instalaciones: dos canchas de hockey, el Estadio Principal «José Ismael Jesús Gómez», un estadio de béisbol para menores, canchas de fútbol 5, pádel, vóley, box de crossfit y gimnasio. Ha obtenido tres títulos en la Liga Argentina de Béisbol: 2017, 2019 y 2023. También es organizador de la Summer Cup —con 15 ediciones disputadas— y se consagró campeón en 2014, 2016 y 2017.',
  1963,
  'Av. Gral. Arenales 960, A4400 Salta',
  'José Ismael Jesús Gómez',
  '{"primario": "#C8102E", "secundario": "#1A1A1A", "acento": "#FF6600"}'::jsonb,
  '{"instagram": "https://www.instagram.com/popeye.beisbol.club", "instagram_equipo": "https://www.instagram.com/infernalespopeye", "telefono": "3874311881"}'::jsonb,
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
  'Buenos Aires Patriots es una organización de béisbol independiente fundada en 2017 por el entrenador estadounidense Jay Bartelli. Fueron los primeros en Buenos Aires en acoger e integrar activamente a jugadores internacionales. En su temporada inaugural, la plantilla estuvo compuesta principalmente por jugadores estadounidenses, y se mantuvieron invictos conquistando el campeonato de Segunda División (A2), convirtiéndose en el primer equipo en alcanzar la máxima categoría sin ser una institución de larga tradición local. El club creció rápidamente, estableciendo cuatro divisiones: A1 (Primera), A2 (Promocional), U23 y Femenino. En 2024 la organización se integró a la Liga Argentina de Béisbol (LAB). La temporada 2023 representó su mayor hito en la LMB: ganaron simultáneamente los campeonatos A1, A2 y Sub-23, y el equipo femenino inició una racha de tres títulos consecutivos. En el ámbito nacional, los Patriots llegaron a la final del campeonato en las temporadas 2023 y 2024, terminando subcampeones en ambas ediciones.',
  2017,
  'Estadio Nacional de Béisbol, Ezeiza, Buenos Aires',
  '{"primario": "#041E42", "secundario": "#C8102E", "acento": "#FFFFFF"}'::jsonb,
  true
);

-- ============================================================
-- VELEZ (Ciudad de Buenos Aires)
-- ============================================================
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, contacto_email, redes_sociales, activo)
VALUES (
  'Velez',
  'velez',
  'Velez',
  'El Club Atlético Vélez Sarsfield es una institución deportiva fundada en 1910 que también desarrolla actividades culturales y educativas. Vélez Béisbol inició formalmente su etapa actual en 1994, cuando integrantes del antiguo club Fujiyama trasladaron su estructura a Vélez Sarsfield. Bajo la dirección inicial de Sergio Semba y Carlos Isla, la disciplina se incorporó a la Liga Metropolitana de Béisbol y consolidó equipos competitivos en todas las categorías. En estas décadas, el club logró hitos importantes, incluido su primer campeonato local de Primera División (A1) en 2014 bajo la conducción de Nicolás Martínez. La cantera del Fortín aportó títulos en divisiones formativas y numerosos jugadores a la Selección Nacional. Actualmente la actividad sigue creciendo con béisbol femenino y trabajo técnico apoyado en tecnología de entrenamiento.',
  1910,
  'Av. Juan B. Justo 8900, Ciudad Autónoma de Buenos Aires',
  'Polideportivo José Ramón Feijóo',
  '{"primario": "#0A6B8A", "secundario": "#1B2347", "acento": "#F2F2F2"}'::jsonb,
  'beisbol@velezsarsfield.com.ar',
  '{"instagram": "https://www.instagram.com/velezbeisbol", "google_maps": "https://maps.app.goo.gl/zdEQduegRJHmVb296", "telefono": "+54 9 11 5980-9467"}'::jsonb,
  true
);

-- ============================================================
-- STAFF DE CLUBES
-- (Ejecutar después de insertar los clubes)
-- ============================================================

-- Arias
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Agustín Pérez Ferrero', 'Presidente', 1 FROM clubes WHERE slug = 'arias';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Leandro Juárez', 'Manager', 2 FROM clubes WHERE slug = 'arias';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Rodrigo Bruera', 'Director Deportivo', 3 FROM clubes WHERE slug = 'arias';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Federico Tanco', 'Coach', 4 FROM clubes WHERE slug = 'arias';

-- Cachorros
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Ramiro Schiavoni', 'Presidente', 1 FROM clubes WHERE slug = 'cachorros';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Mauro Schiavoni', 'Manager', 2 FROM clubes WHERE slug = 'cachorros';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Mauricio Romero', 'Head Coach', 3 FROM clubes WHERE slug = 'cachorros';

-- DAOM
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Roberto Braccini', 'Presidente', 1 FROM clubes WHERE slug = 'daom';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Fabricio Curtti', 'Manager / Head Coach', 2 FROM clubes WHERE slug = 'daom';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Matias Sola', 'Coach Asistente', 3 FROM clubes WHERE slug = 'daom';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Oswald Machado', 'Coach Asistente', 4 FROM clubes WHERE slug = 'daom';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Maximiliano Riello', 'Preparador Físico', 5 FROM clubes WHERE slug = 'daom';

-- Falcons (Dolphins)
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Darío Martin', 'Presidente', 1 FROM clubes WHERE slug = 'falcons';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Carlos Parra', 'Manager / Head Coach', 2 FROM clubes WHERE slug = 'falcons';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Matías Robles', 'Coach Asistente', 3 FROM clubes WHERE slug = 'falcons';

-- Infernales (Popeye)
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Gabriel Zuleta', 'Presidente', 1 FROM clubes WHERE slug = 'infernales';
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Federico Bisbal', 'Manager / Head Coach', 2 FROM clubes WHERE slug = 'infernales';

-- Patriots
INSERT INTO staff_clubes (club_id, nombre, cargo, orden)
SELECT id, 'Jay Bartelli', 'Manager / Head Coach', 1 FROM clubes WHERE slug = 'patriots';

-- Velez
INSERT INTO staff_clubes (club_id, nombre, cargo, categoria, orden)
SELECT id, 'Mario Villasanti', 'Presidente de Subcomisión', 'autoridades', 1 FROM clubes WHERE slug = 'velez';
INSERT INTO staff_clubes (club_id, nombre, cargo, categoria, orden)
SELECT id, 'Simón Erusalimsky', 'Coordinador Deportivo', 'autoridades', 2 FROM clubes WHERE slug = 'velez';
INSERT INTO staff_clubes (club_id, nombre, cargo, categoria, orden)
SELECT id, 'Sebastián Hernández', 'Manager / Head Coach', 'cuerpo_tecnico', 3 FROM clubes WHERE slug = 'velez';
INSERT INTO staff_clubes (club_id, nombre, cargo, categoria, orden)
SELECT id, 'Nicolás Martínez', 'Coach', 'cuerpo_tecnico', 4 FROM clubes WHERE slug = 'velez';
INSERT INTO staff_clubes (club_id, nombre, cargo, categoria, orden)
SELECT id, 'Santiago UZ', 'Pitching Coach', 'cuerpo_tecnico', 5 FROM clubes WHERE slug = 'velez';
