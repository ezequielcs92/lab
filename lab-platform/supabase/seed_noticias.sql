-- =============================================================
-- LAB - Noticias de prueba
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- =============================================================

INSERT INTO noticias (titulo, slug, extracto, contenido, publicada, destacada, fecha_publicacion)
VALUES

(
  'DAOM campeón: bicampeón de la Liga Argentina de Béisbol',
  'daom-campeon-bicampeon-lab-2025',
  'Club DAOM se consagró campeón de la temporada 2025 de la Liga Argentina de Béisbol y representará a la Argentina en la Serie de las Américas 2026 en Venezuela.',
  'En una final disputada y emocionante, el Club Atlético Obras Municipales (DAOM) se consagró campeón de la temporada 2025 de la Liga Argentina de Béisbol, logrando así su segundo título consecutivo luego del obtenido en 2024.

El equipo dirigido por Fabricio Curtti demostró una sólida campaña a lo largo de todo el torneo, que se extendió desde el 11 de octubre hasta el 7 de diciembre de 2025, con un total de 66 juegos y 22 partidos por equipo en la fase regular.

Como campeón de la LAB, DAOM tendrá el honor de representar a la Argentina en la Serie de las Américas 2026, que se disputará en Venezuela. Esta es la segunda participación consecutiva del club porteño en el certamen internacional, luego de haber participado en Nicaragua en 2025.

La consagración de DAOM corona un proceso de crecimiento sostenido que en 2021 les vio ganar todas las categorías de competencia de la Liga Metropolitana de Béisbol en simultáneo — un hito histórico sin precedentes en el béisbol argentino.',
  true,
  true,
  NOW() - INTERVAL '10 days'
),

(
  'La LAB en la Serie de las Américas: Argentina en Venezuela',
  'lab-serie-americas-2026-venezuela',
  'La Liga Argentina de Béisbol confirmó la participación de su campeón en la Serie de las Américas 2026, que se disputará en Venezuela. DAOM llevará los colores argentinos.',
  'La Liga Argentina de Béisbol (LAB) confirmó la participación de su campeón, el Club DAOM, en la Serie de las Américas 2026, el torneo internacional de clubes más importante de la región.

La competencia se disputará en Venezuela y reunirá a los mejores clubes de béisbol de América Latina. Para la Argentina, esta es ya una tradición que comenzó en 2019, cuando por primera vez el campeón de la LAB representó al país en una competencia internacional de clubes.

Desde 2019, año en que se participó de la Serie Latinoamericana, el béisbol argentino ha dado un salto cualitativo en su proyección internacional. La consolidación de la LAB como la principal competencia interprovincial del país ha sido clave en este proceso.

La delegación argentina, encabezada por DAOM, afrontará el certamen con la experiencia acumulada en ediciones anteriores y con el objetivo de continuar posicionando al béisbol argentino en el mapa continental.',
  true,
  false,
  NOW() - INTERVAL '5 days'
),

(
  'Temporada 2026: la LAB prepara su nueva edición',
  'temporada-2026-lab-preparacion',
  'La Liga Argentina de Béisbol ya trabaja en la organización de la temporada 2026, que volverá a reunir a los seis clubes de Salta, Córdoba y Buenos Aires en la competencia interprovincial más importante del béisbol argentino.',
  'Con el reciente cierre de la temporada 2025 y la participación en la Serie de las Américas todavía fresca, la Liga Argentina de Béisbol (LAB) ya tiene la vista puesta en la próxima temporada.

La organización trabaja en la planificación del calendario 2026, que mantendrá el formato de round robin que ha caracterizado a la competencia desde sus inicios: todos contra todos, partidos a siete innings, con enfrentamientos dentro de cada provincia y cruces interprovinciales.

Los seis equipos que conformarán la grilla serán los mismos que en la edición anterior: Falcons y Arias de Córdoba, Infernales y Cachorros de Salta, y Patriots y DAOM de Buenos Aires.

La temporada es una oportunidad para que los jugadores argentinos eleven su nivel en el contexto más exigente del béisbol nacional, compartiendo plantel con refuerzos profesionales extranjeros que elevan el nivel competitivo del torneo.

La fecha de inicio y el calendario completo serán comunicados próximamente a través de los canales oficiales de la Liga.',
  true,
  false,
  NOW() - INTERVAL '2 days'
);
