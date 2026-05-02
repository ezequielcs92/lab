-- =============================================================
-- LAB - Actualización de datos reales de clubes y staff
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- SAFE: usa UPDATE/DELETE+INSERT por slug, no borra toda la tabla
-- =============================================================

-- ============================================================
-- ARIAS (Villa Allende, Córdoba)
-- ============================================================
UPDATE clubes SET
  historia       = 'Arias BC se fundó en 2007 en Villa Allende, Córdoba, tras la fusión de exjugadores de Alas Argentinas y La Salle, dos equipos que desaparecieron en 2006. El nombre rinde homenaje a Don Arturo Arias, entrenador de Alas Argentinas de toda la vida. Desde su creación hasta 2013, el club participó en los torneos de Reserva y Primera. A partir de 2015 comenzó a competir en categorías infantiles, U15 y U18 de la Federación Cordobesa, obteniendo múltiples campeonatos. Desde la creación de la categoría U18/Desarrollo en 2020, el club obtuvo 9 títulos de los 10 torneos disputados. Actualmente compite en las cuatro categorías de la FCBYS y forma parte de la Liga Argentina de Béisbol. Entre sus logros se destacan el Campeonato Nacional de clubes en 2010 (venciendo en la final al Club Dolphins), la Summer Cup en 2012 y el Campeonato Nacional en 2015.',
  fundacion      = 2007,
  sede           = 'Av. Goycochea 1810, Villa Allende, Córdoba',
  estadio_nombre = 'Camping General San Martín',
  contacto_email = 'ariasbc2011@gmail.com',
  redes_sociales = '{"instagram": "https://www.instagram.com/ariasbeisbol", "facebook": "https://www.facebook.com/AriasBCVillaAllende", "telefono": "3543-627060"}'::jsonb,
  updated_at     = NOW()
WHERE slug = 'arias';

-- ============================================================
-- CACHORROS (Salta)
-- ============================================================
UPDATE clubes SET
  historia       = 'El Club Cachorros nace oficialmente el 7 de febrero de 1983, con el impulso de Alberto Pastrana y varios jóvenes de la barriada Sur de la Ciudad de Salta. Tal fue el éxito de esos primeros años que el club llegó a contar con cinco equipos de infantiles, dos sextas y dos terceras. La disciplina más representativa de su cantera es el béisbol, que le dio a Salta la mayor cantidad de títulos nacionales e internacionales. En el año 2017 el Club Cachorros se convirtió en socio fundador de la LAB y desde esa primera edición participa en todas las temporadas. Fue tetracampeón del Torneo Honor de la Liga Local (2005–2008) y logró la Summer Cup 2025. Se destaca el paso de Mauro Schiavoni, Olimpia de Plata en 2006 y primer jugador argentino en firmar para la LMB. Además de béisbol, el club cuenta con fútbol, hockey, vóley y básquet, y ofrece canchas de béisbol, sóftbol, hockey, fútbol amateur, fútbol 5 y gimnasios.',
  fundacion      = 1983,
  sede           = 'Roberto Romero, RN51 S/N Km 2,6, A4400 Salta',
  contacto_email = 'loscachorrosclub@gmail.com',
  redes_sociales = '{"instagram": "https://www.instagram.com/cachorrossalta", "facebook": "https://www.facebook.com/CachorrosSalta", "telefono_club": "3873213275", "telefono_coordinadora": "3874590368"}'::jsonb,
  updated_at     = NOW()
WHERE slug = 'cachorros';

