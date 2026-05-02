-- =============================================================
-- LAB - Datos de prueba para todas las secciones
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ORDEN DE EJECUCIÓN: Este archivo completo de una sola vez.
-- =============================================================


-- =============================================================
-- 1. TEMPORADA
-- =============================================================
INSERT INTO temporadas (anio, nombre, fecha_inicio, fecha_fin, activa)
VALUES (2026, 'Temporada 2026', '2026-03-01', '2026-11-30', true)
ON CONFLICT (anio) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  fecha_inicio = EXCLUDED.fecha_inicio,
  fecha_fin = EXCLUDED.fecha_fin,
  activa = true;


-- =============================================================
-- 2. PARTIDOS Y POSICIONES
--    Usamos los slugs de clubes para obtener los IDs
-- =============================================================
DO $$
DECLARE
  temp_id   UUID;
  falcons   UUID;
  arias     UUID;
  cachorros UUID;
  infernales UUID;
  daom      UUID;
  patriots  UUID;
BEGIN
  SELECT id INTO temp_id     FROM temporadas WHERE anio = 2026;
  SELECT id INTO falcons     FROM clubes WHERE slug = 'falcons';
  SELECT id INTO arias       FROM clubes WHERE slug = 'arias';
  SELECT id INTO cachorros   FROM clubes WHERE slug = 'cachorros';
  SELECT id INTO infernales  FROM clubes WHERE slug = 'infernales';
  SELECT id INTO daom        FROM clubes WHERE slug = 'daom';
  SELECT id INTO patriots    FROM clubes WHERE slug = 'patriots';

  -- Borrar partidos anteriores de esta temporada para evitar duplicados
  DELETE FROM posiciones  WHERE temporada_id = temp_id;
  DELETE FROM partidos    WHERE temporada_id = temp_id;

  -- -------------------------------------------------------
  -- FECHA 1 — 8 Mar 2026
  -- -------------------------------------------------------
  INSERT INTO partidos (temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, marcador_local, marcador_visitante, estado, resumen)
  VALUES
    (temp_id, 1, daom,      patriots,  '2026-03-08 15:00:00-03', 'Horacio "Chipomo" Blanco, Buenos Aires', 7, 3, 'finalizado', 'DAOM dominó de principio a fin ante Patriots con una gran actuación del pitcheo.'),
    (temp_id, 1, falcons,   arias,     '2026-03-08 16:00:00-03', 'Madre Sacramento, Córdoba',              4, 6, 'finalizado', 'Arias remontó 2 abajo en la séptima entrada para llevarse el triunfo en Córdoba.'),
    (temp_id, 1, cachorros, infernales,'2026-03-08 17:00:00-03', 'Roberto Romero, Salta',                  5, 5, 'finalizado', 'Empate dramático en el clásico salteño. Ambos equipos igualaron en la última entrada.');

  -- -------------------------------------------------------
  -- FECHA 2 — 22 Mar 2026
  -- -------------------------------------------------------
  INSERT INTO partidos (temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, marcador_local, marcador_visitante, estado, resumen)
  VALUES
    (temp_id, 2, patriots,  daom,      '2026-03-22 15:00:00-03', 'Estadio Patriots, Buenos Aires',         8, 5, 'finalizado', 'Patriots se vengó de la fecha 1 con una contundente victoria como local.'),
    (temp_id, 2, arias,     cachorros, '2026-03-22 16:00:00-03', 'Camping Gral. San Martín, Villa Allende', 3, 7, 'finalizado', 'Cachorros viajó a Córdoba y se impuso con 4 carreras en la tercera entrada.'),
    (temp_id, 2, infernales,falcons,   '2026-03-22 17:00:00-03', 'José Ismael Jesús Gómez, Salta',          6, 2, 'finalizado', 'Infernales aplastó a Falcons con un potente bateo colectivo.');

  -- -------------------------------------------------------
  -- FECHA 3 — 5 Abr 2026
  -- -------------------------------------------------------
  INSERT INTO partidos (temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, marcador_local, marcador_visitante, estado, resumen)
  VALUES
    (temp_id, 3, daom,      infernales,'2026-04-05 15:00:00-03', 'Horacio "Chipomo" Blanco, Buenos Aires', 9, 4, 'finalizado', 'DAOM sigue invicto con una victoria dominante sobre los Infernales.'),
    (temp_id, 3, cachorros, falcons,   '2026-04-05 16:00:00-03', 'Roberto Romero, Salta',                  6, 6, 'finalizado', 'Nuevo empate emocionante en Salta, Falcons rescata punto en la séptima.'),
    (temp_id, 3, patriots,  arias,     '2026-04-05 17:00:00-03', 'Estadio Patriots, Buenos Aires',         4, 4, 'finalizado', 'Partido parejo que terminó igualado entre Patriots y Arias.');

  -- -------------------------------------------------------
  -- FECHA 4 — 19 Abr 2026 (próxima — programada)
  -- -------------------------------------------------------
  INSERT INTO partidos (temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, estado)
  VALUES
    (temp_id, 4, arias,     daom,      '2026-04-19 15:00:00-03', 'Camping Gral. San Martín, Villa Allende', 'programado'),
    (temp_id, 4, infernales,cachorros, '2026-04-19 16:00:00-03', 'José Ismael Jesús Gómez, Salta',          'programado'),
    (temp_id, 4, falcons,   patriots,  '2026-04-19 17:00:00-03', 'Madre Sacramento, Córdoba',               'programado');

  -- -------------------------------------------------------
  -- FECHA 5 — 3 May 2026 (programada)
  -- -------------------------------------------------------
  INSERT INTO partidos (temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, estado)
  VALUES
    (temp_id, 5, daom,      cachorros, '2026-05-03 15:00:00-03', 'Horacio "Chipomo" Blanco, Buenos Aires', 'programado'),
    (temp_id, 5, patriots,  infernales,'2026-05-03 16:00:00-03', 'Estadio Patriots, Buenos Aires',         'programado'),
    (temp_id, 5, arias,     falcons,   '2026-05-03 17:00:00-03', 'Camping Gral. San Martín, Villa Allende', 'programado');

  -- -------------------------------------------------------
  -- TABLA DE POSICIONES (basada en resultados de fechas 1-3)
  -- Formato: pj, pg, pp, pe, cf, cc, pts
  -- Empate = 1pt cada uno, Victoria = 2pts
  -- -------------------------------------------------------
  INSERT INTO posiciones (temporada_id, club_id, pj, pg, pp, pe, cf, cc, pts)
  VALUES
    -- DAOM: 3 PJ, 3 PG, 0 PP, 0 PE — fechas 1(V), 2(L→derrota de patriots no cuenta aquí), 3(V)
    -- Fecha 1: DAOM L vs Patriots V, derrota patriots. Fecha 2 fue Patriots local.
    -- DAOM: F1=gana, F2=pierde(como visitante vs patriots), F3=gana => 2PG 1PP
    (temp_id, daom,       3, 2, 1, 0, 21, 12, 4),
    -- PATRIOTS: F1=pierde, F2=gana, F3=empata
    (temp_id, patriots,   3, 1, 1, 1, 17, 16, 3),
    -- CACHORROS: F1=empata, F2=gana, F3=empata
    (temp_id, cachorros,  3, 1, 0, 2, 18, 15, 4),
    -- INFERNALES: F1=empata, F2=gana, F3=pierde
    (temp_id, infernales, 3, 1, 1, 1, 17, 18, 3),
    -- ARIAS: F1=gana, F2=pierde, F3=empata
    (temp_id, arias,      3, 1, 1, 1, 17, 17, 3),
    -- FALCONS: F1=pierde, F2=pierde, F3=empata
    (temp_id, falcons,    3, 0, 2, 1, 12, 20, 1);

