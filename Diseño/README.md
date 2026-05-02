# LAB Design System — Liga Argentina de Béisbol

## Overview

The **Liga Argentina de Béisbol (LAB)** is Argentina's official baseball league. The LAB Platform is the league's official digital home: a sports media + management platform covering results, standings, club profiles, player rosters, historical archive, trivia, and internal administration.

**Stack:** Next.js 16 (App Router) + Supabase (PostgreSQL + Auth) + Tailwind CSS v4 + Cloudflare R2 (image storage)

**Source materials provided:**
- Codebase: `lab-platform/` (local mount via File System Access API)
- GitHub repo: `https://github.com/ezequielcs92/lab` (branch: `main`)
- Club info & logos: `lab-platform/INFO CLUBES Y LAB/` (Arias, Cachorros, Popeye, DAOM, Falcons, Patriots)
- Design Brief: `lab-platform/DESIGN_BRIEF.md`

---

## Products / Surfaces

| Surface | Description | Primary audience |
|---|---|---|
| **Public website** | Home, fixture, clubs, players, news, archive, trivia, la-liga | Fans, general public |
| **Admin panel** | CRUD for all entities, role-based access | Liga admins, club editors, journalists |

---

## Content Fundamentals

### Language & Tone
- **Language:** Spanish (Argentina). No English except technical abbreviations (AVG, ERA, HR, RBI, etc.)
- **Tone:** Authoritative, proud, communal. The voice of an established sports league — not casual, not stiff.
- **Register:** "La Liga", "nuestros clubes" — first-person plural, institutional ownership. Uses "vos" register implicitly.
- **Casing:** Headings in ALL CAPS (Bebas Neue enforces this). Nav links uppercase via CSS. Body text sentence case.
- **Emoji:** Never used. Zero emoji in the UI.
- **Punctuation:** Spanish conventions — opening ¿¡ on questions/exclamations, accents always present.
- **Numbers & stats:** Baseball abbreviations kept in English (AVG, ERA, HR, RBI, OBP, SLG, IP, SO, BB, W, L). Everything else in Spanish.
- **CTAs:** Short, active, uppercase — "VER FIXTURE", "VER DETALLES →", "MÁS →"
- **Empty states:** Respectful and forward-looking. e.g. "La tabla de posiciones se actualizará cuando comience la temporada"
- **Copy examples:**
  - Hero subtitle: *"La plataforma oficial del béisbol argentino. Resultados, estadísticas, archivo histórico y comunidad."*
  - Footer tagline: *"Desde 2017"*
  - Admin intent comment: *"Digital dugout clipboard"*

---

## Visual Foundations

### Color System
Deep navy/midnight blue. The palette is nicknamed "gold" in the codebase but is entirely steel-blue in execution. No true gold or yellow exists.

| Token | Hex | Role |
|---|---|---|
| `--color-lab-dark` | `#060F20` | Body background, deepest layer |
| `--color-lab-navy` | `#0B1D3A` | Navbar, footer, sidebar, clubs section |
| `--color-lab-navy-light` | `#132D52` | Navy variant |
| `--color-lab-surface` | `#0F2040` | Cards, inputs, content panels |
| `--color-lab-surface-light` | `#162D54` | Card hover, table headers |
| `--color-lab-border` | `#1C3A68` | All borders and dividers |
| `--color-lab-gold` | `#5AABDF` | Primary accent — CTAs, active icons, highlights |
| `--color-lab-gold-light` | `#7DC3EE` | Hover states of accent |
| `--color-lab-gold-dark` | `#3D8DC9` | Decorative bars, gradients |
| `--color-lab-red` | `#2563EB` | Live state, errors |
| `--color-lab-red-light` | `#60A5FA` | Live state text |
| `--color-lab-white` | `#F0F8FF` | Primary text, headings |
| `--color-lab-cream` | `#D6EAF8` | Soft secondary text |
| `--color-lab-gray` | `#94A3B8` | Body text, descriptions |
| `--color-lab-muted` | `#64748B` | Metadata, labels, inactive nav |

**Club dynamic colors:** Each club injects `colores.primario`, `colores.secundario`, `colores.acento` as inline CSS vars on player cards, club headers, and theming contexts.

**Semantic extras used in admin:**
- `emerald-400` — editor_club role dot, published status
- `sky-400` — periodista role dot
- `orange-400` — partidos stat
- `purple-400` — archivo stat
- `pink-400` — trivias stat
- `green-*` — correct trivia answers
- `red-*` — incorrect trivia answers

### Typography
- **Display (`--font-display`):** Bebas Neue — always uppercase, `tracking-wider` minimum. Used for H1/H2, scoreboard numbers, all major headings, stat values.
- **Body (`--font-body`):** Barlow — paragraphs, news content, bios, descriptions. Weights 400–800.
- **Condensed (`--font-condensed`):** Barlow Condensed — the dominant UI font. Nav, labels, badges, table headers, metadata, buttons. Weights 400–700. `tracking-wide` standard, `tracking-widest` for section labels.
- Loaded via Google Fonts with `display=swap`.

### Backgrounds & Surfaces
- **Layered depth without shadows:** `#060F20` → `#0B1D3A` → `#0F2040` → `#162D54` — elevation via background color stepping, not box-shadow.
- **Diamond pattern:** CSS repeating crosshatch (`bg-diamond-pattern`). Used as overlays on hero, player cards. Opacity ~10–30%.
- **Field gradient:** `linear-gradient(180deg, #060F20 0%, #0B1D3A 50%, #060F20 100%)` — hero section background.
- **Baseball stitch:** `repeating-linear-gradient` of dashes — decorative horizontal line in footer. Opacity 0.4.
- **No full-bleed photography** in the UI shell. Images appear in news articles, player photos, club banners, and archive media.

