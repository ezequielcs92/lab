# LAB Public UI Kit

Interactive prototype of the LAB Platform public-facing website.

## Screens
- **Home** — Hero + Scoreboard + Standings/News grid + Clubs + Players + Quick links + Footer
- **Fixture** — Grouped-by-jornada match list with status badges
- **Clubes** — Club grid with logos
- **Club Profile (Falcons)** — Themed header + roster tab + player rows
- **Noticias** — Featured + list layout
- **Artículo** — Full news article
- **Jugadores** — Filtered player card grid
- **La Liga** — Institutional page with key stats

## Navigation
All screens are wired via `showScreen(name)` — click any nav link, card, or CTA to navigate.
Link to admin panel: `../admin/index.html`

## Design Notes
- Fonts: Bebas Neue (display), Barlow (body), Barlow Condensed (UI)
- Colors: all from `../../colors_and_type.css`
- Club logos: `../../assets/logos/`
- Player cards: trading-card style with dynamic club colors