END $$;


-- =============================================================
-- 3. TRIVIAS (20 preguntas de béisbol argentino)
-- =============================================================
DELETE FROM trivias;

INSERT INTO trivias (pregunta, opciones, respuesta_correcta, explicacion, dificultad, activa)
VALUES
  (
    '¿En qué año se fundó la Liga Argentina de Béisbol (LAB)?',
    '["2010", "2015", "2017", "2019"]',
    2,
    'La LAB fue fundada en 2017, reuniendo por primera vez a equipos de Buenos Aires, Córdoba y Salta en una competencia interprovincial oficial.',
    1, true
  ),
  (
    '¿Qué club ganó el primer campeonato de la LAB en 2017?',
    '["DAOM", "Falcons", "Infernales", "Cachorros"]',
    2,
    'Infernales (Club Popeye) se coronó campeón de la primera edición de la Liga Argentina de Béisbol en 2017.',
    2, true
  ),
  (
    '¿Cuántos innings dura un partido de la Liga Argentina de Béisbol?',
    '["5 innings", "7 innings", "9 innings", "11 innings"]',
    1,
    'Los partidos de la LAB se juegan a 7 innings, una modalidad que agiliza los encuentros sin perder la esencia del béisbol.',
    1, true
  ),
  (
    '¿Qué ciudad tiene el único campo de béisbol dentro de su ejido urbano en Argentina?',
    '["Salta", "Córdoba", "Rosario", "Ciudad de Buenos Aires"]',
    3,
    'DAOM posee el único campo de béisbol dentro de la Ciudad de Buenos Aires, en el barrio de Flores.',
    2, true
  ),
  (
    '¿Cuál fue el primer jugador argentino en firmar para la Liga Mexicana de Béisbol (LMB)?',
    '["Fernando Romero", "Mauro Schiavoni", "Pablo García", "Diego Herrera"]',
    1,
    'Mauro Schiavoni, surgido del Club Cachorros de Salta, fue el primer argentino en firmar un contrato con la LMB, abriendo el camino para futuros peloteros.',
    3, true
  ),
  (
    '¿En qué provincia argentina se ubica el Club Falcons (Dolphins BC)?',
    '["Buenos Aires", "Salta", "Córdoba", "Mendoza"]',
    2,
    'Falcons, cuyo nombre oficial es Dolphins Béisbol Club, tiene su sede en la ciudad de Córdoba.',
    1, true
  ),
  (
    '¿Cuál es el formato de competencia de la LAB?',
    '["Eliminación directa", "Round robin — todos contra todos", "Grupos + playoffs", "Liga y copa"]',
    1,
    'La LAB utiliza el formato round robin, donde todos los equipos se enfrentan entre sí, con enfrentamientos dentro de cada provincia y cruces interprovinciales.',
    2, true
  ),
  (
    '¿Cuántas veces ganó DAOM la LAB antes de la temporada 2026?',
    '["1 vez", "2 veces", "3 veces", "4 veces"]',
    1,
    'DAOM se consagró bicampeón al ganar la LAB en 2024 y 2025, representando a la Argentina en la Serie de las Américas en ambas oportunidades.',
    2, true
  ),
  (
    '¿En qué año fue fundado el Club Cachorros de Salta?',
    '["1963", "1975", "1983", "1990"]',
    2,
    'El Club Cachorros nació oficialmente el 7 de febrero de 1983 en la barriada Sur de la Ciudad de Salta.',
    2, true
  ),
  (
    '¿Qué club rinde homenaje a Don Arturo Arias con su nombre?',
    '["Infernales", "Arias BC", "Patriots", "Falcons"]',
    1,
    'Arias BC fue fundado en Villa Allende, Córdoba, y su nombre es un homenaje a Don Arturo Arias, entrenador histórico de Alas Argentinas.',
    2, true
  ),
  (
    '¿Cuál es el nombre del estadio principal de Infernales (Club Popeye)?',
    '["Roberto Romero", "Horacio Blanco", "José Ismael Jesús Gómez", "Madre Sacramento"]',
    2,
    'El estadio de Infernales/Club Popeye en Salta lleva el nombre de José Ismael Jesús Gómez.',
    3, true
  ),
  (
    '¿En qué país se disputó la Serie de las Américas 2026?',
    '["Cuba", "México", "Nicaragua", "Venezuela"]',
    3,
    'La Serie de las Américas 2026 se disputó en Venezuela, con DAOM representando a la Argentina como campeón de la LAB.',
    1, true
  ),
  (
    '¿Cuántos equipos conforman la Liga Argentina de Béisbol?',
    '["4 equipos", "5 equipos", "6 equipos", "8 equipos"]',
    2,
    'La LAB reúne 6 equipos: Falcons y Arias (Córdoba), Infernales y Cachorros (Salta), Patriots y DAOM (Buenos Aires).',
    1, true
  ),
  (
    '¿Qué club ganó la Summer Cup 2025?',
    '["DAOM", "Infernales", "Cachorros", "Falcons"]',
    2,
    'Cachorros se consagró campeón de la Summer Cup 2025, un torneo de pretemporada que tiene gran tradición en el béisbol argentino.',
    3, true
  ),
  (
    '¿Cuántos títulos de la LAB obtuvo Falcons?',
    '["Ninguno", "1 título", "2 títulos", "3 títulos"]',
    3,
    'Falcons (Dolphins BC de Córdoba) ganó la LAB en 2018, 2021 y 2022, siendo uno de los clubes más ganadores del torneo.',
    2, true
  ),
  (
    '¿En qué barrio de Buenos Aires tiene su campo DAOM?',
    '["Palermo", "Flores", "Villa Urquiza", "Almagro"]',
    1,
    'El campo de DAOM se encuentra en Av. Varela 1802, en el barrio de Flores, Ciudad de Buenos Aires.',
    3, true
  ),
  (
    '¿Qué significa el acrónimo DAOM?',
    '["Deporte Argentino Oficial Municipal", "Club Atlético Obras Municipales", "División Atlética Obras Municipales", "Deportivo Atlético Obras Municipales"]',
    1,
    'DAOM es el Club Atlético Obras Municipales, fundado en 1927 como institución vinculada a los trabajadores municipales de Buenos Aires.',
    2, true
  ),
  (
    '¿Cuántos títulos de la LAB lleva Infernales/Club Popeye?',
    '["1 título", "2 títulos", "3 títulos", "4 títulos"]',
    2,
    'Infernales ganó la LAB en 2017, 2019 y 2023, siendo uno de los clubes con más campeonatos en la historia del torneo.',
    2, true
  ),
  (
    '¿En qué año DAOM disputó su primer partido de béisbol?',
    '["1927", "1935", "1947", "1955"]',
    2,
    'El 12 de octubre de 1947, DAOM disputó oficialmente su primer partido de béisbol frente a Boca Juniors.',
    3, true
  ),
  (
    '¿Desde qué año la LAB envía a su campeón a representar al país internacionalmente?',
    '["2017", "2018", "2019", "2021"]',
    2,
    'A partir de 2019 el campeón de la LAB participa en la Serie Latinoamericana/Serie de las Américas, proyectando el béisbol argentino a nivel continental.',
    3, true
  );


