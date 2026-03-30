-- ============================================================
-- Liga Argentina de Béisbol (LAB) - Esquema de Base de Datos
-- Fase 1: Estructura completa con campos preparados para Fase 2/3
-- ============================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- TIPOS ENUMERADOS
-- ============================================================

CREATE TYPE posicion_jugador AS ENUM (
  'pitcher', 'catcher', 'primera_base', 'segunda_base',
  'tercera_base', 'shortstop', 'left_field', 'center_field',
  'right_field', 'designated_hitter', 'utility'
);

CREATE TYPE estado_partido AS ENUM (
  'programado', 'en_curso', 'finalizado', 'suspendido', 'cancelado'
);

CREATE TYPE tipo_hito AS ENUM (
  'campeon', 'historia', 'documento', 'foto_historica', 'record', 'homenaje'
);

CREATE TYPE rol_usuario AS ENUM (
  'admin_liga', 'editor_club', 'periodista', 'usuario'
);

-- ============================================================
-- TABLAS PRINCIPALES
-- ============================================================

-- Temporadas
CREATE TABLE temporadas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anio INTEGER NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL,
  fecha_inicio DATE,
  fecha_fin DATE,
  activa BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Clubes
CREATE TABLE clubes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(150) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  nombre_corto VARCHAR(50),
  historia TEXT,
  fundacion INTEGER,
  sede VARCHAR(255),
  estadio_nombre VARCHAR(200),
  estadio_coords GEOGRAPHY(POINT, 4326),
  colores JSONB DEFAULT '{"primario": "#000000", "secundario": "#FFFFFF", "acento": "#CCCCCC"}'::jsonb,
  logo_url TEXT,
  banner_url TEXT,
  contacto_email VARCHAR(255),
  redes_sociales JSONB DEFAULT '{}'::jsonb,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clubes_slug ON clubes(slug);
CREATE INDEX idx_clubes_activo ON clubes(activo);

-- Staff de clubes
CREATE TABLE staff_clubes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  cargo VARCHAR(150) NOT NULL,
  foto_url TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_staff_club ON staff_clubes(club_id);

-- Jugadores
CREATE TABLE jugadores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  numero_camiseta INTEGER,
  posicion posicion_jugador NOT NULL,
  fecha_nacimiento DATE,
  lugar_nacimiento VARCHAR(200),
  batea VARCHAR(20), -- derecha / izquierda / switch
  lanza VARCHAR(20), -- derecha / izquierda
  foto_url TEXT,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  temporada_id UUID REFERENCES temporadas(id),
  activo BOOLEAN DEFAULT true,
  bio TEXT,
  -- Campos de estadísticas (Fase 2 - nullables)
  avg FLOAT,         -- Batting Average
  hr INTEGER,        -- Home Runs
  rbi INTEGER,       -- Runs Batted In
  era FLOAT,         -- Earned Run Average (pitchers)
  w INTEGER,         -- Wins (pitchers)
  l INTEGER,         -- Losses (pitchers)
  so INTEGER,        -- Strikeouts
  bb INTEGER,        -- Bases on Balls
  h INTEGER,         -- Hits
  ab INTEGER,        -- At Bats
  r INTEGER,         -- Runs
  sb INTEGER,        -- Stolen Bases
  obp FLOAT,         -- On Base Percentage
  slg FLOAT,         -- Slugging Percentage
  ip FLOAT,          -- Innings Pitched
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_jugadores_club ON jugadores(club_id);
CREATE INDEX idx_jugadores_slug ON jugadores(slug);
CREATE INDEX idx_jugadores_activo ON jugadores(activo);
CREATE INDEX idx_jugadores_posicion ON jugadores(posicion);

-- Partidos
CREATE TABLE partidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  fecha_numero INTEGER, -- Fecha/Jornada del torneo
  local_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  visitante_id UUID NOT NULL REFERENCES clubes(id) ON DELETE RESTRICT,
  fecha_hora TIMESTAMPTZ NOT NULL,
  estadio VARCHAR(255),
  marcador_local INTEGER,
  marcador_visitante INTEGER,
  estado estado_partido DEFAULT 'programado',
  -- Placeholder para Fase 3: streaming
  streaming_url TEXT,
  mvp_jugador_id UUID REFERENCES jugadores(id),
  resumen TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT chk_equipos_diferentes CHECK (local_id != visitante_id)
);

