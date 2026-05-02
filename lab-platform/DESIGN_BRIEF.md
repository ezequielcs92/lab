# Brief de Diseño — LAB Platform (Liga Argentina de Béisbol)

## Contexto General

Plataforma oficial de la Liga Argentina de Béisbol. Combina sports media (feed editorial, scores, posiciones) con gestión interna (admin por roles). Stack: Next.js 16 + Supabase + Tailwind v4. Imágenes en Cloudflare R2.

---

## 1. Paleta de Colores

| Token | Nombre | Hex | Uso |
|---|---|---|---|
| `--color-lab-dark` | Dark Base | `#060F20` | Fondo del body, fondo principal |
| `--color-lab-navy` | Navy | `#0B1D3A` | Navbar, footer, sidebar admin, sección clubes |
| `--color-lab-navy-light` | Navy Light | `#132D52` | Variante de navy |
| `--color-lab-surface` | Surface | `#0F2040` | Cards, inputs, paneles de contenido |
| `--color-lab-surface-light` | Surface Light | `#162D54` | Cards hover, encabezados de tabla |
| `--color-lab-border` | Border | `#1C3A68` | Todos los bordes y divisores |
| `--color-lab-gold` | Gold (Acento principal) | `#5AABDF` | CTAs, highlights, íconos activos |
| `--color-lab-gold-light` | Gold Light | `#7DC3EE` | Hover states del acento |
| `--color-lab-gold-dark` | Gold Dark | `#3D8DC9` | Barras decorativas, gradientes |
| `--color-lab-red` | Red/Blue | `#2563EB` | Estado "en vivo", errores |
| `--color-lab-red-light` | Red Light | `#60A5FA` | Texto estado live |
| `--color-lab-white` | White | `#F0F8FF` | Texto principal, títulos |
| `--color-lab-cream` | Cream | `#D6EAF8` | Texto secundario suave |
| `--color-lab-gray` | Gray | `#94A3B8` | Cuerpo de texto, descripciones |
| `--color-lab-muted` | Muted | `#64748B` | Metadatos, etiquetas, nav inactivo |

> **Nota:** "Gold" en el código son azules acero (`#5AABDF`) — la paleta es navy/azul profundo, no dorada clásica. Los nombres heredan convención de diseño de béisbol pero la paleta es completamente azul.

### Gradientes clave

```css
/* Hero field */
linear-gradient(180deg, #060F20 0%, #0B1D3A 50%, #060F20 100%)

/* Gold / acento */
linear-gradient(135deg, #3D8DC9, #5AABDF, #7DC3EE)

/* Top bar accent */
linear-gradient(90deg, #3D8DC9, #5AABDF, #3D8DC9)
```

### Colores dinámicos de clubes

Los campos `colores { primario, secundario, acento }` de cada club se inyectan como CSS custom properties en tiempo de ejecución en las páginas de perfil de club, headers temáticos y PlayerCards.

---

## 2. Tipografías

| Variable | Familia | Fallback | Uso |
|---|---|---|---|
| `--font-display` | **Bebas Neue** | Impact, sans-serif | Títulos, H1/H2, números de scoreboard, headings hero |
| `--font-body` | **Barlow** | Helvetica Neue, sans-serif | Párrafos, cuerpo de noticias, bios |
| `--font-condensed` | **Barlow Condensed** | Arial Narrow, sans-serif | Nav, labels, filtros, badges, toda la UI utilitaria |

Fuente vía Google Fonts con `display=swap`.

**Comportamiento tipográfico:**
- Bebas Neue siempre en MAYÚSCULAS con `tracking-wider` / `tracking-widest`
- Barlow Condensed dominante en la UI (labels, nav, badges)
- Escala H1: `text-5xl` → `text-7xl` en hero

---

## 3. Estilo General de Diseño

- **Modo:** Oscuro profundo — fondo `#060F20`, superficies en azul navy
- **Tono:** Deportivo profesional inspirado en el béisbol norteamericano
- **Vocabulario visual:** Patrones diamante (campo de juego), costuras de pelota (`baseball-stitch`), gradientes "field"
- **Elevación:** Sin box-shadows agresivos — diferencia de fondo entre capas (`#060F20` → `#0B1D3A` → `#0F2040`) + bordes `#1C3A68`
- **Movimiento:** `fadeInUp`, `slideInRight`, `pulse-gold`, `card-shine` (hover en PlayerCard)
- **Renders:** ISR con revalidación 60–600 segundos según página

---

## 4. Rutas y Páginas

