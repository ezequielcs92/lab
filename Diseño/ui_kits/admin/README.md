# LAB Admin UI Kit

Interactive prototype of the LAB Platform admin panel.

## Screens
- **Dashboard** — Stat counters (6 entities) + Próximos Partidos + Última Actividad
- **Clubes** — Data table with color swatches + Edit modal
- **Jugadores** — Data table with filters (club/position) + New player modal
- **Partidos** — Fixture management table with live state
- **Noticias** — Editorial table with status + Edit/New modals
- **Archivo** — Historical milestones table
- **Trivias** — Question bank with difficulty dots

## Navigation
Click sidebar links to switch screens. Modals open on action buttons (Nuevo, Editar).
Link back to public site: sidebar "Ver Sitio" link.

## Design Notes
- "Digital dugout clipboard" — dense, utilitarian, border-based elevation
- Sidebar: 240px fixed, `--color-lab-navy` bg
- Surfaces: `--color-lab-dark` base → `--color-lab-surface` cards
- Role dots: gold = admin_liga, emerald = editor_club, sky = periodista
- All icons: Lucide inline SVG (stroke-width 2)