CREATE INDEX idx_partidos_temporada ON partidos(temporada_id);
CREATE INDEX idx_partidos_local ON partidos(local_id);
CREATE INDEX idx_partidos_visitante ON partidos(visitante_id);
CREATE INDEX idx_partidos_estado ON partidos(estado);
CREATE INDEX idx_partidos_fecha ON partidos(fecha_hora);

-- Noticias
CREATE TABLE noticias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  extracto TEXT,
  contenido TEXT NOT NULL,
  imagen_url TEXT,
  autor_id UUID REFERENCES auth.users(id),
  club_id UUID REFERENCES clubes(id), -- NULL = noticia general de la liga
  publicada BOOLEAN DEFAULT false,
  destacada BOOLEAN DEFAULT false,
  fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_noticias_slug ON noticias(slug);
CREATE INDEX idx_noticias_club ON noticias(club_id);
CREATE INDEX idx_noticias_publicada ON noticias(publicada);
CREATE INDEX idx_noticias_fecha ON noticias(fecha_publicacion DESC);

-- Archivo Histórico
CREATE TABLE archivo_historico (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_hito DATE NOT NULL,
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  tipo tipo_hito NOT NULL,
  media_url TEXT,
  media_urls JSONB DEFAULT '[]'::jsonb, -- galería múltiple
  club_id UUID REFERENCES clubes(id), -- NULL = hito de la liga
  temporada_referencia INTEGER,
  fuente VARCHAR(300),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_archivo_fecha ON archivo_historico(fecha_hito);
CREATE INDEX idx_archivo_tipo ON archivo_historico(tipo);

-- Trivias
CREATE TABLE trivias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL, -- ["opcion1", "opcion2", "opcion3", "opcion4"]
  respuesta_correcta INTEGER NOT NULL, -- índice 0-3
  explicacion TEXT,
  dificultad INTEGER DEFAULT 1, -- 1=fácil, 2=media, 3=difícil
  archivo_historico_id UUID REFERENCES archivo_historico(id),
  activa BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trivias_activa ON trivias(activa);

-- Votos MVP
CREATE TABLE votos_mvp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partido_id UUID NOT NULL REFERENCES partidos(id) ON DELETE CASCADE,
  jugador_id UUID NOT NULL REFERENCES jugadores(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL, -- para evitar spam sin requerir auth
  ip_hash VARCHAR(64), -- hash para rate limiting
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_voto_sesion UNIQUE(partido_id, session_id)
);

CREATE INDEX idx_votos_partido ON votos_mvp(partido_id);
CREATE INDEX idx_votos_jugador ON votos_mvp(jugador_id);

-- Perfiles de usuario (extiende auth.users)
CREATE TABLE perfiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre VARCHAR(200),
  avatar_url TEXT,
  rol rol_usuario DEFAULT 'usuario',
  club_id UUID REFERENCES clubes(id), -- para editor_club
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_perfiles_rol ON perfiles(rol);
CREATE INDEX idx_perfiles_club ON perfiles(club_id);

-- Autoridades de la liga
CREATE TABLE autoridades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  cargo VARCHAR(200) NOT NULL,
  foto_url TEXT,
  bio TEXT,
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Documentos oficiales (reglamentos, etc.)
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  titulo VARCHAR(300) NOT NULL,
  descripcion TEXT,
  archivo_url TEXT NOT NULL,
  tipo VARCHAR(100), -- reglamento, circular, acta
  fecha_documento DATE,
  publico BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Galería de fotos de clubes
CREATE TABLE galeria_clubes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  imagen_url TEXT NOT NULL,
  titulo VARCHAR(200),
  descripcion TEXT,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_galeria_club ON galeria_clubes(club_id);

-- Tabla de posiciones (materializada por temporada)
CREATE TABLE posiciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  temporada_id UUID NOT NULL REFERENCES temporadas(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubes(id) ON DELETE CASCADE,
  pj INTEGER DEFAULT 0,  -- Partidos Jugados
  pg INTEGER DEFAULT 0,  -- Partidos Ganados
  pp INTEGER DEFAULT 0,  -- Partidos Perdidos
  pe INTEGER DEFAULT 0,  -- Partidos Empatados
  cf INTEGER DEFAULT 0,  -- Carreras a Favor
  cc INTEGER DEFAULT 0,  -- Carreras en Contra
  dif INTEGER GENERATED ALWAYS AS (cf - cc) STORED,
  pts INTEGER DEFAULT 0, -- Puntos
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_posicion UNIQUE(temporada_id, club_id)
);

CREATE INDEX idx_posiciones_temporada ON posiciones(temporada_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE jugadores ENABLE ROW LEVEL SECURITY;
ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE archivo_historico ENABLE ROW LEVEL SECURITY;
ALTER TABLE trivias ENABLE ROW LEVEL SECURITY;
ALTER TABLE votos_mvp ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE galeria_clubes ENABLE ROW LEVEL SECURITY;
ALTER TABLE posiciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE autoridades ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE temporadas ENABLE ROW LEVEL SECURITY;

-- Lectura pública para contenido visible
CREATE POLICY "Clubes visibles públicamente" ON clubes FOR SELECT USING (true);
CREATE POLICY "Jugadores visibles públicamente" ON jugadores FOR SELECT USING (true);
CREATE POLICY "Partidos visibles públicamente" ON partidos FOR SELECT USING (true);
CREATE POLICY "Archivo visible públicamente" ON archivo_historico FOR SELECT USING (true);
CREATE POLICY "Trivias activas visibles" ON trivias FOR SELECT USING (activa = true);
CREATE POLICY "Noticias publicadas visibles" ON noticias FOR SELECT USING (publicada = true);
CREATE POLICY "Perfiles visibles" ON perfiles FOR SELECT USING (true);
CREATE POLICY "Staff visible" ON staff_clubes FOR SELECT USING (true);
CREATE POLICY "Galería visible" ON galeria_clubes FOR SELECT USING (true);
CREATE POLICY "Posiciones visibles" ON posiciones FOR SELECT USING (true);
CREATE POLICY "Autoridades visibles" ON autoridades FOR SELECT USING (activo = true);
CREATE POLICY "Documentos públicos visibles" ON documentos FOR SELECT USING (publico = true);
CREATE POLICY "Temporadas visibles" ON temporadas FOR SELECT USING (true);

-- Votos: cualquiera puede insertar (con restricción de sesión)
CREATE POLICY "Cualquiera puede votar" ON votos_mvp FOR INSERT WITH CHECK (true);
CREATE POLICY "Votos visibles" ON votos_mvp FOR SELECT USING (true);

-- Admin Liga: acceso total
CREATE POLICY "Admin modifica clubes" ON clubes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica jugadores" ON jugadores FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica partidos" ON partidos FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica noticias" ON noticias FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica archivo" ON archivo_historico FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica trivias" ON trivias FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica posiciones" ON posiciones FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica autoridades" ON autoridades FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica documentos" ON documentos FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

CREATE POLICY "Admin modifica temporadas" ON temporadas FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

-- Editor de Club: solo su club
CREATE POLICY "Editor modifica su club" ON clubes FOR UPDATE
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'editor_club' AND perfiles.club_id = clubes.id));