### Públicas

| Ruta | Propósito |
|---|---|
| `/` | Hero + scoreboard horizontal + tabla de posiciones + noticias + grid de clubes |
| `/fixture` | Partidos agrupados por jornada + tabla de posiciones completa |
| `/clubes` | Grid de todos los clubes con barra de color del equipo |
| `/[slug]` | Perfil de club: header temático, roster, staff, galería, historia |
| `/noticias` | Feed editorial (primera nota featured en 2/3 columnas) |
| `/noticias/[slug]` | Artículo completo: imagen hero, club badge, contenido HTML |
| `/jugadores` | Roster completo con filtros por club y posición |
| `/jugadores/[slug]` | PlayerCard grande + estadísticas detalladas + bio |
| `/archivo` | Timeline zigzag histórica con filtros por tipo de hito |
| `/trivias` | Quiz secuencial one-by-one con progress bar |
| `/la-liga` | Hub institucional: stats clave, quiénes somos, competencia |
| `/la-liga/historia` | Timeline cronológico 1890s–2025 |
| `/la-liga/autoridades` | Grid de la comisión directiva con avatar initials |
| `/la-liga/reglamentos` | Lista de documentos descargables |

### Admin (requiere auth)

| Ruta | Roles con acceso | Propósito |
|---|---|---|
| `/login` | Todos | Formulario email/password → Supabase Auth |
| `/admin` | admin_liga, editor_club, periodista | Dashboard: contadores + próximos partidos + últimas noticias |
| `/admin/clubes` | admin_liga | CRUD de clubes |
| `/admin/jugadores` | admin_liga, editor_club | CRUD de jugadores con filtro por club |
| `/admin/partidos` | admin_liga | CRUD de partidos, scores, estados |
| `/admin/noticias` | admin_liga, editor_club, periodista | CRUD de noticias con RichEditor + upload a R2 |
| `/admin/archivo` | admin_liga | CRUD de hitos históricos |
| `/admin/trivias` | admin_liga | CRUD de trivias con opciones y respuesta correcta |

---

## 5. Secciones de la Home (`/`)

1. **Hero** — Fondo `bg-field-gradient` + patrón diamante superpuesto. Isologo "L" circular. H1 gigante en Bebas Neue. Subtítulo en Barlow Condensed. Dos CTAs: "Ver Fixture" (filled gold) + "Clubes" (ghost border).

2. **Scoreboard** — Banda horizontal scrolleable con `snap-x`. Cards de 272px ancho fijo. Estado live con live-dot pulsante en azul.

3. **Tabla de Posiciones + Noticias** — Grid 2/3 + 1/3. Tabla responsive con encabezados en gold uppercase. Noticias como lista de cards linkables.

4. **Nuestros Clubes** — Fondo navy. Grid responsive 2/3/6 columnas. Card circular con color del club + hover lift.

5. **Jugadores Destacados** — Grid de PlayerCards estilo trading cards de coleccionables.

---

## 6. Componentes Clave

| Componente | Descripción |
|---|---|
| `Navbar` | Fixed top 64px + barra gold 4px arriba. Logo "L" circular. Links condensed uppercase desktop. Mobile hamburger con íconos. "La Liga" y "Admin" separados a la derecha. |
| `Footer` | Grid 4 columnas (brand, navegación, la-liga, contacto). Línea "baseball stitch" decorativa en el tope. SVG custom de Instagram. |
| `Scoreboard` | Scroll horizontal `snap-x`, cards 272px fijos. Live-dot pulsante en partidos en curso. Muestra equipos, marcador, estado. |
| `StandingsTable` | Tabla responsive con columnas progresivamente visibles (sm/md). 1° posición con fondo gold/5. |
| `PlayerCard` | Trading card estilo coleccionable. Tamaños sm/md/lg. Colores dinámicos del club, patrón diamante, efecto shine en hover. Muestra posición, número, foto, nombre, stats clave. |
| `Timeline` | Zigzag izquierda/derecha en desktop, lineal en mobile. Línea vertical central. Dot con ícono por tipo de hito. |
| `TriviaCard` | Single-question. Opciones A/B/C/D con reveal visual verde/rojo. Barra de dificultad con dots. Explicación post-respuesta. |
| `MVPVoting` | Componente de votación al MVP de un partido. |
| `RichEditor` | TinyMCE (skin dark) con upload de imágenes inline directo a Cloudflare R2. |

---

## 7. Layout del Admin