-- ============================================================
-- DAOM (Buenos Aires)
-- ============================================================
UPDATE clubes SET
  historia       = 'El Club Atlético Obras Municipales (DAOM) fue fundado en 1927 como una institución vinculada a los trabajadores municipales de la Ciudad de Buenos Aires. El 12 de octubre de 1947, en el marco de su 20° aniversario, disputó oficialmente su primer partido de béisbol frente a Boca Juniors, marcando el inicio de su participación en la disciplina. Con el paso de los años, el club se convirtió en uno de los más importantes del béisbol argentino y el único con campo de béisbol dentro de la Ciudad de Buenos Aires. El campo de juego se denomina «Horacio "Chipomo" Blanco», en honor a uno de los mejores cátchers de las décadas del 60, 70 y 80 que jugó siempre en DAOM e integró la Selección argentina. DAOM es campeón de la Liga Argentina de Béisbol en 2024 y 2025, y representó al país en la Serie de las Américas en Nicaragua (2025) y Venezuela (2026). En 2021 logró salir campeón en todas las categorías de la Liga Metropolitana (U10, U12, U14, U18, U23 y Mayores). En 2024 ganó el nacional de Little League Argentina y viajó a México en representación del país (U16).',
  fundacion      = 1927,
  sede           = 'Av. Varela 1802, Flores, Ciudad de Buenos Aires',
  estadio_nombre = 'Horacio "Chipomo" Blanco',
  contacto_email = 'daombeisbol@gmail.com',
  redes_sociales = '{"instagram": "https://www.instagram.com/daombeisbol", "facebook": "https://www.facebook.com/daombeisbol", "tiktok": "https://www.tiktok.com/@daom.beisbol", "youtube": "https://www.youtube.com/@daombeisbol", "telefono": "+54 9 11 2458-6565"}'::jsonb,
  updated_at     = NOW()
WHERE slug = 'daom';

-- ============================================================
-- FALCONS (Dolphins Béisbol Club - Córdoba)
-- ============================================================
UPDATE clubes SET
  historia       = 'Dolphins Béisbol Club Córdoba es una de las principales instituciones dedicadas al desarrollo del béisbol en la provincia. Desde sus inicios en 1995, el club se enfocó en la formación de jugadores y en la difusión del deporte en la región, consolidándose como un referente local. A lo largo de los años ha trabajado en el crecimiento de sus divisiones formativas y en la participación en competencias nacionales, posicionándose como uno de los equipos más representativos del interior del país. Además de béisbol, Dolphins se destaca en otras disciplinas como el vóley, el patín y la gimnasia artística. Su equipo de béisbol —los Falcons— participa en la Liga Argentina de Béisbol desde su primera edición en 2017. Campeón de la LAB en 2018, 2021 y 2022.',
  fundacion      = 1995,
  sede           = 'Madre Sacramento 1300, Villa Eucarística, Córdoba',
  estadio_nombre = 'Madre Sacramento',
  contacto_email = 'mariajosemajul@yahoo.com.ar',
  redes_sociales = '{"instagram": "https://www.instagram.com/clubdolphinscba", "facebook": "https://www.facebook.com/Dolphinscordoba", "telefono": "+54 9 351 351-9076"}'::jsonb,
  updated_at     = NOW()
WHERE slug = 'falcons';

-- ============================================================
-- INFERNALES (Club Popeye - Salta)
-- ============================================================
UPDATE clubes SET
  historia       = 'Popeye Béisbol Club es un equipo fundacional del béisbol argentino, nacido el 11 de febrero de 1963. Desde entonces ha sido participante activo de todos los torneos nacionales y un proveedor histórico de jugadores para la Selección nacional. Compite en la Liga Argentina de Béisbol desde su creación en 2017. Con el tiempo la institución fue incorporando otras disciplinas: actualmente el hockey tiene un rol muy importante, posicionando al club como uno de los más importantes de Salta, con la participación de varias jugadoras en Las Leonas. El club cuenta con amplias instalaciones: dos canchas de hockey, el Estadio Principal «José Ismael Jesús Gómez», un estadio de béisbol para menores, canchas de fútbol 5, pádel, vóley, box de crossfit y gimnasio. Ha obtenido tres títulos en la Liga Argentina de Béisbol: 2017, 2019 y 2023. También es organizador de la Summer Cup —con 15 ediciones disputadas— y se consagró campeón en 2014, 2016 y 2017.',
  fundacion      = 1963,
  sede           = 'Av. Gral. Arenales 960, A4400 Salta',
  estadio_nombre = 'José Ismael Jesús Gómez',
  redes_sociales = '{"instagram": "https://www.instagram.com/popeye.beisbol.club", "instagram_equipo": "https://www.instagram.com/infernalespopeye", "telefono": "3874311881"}'::jsonb,
  updated_at     = NOW()
WHERE slug = 'infernales';