CREATE POLICY "Editor modifica jugadores de su club" ON jugadores FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'editor_club' AND perfiles.club_id = jugadores.club_id));

CREATE POLICY "Editor modifica staff de su club" ON staff_clubes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'editor_club' AND perfiles.club_id = staff_clubes.club_id));

CREATE POLICY "Editor modifica galería de su club" ON galeria_clubes FOR ALL
  USING (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'editor_club' AND perfiles.club_id = galeria_clubes.club_id));

-- Periodista: puede crear/editar noticias
CREATE POLICY "Periodista crea noticias" ON noticias FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol IN ('periodista', 'admin_liga')));

CREATE POLICY "Periodista edita sus noticias" ON noticias FOR UPDATE
  USING (autor_id = auth.uid() OR EXISTS (SELECT 1 FROM perfiles WHERE id = auth.uid() AND rol = 'admin_liga'));

-- Perfil propio
CREATE POLICY "Usuario edita su perfil" ON perfiles FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "Usuario crea su perfil" ON perfiles FOR INSERT
  WITH CHECK (id = auth.uid());

-- ============================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================

-- Actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_clubes_updated BEFORE UPDATE ON clubes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_jugadores_updated BEFORE UPDATE ON jugadores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_partidos_updated BEFORE UPDATE ON partidos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_noticias_updated BEFORE UPDATE ON noticias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_archivo_updated BEFORE UPDATE ON archivo_historico
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER tr_perfiles_updated BEFORE UPDATE ON perfiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Función para contar votos MVP por partido
CREATE OR REPLACE FUNCTION get_mvp_votes(p_partido_id UUID)
RETURNS TABLE(jugador_id UUID, nombre VARCHAR, foto_url TEXT, club_nombre VARCHAR, votos BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT v.jugador_id, j.nombre, j.foto_url, c.nombre as club_nombre, COUNT(*) as votos
  FROM votos_mvp v
  JOIN jugadores j ON v.jugador_id = j.id
  JOIN clubes c ON j.club_id = c.id
  WHERE v.partido_id = p_partido_id
  GROUP BY v.jugador_id, j.nombre, j.foto_url, c.nombre
  ORDER BY votos DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si un partido es votable (24hs post-finalización)
CREATE OR REPLACE FUNCTION is_partido_votable(p_partido_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_estado estado_partido;
  v_updated TIMESTAMPTZ;
BEGIN
  SELECT estado, updated_at INTO v_estado, v_updated
  FROM partidos WHERE id = p_partido_id;
  
  RETURN v_estado = 'finalizado' AND (NOW() - v_updated) < INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DATOS SEMILLA (Seed Data)
-- ============================================================

-- Temporada actual
INSERT INTO temporadas (anio, nombre, activa) VALUES
  (2025, 'Temporada 2025', true);

-- Clubes de ejemplo
INSERT INTO clubes (nombre, slug, nombre_corto, historia, fundacion, sede, estadio_nombre, colores, activo) VALUES
  ('Buenos Aires Metropolis', 'buenos-aires-metropolis', 'Metropolis',
   'Fundado en las calles de Buenos Aires, Metropolis representa la pasión del béisbol porteño desde sus inicios.',
   1952, 'Ciudad Autónoma de Buenos Aires', 'Estadio Metropolitano',
   '{"primario": "#1E3A5F", "secundario": "#C5A200", "acento": "#FFFFFF"}', true),
  
  ('Córdoba Toros', 'cordoba-toros', 'Toros',
   'Los Toros de Córdoba son sinónimo de potencia y tradición en el béisbol del interior.',
   1965, 'Córdoba Capital', 'Estadio El Corral',
   '{"primario": "#8B0000", "secundario": "#F5F5DC", "acento": "#FFD700"}', true),
  
  ('Rosario Halcones', 'rosario-halcones', 'Halcones',
   'Con garras de acero y vuelo preciso, los Halcones dominan los cielos del Paraná.',
   1958, 'Rosario, Santa Fe', 'Estadio Halcón de Oro',
   '{"primario": "#004D40", "secundario": "#E0F2F1", "acento": "#FF6F00"}', true),
  
  ('Mendoza Cóndores', 'mendoza-condores', 'Cóndores',
   'Al pie de los Andes, los Cóndores llevan la majestuosidad de la cordillera al diamante.',
   1971, 'Mendoza Capital', 'Estadio Cordillerano',
   '{"primario": "#4A148C", "secundario": "#E1BEE7", "acento": "#00BFA5"}', true),
  
  ('La Plata Tiburones', 'la-plata-tiburones', 'Tiburones',
   'Desde las costas del Río de la Plata, los Tiburones muerden con fuerza en cada temporada.',
   1980, 'La Plata, Buenos Aires', 'Estadio Mareas',
   '{"primario": "#0D47A1", "secundario": "#B3E5FC", "acento": "#FF1744"}', true),
  
  ('Tucumán Jaguares', 'tucuman-jaguares', 'Jaguares',
   'La fiereza del norte argentino condensada en un equipo que nunca se rinde.',
   1975, 'San Miguel de Tucumán', 'Estadio Selva Grande',
   '{"primario": "#E65100", "secundario": "#FFF3E0", "acento": "#1B5E20"}', true);
