# Revisión del documento Pendientes - WEB - Fase 2 (1)

Fecha: 2026-10-19. Fuente: `C:\Users\ezequ\Downloads\Pendientes - WEB - Fase 2 (1).md`, incluida su imagen PNG embebida. Revisión de código local, ficha del proyecto y producción. No se modificó código, configuración ni datos del sitio.

## Resultado por punto

| # | Pedido | Estado | Evidencia / siguiente acción |
|---|---|---|---|
| 1 | Logo de Vélez administrable | Resuelto en implementación y propagación actual | `src/lib/club-logo.ts:10-20` respeta `logo_url`; el único override es Arias. La URL de Vélez consultada en producción aparece en la portada. No se hizo una nueva carga de logo durante esta revisión. |
| 2 | Horario creado igual al mostrado | Parcial; revisar vistas públicas | Admin convierte explícitamente UTC-3 al guardar/editar (`PartidosAdmin.tsx:81-85`, `date-time.ts`). Fixture y detalle usan `date-fns format(new Date(...))` sin zona explícita (`FixtureTabs.tsx:68-71`, `fixture/[id]/page.tsx:104`). No debe darse por cerrado para todas las vistas/navegadores. |
| 3 | Visitante primero, local segundo | Resuelto | `FixtureTabs.tsx:77-87`, `Scoreboard.tsx:56-69`, detalle `fixture/[id]/page.tsx:108-129`; portada y partido DAOM–Vélez muestran DAOM primero. |
| 4 | Menú con nuevas secciones | Resuelto | Navbar incluye Estadísticas y Archivo; confirmado en sitio público. |
| 5 | Carrusel desde la fecha más próxima | Resuelto para calendario vigente | Consulta de portada ordena `fecha_hora` ascendente (`src/app/page.tsx:48`). Producción comienza el 31 de octubre y continúa 1, 4, 6 y 7 de noviembre. No se simuló el paso del tiempo para otras temporadas. |
| 6 | Meet y revisión importación histórica | Realizado según bitácora | Reunión con Wilmer registrada el 30/09. Históricos 2017/2018/2019 publicados, con corrección de K/SO. No consta necesidad de una segunda capacitación en este documento. |
| 7 | Admin: La Liga / Línea de Tiempo | Resuelto según código | `src/app/admin/layout.tsx:52-53,78` agrupa Documentos y Línea de Tiempo en La Liga. Visibilidad depende del rol; no se hizo login administrativo en esta revisión. |
| 8 | Estadísticas por jugador | Resuelto | Perfil público de Agustín Tissera muestra bateo/fildeo por año, fase y carrera; los lanzadores tienen pitcheo. |
| 9 | Vista tabular tipo referencia, aparte de líderes | Parcial; precisar alcance | Las fichas ya tienen tablas anuales, pero `/estadisticas` sigue siendo tarjetas top 10 por métrica (`estadisticas/page.tsx:92-108,188-190`), no una tabla general de todos los jugadores. La imagen de referencia incluye columnas como Season, Age, Team/Lg, G/PA y métricas; no todas existen en la ficha actual ni deben inventarse (por ejemplo WAR). Confirmar si se quiere una tabla global o ampliar la de cada perfil. |
| 10 | IDs repetidos y explicación de slug | Parcial | Se consolidaron 29 identidades y se preservan inscripciones por temporada; siguen 14 nombres multiclub de 2019 pendientes de confirmación. `id` = fila de inscripción; `stable_id` = persona histórica; `slug` = segmento legible de URL, no identificador deportivo. No eliminar filas por temporada como si fueran duplicados. |
| 11 | Link de noticias mal generado | Pendiente confirmado al compartir | Tres noticias recientes abren HTTP 200, pero sus enlaces de compartir Facebook incorporan `http://localhost:3000/noticias/...`. `ShareButtons` también usa la misma URL para X, WhatsApp y copiar. Corregir URL pública/configuración, no confundirlo con un 404 del artículo. |
| 12 | Separar playoffs de regular | Parcial | Filtro de fase y filas de perfil separados funcionan. Sin embargo `Carrera` agrega todas las filas y las vistas históricas agrupan sin fase: los acumulados mezclan ambas. Si la separación debe ser completa, separar también los totales de carrera y rankings históricos. |
| 13 | Más antigua arriba, más nueva abajo | Pendiente confirmado | `player-season-stats.ts:91` ordena `b.year-a.year`. Producción en Tissera muestra 2019, 2018, 2017. El selector de temporadas también está descendente. |
| 14 | Cambiar correos del footer | Pendiente confirmado | `Footer.tsx:97` y producción siguen mostrando `contacto@lab.ar`. El documento no especifica las direcciones de reemplazo; pedirlas antes de usar un correo operativo como contacto público. |

## Hallazgos reproducidos

### Noticias

Ejemplo: `/noticias/el-sueno-cordobes-docta-disena-su-estrategia-y-se-arma-para-ir-por-la-gloria-en-el-beisbol-argentino`.

- Artículo HTTP 200.
- Facebook share: `https://www.facebook.com/sharer/sharer.php?u=http://localhost:3000/noticias/...`.
- Igual comportamiento en las noticias de DAOM y WUMSPORTS.
- El detalle compone la URL con `SITE_CONFIG.url` (`src/app/noticias/[slug]/page.tsx:116-119`). La configuración depende de `NEXT_PUBLIC_SITE_URL`; el fallback local es `https://lab.ar` (`constants.ts:48-53`). La URL pública observada es localhost: no se leyó ni alteró ninguna variable secreta.

### Horarios

Partido `486dfbd0-f08b-40b3-b118-858b49d2ceb7`, DAOM visitante y Vélez local:

- DB: `2026-10-31 13:00:00+00`.
- Hora correspondiente en Argentina: **10:00**.
- Detalle público muestra **13:00**.
- El fixture cliente formatea usando zona del navegador; en Argentina ese timestamp corresponde a 10:00. La revisión no operó un navegador interactivo para cambiar de pestaña ni creó un partido de prueba.
- No inferir cuál era la hora deportiva pretendida: primero unificar presentación explícita en Argentina y luego revisar si existen datos antiguos mal guardados.

### Acumulados por fase

En Tissera, 2019 regular tiene 58 AB y playoffs 7 AB. La fila Carrera suma 203 AB, incluyendo ambas fases junto con 2017/2018. `buildBattingSeasonLines()` agrega todo `rows`; la vista `v_stats_bateo_historico` también suma sin filtrar fase (`20260930195000_add_iscore_season_summaries.sql:273-284`).

## Prioridad recomendada

1. Corregir URL pública de enlaces de noticias y coherencia horaria.
2. Invertir orden anual de estadísticas.
3. Acordar y completar tabla global/referencia y separación de acumulados por fase.
4. Recibir correos correctos y confirmaciones de identidad de Wilmer.

No se aplicaron correcciones ni se publicó un deployment como parte de esta auditoría.