### Borders
- All borders use `--color-lab-border` (`#1C3A68`) at full opacity.
- Hover: border lightens to `lab-gold/30` or `lab-gold/50`.
- Border radius: `rounded-md` (6px) for buttons/inputs, `rounded-lg` (8px) for cards, `rounded-xl` (12px) for player cards, `rounded-full` for logo circles and live dots.

### Cards
- Background: `lab-surface` (`#0F2040`)
- Border: `1px solid #1C3A68`
- Radius: `rounded-lg` (standard), `rounded-xl` (player cards)
- No box-shadow — elevation from background step only.
- Hover: border shifts to `lab-gold/30`, subtle `hover:bg-lab-surface-light` in some contexts.
- Player cards: `hover:scale-105 hover:shadow-2xl` — the one place shadows are used.

### Animations
- `fadeInUp` — 0.6s ease-out — page entry
- `slideInRight` — 0.5s ease-out — sidepanel / list entries
- `pulse-gold` — 2s infinite — live dot pulsing, gold glow
- `card-shine` — shimmer sweep across player card on hover
- No spring physics or bounce — all `ease-out` or `ease-in-out`.

### Hover/Press States
- Color: muted → white text (nav links), border lightens to gold tint
- Scale: `hover:scale-105` (club cards, player cards), `hover:scale-110` (logo icon)
- `hover:-translate-y-1` — lift on club grid cards
- Buttons: `bg-lab-gold → bg-lab-gold-light` (primary), `border-lab-border → hover:border-lab-gold/50` (ghost)
- No opacity fade — color transitions preferred.

### Iconography (see ICONOGRAPHY section below)

### Imagery
- Player photos: portrait, object-cover object-top. Fallback: initials in Bebas Neue.
- News images: full-width hero, rounded-md, Cloudflare R2.
- Club logos: PNG files (see `assets/logos/`).
- Color treatment: cool/dark-shifted imagery fits the navy palette. No warm filters.

### Corner Radii Summary
- `rounded-sm` — club color square badge (4px)
- `rounded-md` — buttons, inputs (6px)
- `rounded-lg` — standard cards, panels (8px)
- `rounded-xl` — player cards (12px)
- `rounded-full` — logo, live dot, avatar initials

### Layout
- Max content width: `max-w-7xl` (1280px) with `px-4` gutters.
- Navbar: `fixed top-0`, 64px height + 4px gold accent top bar = 68px total.
- Admin sidebar: `w-60` (240px) fixed, flex layout.
- Grid systems: 2/3/6 col for clubs, 2/3 main for standings+news, 1/2 for admin dashboard panels.
- Scroll: horizontal `snap-x snap-mandatory` for scoreboard. Custom scrollbar styled with border color + gold thumb.

---

## ICONOGRAPHY

**Icon library:** [Lucide React](https://lucide.dev) — consistent stroke-weight 2, no fill variants.

Icons used in the project:
- `Trophy` — Liga, standings, quick links
- `Calendar` — Fixture CTA
- `Users` — Clubes CTA, jugadores
- `ArrowRight` — "ver todos" links
- `Archive` — Archivo histórico
- `Gamepad2` — Trivias
- `Shield` — Clubes (admin), Admin link
- `Newspaper` — Noticias
- `Menu` / `X` — Mobile hamburger
- `LayoutDashboard` — Admin dashboard
- `Swords` — Partidos (admin)
- `HelpCircle` — Trivias (admin)
- `LogOut` — Sign out
- `ChevronRight` — Admin nav hover arrow
- `TrendingUp` — Last activity (admin)
- `Mail` / `MapPin` — Footer contact
- `CheckCircle` / `XCircle` — Trivia correct/incorrect
- `Lightbulb` — Trivia header
- `Trophy` / `BookOpen` / `FileText` / `Camera` / `Medal` / `Heart` — Archive milestone types
- `LayoutDashboard` / `Shield` / `Users` / `Newspaper` / `Swords` / `Archive` / `HelpCircle` — Admin sidebar

**Custom SVG:** `InstagramIcon` — custom inline SVG in `Footer.tsx`. Standard Lucide-style stroke.

**No icon font or sprite sheet.** All icons are inline React components from Lucide.

**Emoji:** Never used anywhere in the product.

---

## File Index

```
README.md                    — This file
SKILL.md                     — Agent skill definition
colors_and_type.css          — All CSS custom properties (colors + typography)
assets/
  logos/                     — Club PNG logos (Arias, Cachorros, Popeye, DAOM, Falcons, Patriots)
preview/
  colors-base.html           — Base color palette swatches
  colors-semantic.html       — Semantic / state colors
  typography-display.html    — Bebas Neue specimens
  typography-body.html       — Barlow + Barlow Condensed specimens
  spacing-tokens.html        — Radii, borders, elevation system
  patterns-backgrounds.html  — Diamond pattern, gradients, stitch
  component-navbar.html      — Navbar component
  component-footer.html      — Footer component
  component-buttons.html     — Button variants
  component-cards.html       — Card variants
  component-scoreboard.html  — Scoreboard / ScoreCard
  component-standings.html   — Standings table
  component-playercard.html  — Player trading card
  component-trivia.html      — Trivia card states
  component-timeline.html    — Archive timeline
  component-badges.html      — Badges, status pills, labels
  brand-logos.html           — Club logos + LAB identity
ui_kits/
  public/
    README.md
    index.html               — Public website prototype (Home → Club → Player → News)
  admin/
    README.md
    index.html               — Admin panel prototype (Dashboard → CRUD panels)
```