-- ============================================================
-- PATRIOTS (Buenos Aires)
-- ============================================================
UPDATE clubes SET
  historia       = 'Buenos Aires Patriots es una organización de béisbol independiente fundada en 2017 por el entrenador estadounidense Jay Bartelli. Fueron los primeros en Buenos Aires en acoger e integrar activamente a jugadores internacionales. En su temporada inaugural se mantuvieron invictos, conquistando el campeonato de Segunda División (A2) de la LMB y convirtiéndose en el primer equipo en alcanzar la máxima categoría sin ser una institución de larga tradición local. El club creció rápidamente, estableciendo cuatro divisiones: A1 (Primera), A2 (Promocional), U23 y Femenino —esta última una de las más competitivas de la liga—. En 2024 la organización se integró a la Liga Argentina de Béisbol (LAB). La temporada 2023 representó su mayor hito en la LMB: ganaron simultáneamente los campeonatos A1, A2 y Sub-23, y el equipo femenino inició una racha de tres títulos consecutivos. En el ámbito nacional, los Patriots llegaron a la final en las temporadas 2023 y 2024, terminando subcampeones en ambas ediciones frente al Club DAOM.',
  fundacion      = 2017,
  sede           = 'Estadio Nacional de Béisbol, Ezeiza, Buenos Aires',
  updated_at     = NOW()
WHERE slug = 'patriots';

-- ============================================================
-- STAFF DE CLUBES
-- Primero limpia el staff existente, luego inserta el nuevo
-- ============================================================

-- Arias
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'arias');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'arias'), 'Agustín Pérez Ferrero', 'Presidente', 1),
  ((SELECT id FROM clubes WHERE slug = 'arias'), 'Leandro Juárez', 'Manager', 2),
  ((SELECT id FROM clubes WHERE slug = 'arias'), 'Rodrigo Bruera', 'Director Deportivo', 3),
  ((SELECT id FROM clubes WHERE slug = 'arias'), 'Federico Tanco', 'Coach', 4);

-- Cachorros
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'cachorros');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'cachorros'), 'Ramiro Schiavoni', 'Presidente', 1),
  ((SELECT id FROM clubes WHERE slug = 'cachorros'), 'Mauro Schiavoni', 'Manager', 2),
  ((SELECT id FROM clubes WHERE slug = 'cachorros'), 'Mauricio Romero', 'Head Coach', 3);

-- DAOM
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'daom');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'daom'), 'Roberto Braccini', 'Presidente', 1),
  ((SELECT id FROM clubes WHERE slug = 'daom'), 'Fabricio Curtti', 'Manager / Head Coach', 2),
  ((SELECT id FROM clubes WHERE slug = 'daom'), 'Matias Sola', 'Coach Asistente', 3),
  ((SELECT id FROM clubes WHERE slug = 'daom'), 'Oswald Machado', 'Coach Asistente', 4),
  ((SELECT id FROM clubes WHERE slug = 'daom'), 'Maximiliano Riello', 'Preparador Físico', 5);

-- Falcons (Dolphins)
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'falcons');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'falcons'), 'Darío Martin', 'Presidente', 1),
  ((SELECT id FROM clubes WHERE slug = 'falcons'), 'Carlos Parra', 'Manager / Head Coach', 2),
  ((SELECT id FROM clubes WHERE slug = 'falcons'), 'Matías Robles', 'Coach Asistente', 3);

-- Infernales (Popeye)
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'infernales');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'infernales'), 'Gabriel Zuleta', 'Presidente', 1),
  ((SELECT id FROM clubes WHERE slug = 'infernales'), 'Federico Bisbal', 'Manager / Head Coach', 2);

-- Patriots
DELETE FROM staff_clubes WHERE club_id = (SELECT id FROM clubes WHERE slug = 'patriots');
INSERT INTO staff_clubes (club_id, nombre, cargo, orden) VALUES
  ((SELECT id FROM clubes WHERE slug = 'patriots'), 'Jay Bartelli', 'Manager / Head Coach', 1);

-- ============================================================
-- AUTORIDADES DE LA LAB
-- ============================================================
DELETE FROM autoridades WHERE activo = true;
INSERT INTO autoridades (nombre, cargo, bio, orden, activo) VALUES
  ('Pablo Tesouro', 'Cofundador', 'Uno de los fundadores de la Liga Argentina de Béisbol en 2017, con el objetivo de crear una competencia nacional de carácter semiprofesional que impulsara el crecimiento del béisbol argentino.', 1, true),
  ('Roberto Braccini', 'Cofundador', 'Cofundador de la LAB en 2017. También presidente del Club DAOM, uno de los clubes más exitosos de la liga, campeón en 2024 y 2025.', 2, true);