-- =============================================================
-- 4. ARCHIVO HISTÓRICO
-- =============================================================
DELETE FROM archivo_historico;

INSERT INTO archivo_historico (fecha_hito, titulo, descripcion, tipo, temporada_referencia, fuente)
VALUES
  (
    '2017-12-10',
    'Primer campeonato de la Liga Argentina de Béisbol',
    'Infernales (Club Popeye de Salta) se consagró campeón de la primera edición de la Liga Argentina de Béisbol. El torneo inaugural reunió a seis clubes de Salta, Córdoba y Buenos Aires en la primera competencia interprovincial formal del béisbol argentino.',
    'campeon',
    2017,
    'Liga Argentina de Béisbol'
  ),
  (
    '2017-09-01',
    'Fundación de la Liga Argentina de Béisbol',
    'El béisbol argentino da un salto histórico: nace la Liga Argentina de Béisbol (LAB), la primera competencia interprovincial oficial del país. Seis clubes fundadores — dos de Salta, dos de Córdoba y dos de Buenos Aires — conforman la nueva liga que buscará elevar el nivel del béisbol nacional.',
    'historia',
    2017,
    'Liga Argentina de Béisbol'
  ),
  (
    '2018-12-08',
    'Falcons: primer campeón cordobés de la LAB',
    'Dolphins Béisbol Club (Falcons) de Córdoba se coronó campeón de la temporada 2018 de la Liga Argentina de Béisbol, convirtiéndose en el primer club cordobés en ganar el título máximo del béisbol argentino.',
    'campeon',
    2018,
    'Liga Argentina de Béisbol'
  ),
  (
    '2019-05-01',
    'Argentina debuta en la Serie Latinoamericana de Béisbol',
    'Por primera vez en la historia, la Argentina envía a su campeón a competir internacionalmente a nivel de clubes. Infernales (campeón 2019) representa al béisbol argentino en la Serie Latinoamericana, marcando un hito en la proyección internacional del deporte en el país.',
    'historia',
    2019,
    'Confederación Panamericana de Béisbol'
  ),
  (
    '2019-12-07',
    'Infernales: bicampeonato en la LAB',
    'Infernales volvió a consagrarse campeón de la Liga Argentina de Béisbol en 2019, logrando su segundo título consecutivo (luego del primero en 2017) y clasificando nuevamente a la representación internacional.',
    'campeon',
    2019,
    'Liga Argentina de Béisbol'
  ),
  (
    '2021-12-05',
    'Falcons: segundo título en la LAB',
    'Falcons (Dolphins BC Córdoba) obtuvo su segundo campeonato de la Liga Argentina de Béisbol en la temporada 2021, que se disputó en formato especial debido al contexto pospandemia.',
    'campeon',
    2021,
    'Liga Argentina de Béisbol'
  ),
  (
    '2022-12-10',
    'Falcons se convierte en el club más ganador de la LAB',
    'Con su tercer título consecutivo en 2022, Falcons se convirtió en el club más ganador de la historia de la Liga Argentina de Béisbol con 3 títulos: 2018, 2021 y 2022.',
    'campeon',
    2022,
    'Liga Argentina de Béisbol'
  ),
  (
    '2023-12-09',
    'Infernales: tricampeonato histórico',
    'Infernales igualó a Falcons como el club más ganador de la LAB al conquistar su tercer título en 2023, completando una temporada brillante y consolidándose como la institución más exitosa del béisbol interprovincial argentino.',
    'campeon',
    2023,
    'Liga Argentina de Béisbol'
  ),
  (
    '2024-12-07',
    'DAOM: primer campeón porteño desde los orígenes de la liga',
    'El Club Atlético Obras Municipales (DAOM) se consagró campeón de la temporada 2024, convirtiéndose en el primer club de la Ciudad de Buenos Aires en ganar la Liga Argentina de Béisbol.',
    'campeon',
    2024,
    'Liga Argentina de Béisbol'
  ),
  (
    '2025-12-06',
    'DAOM bicampeón y representación argentina en Nicaragua',
    'DAOM revalidó su título en 2025 y viajó a Nicaragua para representar a la Argentina en la Serie de las Américas. El bicampeonato consolida a DAOM como la potencia del béisbol porteño.',
    'campeon',
    2025,
    'Liga Argentina de Béisbol'
  ),
  (
    '2006-01-15',
    'Mauro Schiavoni: primer argentino en la Liga Mexicana de Béisbol',
    'El jugador salteño Mauro Schiavoni, surgido del Club Cachorros, se convierte en el primer argentino en firmar un contrato profesional con la Liga Mexicana de Béisbol (LMB). Un hito histórico que abre las puertas al béisbol profesional para los peloteros argentinos. Ese mismo año obtuvo la Olimpia de Plata.',
    'record',
    NULL,
    'Confederación Argentina de Béisbol'
  ),
  (
    '1947-10-12',
    'Primer partido oficial de DAOM',
    'El Club Atlético Obras Municipales (DAOM) disputa su primer partido oficial de béisbol frente a Boca Juniors el 12 de octubre de 1947, Día de la Raza. Este encuentro marca el inicio formal del béisbol en uno de los clubes más importantes de la historia del deporte en Argentina.',
    'historia',
    NULL,
    'Archivo Club DAOM'
  ),
  (
    '1963-02-11',
    'Fundación de Club Popeye (Infernales)',
    'El 11 de febrero de 1963 nace el Popeye Béisbol Club en Salta, una de las instituciones fundacionales del béisbol argentino. Desde entonces, el club aportará jugadores clave a la Selección Nacional y se convertirá en el más ganador de la historia de la LAB.',
    'historia',
    NULL,
    'Archivo Club Popeye'
  ),
  (
    '1983-02-07',
    'Fundación de Club Cachorros',
    'El 7 de febrero de 1983 nace el Club Cachorros en la barriada Sur de Salta, impulsado por Alberto Pastrana y un grupo de jóvenes apasionados por el béisbol. El club llegará a tener cinco equipos de infantiles y se convertirá en pilar del béisbol salteño.',
    'historia',
    NULL,
    'Archivo Club Cachorros'
  ),
  (
    '2010-11-15',
    'Arias BC: campeón nacional de clubes',
    'Arias BC de Villa Allende, Córdoba, se consagró campeón del Campeonato Nacional de clubes en 2010, venciendo en la final al Club Dolphins (Falcons). Un logro histórico para el béisbol cordobés.',
    'campeon',
    NULL,
    'Confederación Argentina de Béisbol'
  );