- **Sidebar fijo:** 240px de ancho, fondo navy
- **Área principal:** fondo dark, scrolleable
- **Sidebar contiene:**
  - Logo LAB + "Panel Admin"
  - Nav con íconos Lucide: Dashboard, Clubes, Jugadores, Partidos, Noticias, Archivo, Trivias
  - Footer de sidebar: nombre del usuario, dot de color por rol (`gold`=admin, `emerald`=editor, `sky`=periodista), botón "Cerrar Sesión"

**Estilo:** "Digital dugout clipboard" — sin Navbar ni Footer públicos. Diseño denso y utilitario.

---

## 8. Entidades de la Base de Datos

| Tabla | Campos principales |
|---|---|
| **temporadas** | id, anio, nombre, fecha_inicio, fecha_fin, activa |
| **clubes** | id, nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores `{primario, secundario, acento}`, logo_url, banner_url, redes_sociales |
| **jugadores** | id, nombre, slug, numero_camiseta, posicion, fecha_nacimiento, lugar_nacimiento, batea, lanza, foto_url, club_id, temporada_id, bio + stats: avg, hr, rbi, era, w, l, so, bb, h, ab, r, sb, obp, slg, ip |
| **partidos** | id, temporada_id, fecha_numero, local_id, visitante_id, fecha_hora, estadio, marcador_local, marcador_visitante, estado, streaming_url, mvp_jugador_id, resumen |
| **noticias** | id, titulo, slug, extracto, contenido (HTML), imagen_url, autor_id, club_id, publicada, destacada, fecha_publicacion |
| **archivo_historico** | id, fecha_hito, titulo, descripcion, tipo, media_url, media_urls[], club_id, temporada_referencia, fuente |
| **trivias** | id, pregunta, opciones (JSON array), respuesta_correcta (índice 0-3), explicacion, dificultad (1-3), archivo_historico_id, activa |
| **posiciones** | club_id, pj, pg, pp, pe, cf, cc, dif, pts |
| **autoridades** | id, nombre, cargo, bio, activo, orden |
| **documentos** | id, titulo, descripcion, archivo_url, tipo, publico, fecha_documento |
| **perfiles** | id (= auth uid), nombre, rol, club_id |
| **staff_clubes** | id, club_id, nombre, cargo, foto_url, orden |
| **galeria_clubes** | id, club_id, imagen_url, caption, orden |

### Tipos enum

```
PosicionJugador: pitcher | catcher | 1B | 2B | 3B | shortstop | LF | CF | RF | DH | utility
EstadoPartido:  programado | en_curso | finalizado | suspendido | cancelado
TipoHito:       campeon | historia | documento | foto_historica | record | homenaje
RolUsuario:     admin_liga | editor_club | periodista | usuario
```

---

## 9. Flujo de Usuario

```
/ (Home)
├── Scoreboard → /fixture (tabla + calendario completo)
├── Grid de clubes → /clubes → /[slug] (perfil: roster + galería)
├── Noticias → /noticias → /noticias/[slug] (artículo completo)
├── Jugadores → /jugadores → /jugadores/[slug] (perfil + stats)
├── → /archivo (timeline histórica filtrable)
├── → /trivias (quiz secuencial)
└── → /la-liga (hub institucional)
    ├── /la-liga/historia
    ├── /la-liga/autoridades
    └── /la-liga/reglamentos

/login → /admin (sidebar 240px, acceso por rol)
         ├── Dashboard (contadores + resumen operativo)
         ├── /admin/clubes
         ├── /admin/jugadores
         ├── /admin/partidos
         ├── /admin/noticias  ← uploads de imágenes a Cloudflare R2
         ├── /admin/archivo
         └── /admin/trivias
```

**Flujo visitante típico:** Home → scoreboard → perfil de club → jugador → noticias

**Flujo admin:** Login → Dashboard → gestión de partidos y noticias → cambio de estados en vivo

---

## 10. Storage de Imágenes

- **Proveedor:** Cloudflare R2
- **Bucket:** `lab-media`
- **Endpoint:** `https://cb4c43d5dffeca6bf82b94d4297caff6.r2.cloudflarestorage.com`
- **Carpetas:**
  - `noticias/portadas/` — imágenes de portada de noticias
  - `noticias/contenido/` — imágenes insertadas en el RichEditor
- **Ruta de archivo:** `{carpeta}/{timestamp}-{random}.{ext}`
- **Upload flow:** Cliente → POST `/api/upload` (FormData) → API valida tipo/tamaño → sube a R2 → retorna URL pública → se guarda en BD