-- =============================================================
-- 5. AUTORIDADES DE LA LIGA
-- =============================================================
DELETE FROM autoridades;

INSERT INTO autoridades (nombre, cargo, bio, orden, activo)
VALUES
  (
    'Gustavo García',
    'Presidente de la Liga Argentina de Béisbol',
    'Líder del béisbol interprovincial argentino desde la fundación de la LAB en 2017. Impulsó la creación de la liga y la proyección internacional del béisbol argentino, logrando la participación del campeón en la Serie de las Américas desde 2019.',
    1, true
  ),
  (
    'Martín Pereyra',
    'Secretario General',
    'Responsable de la organización administrativa de la liga, los calendarios de competencia y la coordinación entre los clubes de las tres provincias.',
    2, true
  ),
  (
    'Claudia Herrera',
    'Directora de Comunicación y Prensa',
    'Encargada de la difusión del béisbol argentino en medios y redes sociales. Trabaja en la construcción de la identidad visual y comunicacional de la LAB.',
    3, true
  ),
  (
    'Roberto Sosa',
    'Director Técnico Nacional',
    'Responsable del desarrollo técnico del béisbol en Argentina. Coordinador de las selecciones nacionales y de los programas de formación para entrenadores y árbitros.',
    4, true
  ),
  (
    'Ana Quintero',
    'Tesorera',
    'Gestiona las finanzas de la liga, los aportes de los clubes y la administración de los fondos destinados al desarrollo del béisbol argentino.',
    5, true
  ),
  (
    'Diego Morales',
    'Director de Arbitraje',
    'Coordina el cuerpo de árbitros de la LAB, la capacitación y certificación de los mismos, y garantiza la correcta aplicación del reglamento en todos los partidos.',
    6, true
  );


-- =============================================================
-- 6. DOCUMENTOS / REGLAMENTOS
-- =============================================================
DELETE FROM documentos;

INSERT INTO documentos (titulo, descripcion, archivo_url, tipo, fecha_documento, publico)
VALUES
  (
    'Reglamento General de la LAB — Temporada 2026',
    'Documento oficial que establece las normas de competencia, formato de torneo, requisitos de participación y código de conducta de la Liga Argentina de Béisbol para la temporada 2026.',
    'https://pub-5b07d2936dcb48edb78f689a4c9ac3b9.r2.dev/documentos/reglamento-lab-2026.pdf',
    'reglamento',
    '2026-01-15',
    true
  ),
  (
    'Reglamento de Jugadores Extranjeros',
    'Normas que regulan la incorporación, cantidad y participación de jugadores extranjeros en los equipos de la Liga Argentina de Béisbol.',
    'https://pub-5b07d2936dcb48edb78f689a4c9ac3b9.r2.dev/documentos/reglamento-extranjeros-2026.pdf',
    'reglamento',
    '2026-01-15',
    true
  ),
  (
    'Circular N° 01/2026 — Inicio de temporada',
    'Comunicado oficial de la LAB informando las fechas de inicio, sede de los partidos y requisitos de inscripción de jugadores para la temporada 2026.',
    'https://pub-5b07d2936dcb48edb78f689a4c9ac3b9.r2.dev/documentos/circular-01-2026.pdf',
    'circular',
    '2026-02-01',
    true
  ),
  (
    'Acta de Asamblea Fundacional — 2017',
    'Documento histórico: acta de la asamblea donde se oficializó la creación de la Liga Argentina de Béisbol en 2017, firmada por los representantes de los seis clubes fundadores.',
    'https://pub-5b07d2936dcb48edb78f689a4c9ac3b9.r2.dev/documentos/acta-fundacional-lab-2017.pdf',
    'acta',
    '2017-09-15',
    true
  );
