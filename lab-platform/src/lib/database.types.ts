export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type PosicionJugador =
  | 'pitcher' | 'catcher' | 'primera_base' | 'segunda_base'
  | 'tercera_base' | 'shortstop' | 'left_field' | 'center_field'
  | 'right_field' | 'designated_hitter' | 'utility'

export type EstadoPartido = 'programado' | 'en_curso' | 'finalizado' | 'suspendido' | 'cancelado'
export type TipoHito = 'campeon' | 'historia' | 'documento' | 'foto_historica' | 'record' | 'homenaje'
export type RolUsuario = 'admin_liga' | 'editor_club' | 'periodista' | 'fotografo' | 'usuario'

export interface ColoresClub {
  primario: string
  secundario: string
  acento: string
}

export interface Database {
  public: {
    Tables: {
      temporadas: {
        Row: {
          id: string
          anio: number
          nombre: string
          fecha_inicio: string | null
          fecha_fin: string | null
          activa: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          anio: number
          nombre: string
          fecha_inicio?: string | null
          fecha_fin?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          anio?: number
          nombre?: string
          fecha_inicio?: string | null
          fecha_fin?: string | null
          activa?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      clubes: {
        Row: {
          id: string
          nombre: string
          slug: string
          nombre_corto: string | null
          historia: string | null
          fundacion: number | null
          sede: string | null
          estadio_nombre: string | null
          estadio_coords: unknown | null
          colores: ColoresClub
          logo_url: string | null
          banner_url: string | null
          contacto_email: string | null
          redes_sociales: Json
          activo: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          nombre_corto?: string | null
          historia?: string | null
          fundacion?: number | null
          sede?: string | null
          estadio_nombre?: string | null
          estadio_coords?: unknown | null
          colores: ColoresClub
          logo_url?: string | null
          banner_url?: string | null
          contacto_email?: string | null
          redes_sociales?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          nombre_corto?: string | null
          historia?: string | null
          fundacion?: number | null
          sede?: string | null
          estadio_nombre?: string | null
          estadio_coords?: unknown | null
          colores?: ColoresClub
          logo_url?: string | null
          banner_url?: string | null
          contacto_email?: string | null
          redes_sociales?: Json
          activo?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      jugadores: {
        Row: {
          id: string
          nombre: string
          slug: string
          numero_camiseta: number | null
          posicion: PosicionJugador
          fecha_nacimiento: string | null
          lugar_nacimiento: string | null
          batea: string | null
          lanza: string | null
          foto_url: string | null
          club_id: string
          temporada_id: string | null
          activo: boolean
          bio: string | null
          avg: number | null
          hr: number | null
          rbi: number | null
          era: number | null
          w: number | null
          l: number | null
          so: number | null
          bb: number | null
          h: number | null
          ab: number | null
          r: number | null
          sb: number | null
          obp: number | null
          slg: number | null
          ip: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          slug: string
          numero_camiseta?: number | null
          posicion: PosicionJugador
          fecha_nacimiento?: string | null
          lugar_nacimiento?: string | null
          batea?: string | null
          lanza?: string | null
          foto_url?: string | null
          club_id: string
          temporada_id?: string | null
          activo?: boolean
          bio?: string | null
          avg?: number | null
          hr?: number | null
          rbi?: number | null
          era?: number | null
          w?: number | null
          l?: number | null
          so?: number | null
          bb?: number | null
          h?: number | null
          ab?: number | null
          r?: number | null
          sb?: number | null
          obp?: number | null
          slg?: number | null
          ip?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          slug?: string
          numero_camiseta?: number | null
          posicion?: PosicionJugador
          fecha_nacimiento?: string | null
          lugar_nacimiento?: string | null
          batea?: string | null
          lanza?: string | null
          foto_url?: string | null
          club_id?: string
          temporada_id?: string | null
          activo?: boolean
          bio?: string | null
          avg?: number | null
          hr?: number | null
          rbi?: number | null
          era?: number | null
          w?: number | null
          l?: number | null
          so?: number | null
          bb?: number | null
          h?: number | null
          ab?: number | null
          r?: number | null
          sb?: number | null
          obp?: number | null
          slg?: number | null
          ip?: number | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      partidos: {
        Row: {
          id: string
          temporada_id: string
          fecha_numero: number | null
          local_id: string
          visitante_id: string
          fecha_hora: string
          estadio: string | null
          marcador_local: number | null
          marcador_visitante: number | null
          estado: EstadoPartido
          streaming_url: string | null
          mvp_jugador_id: string | null
          resumen: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          temporada_id: string
          fecha_numero?: number | null
          local_id: string
          visitante_id: string
          fecha_hora: string
          estadio?: string | null
          marcador_local?: number | null
          marcador_visitante?: number | null
          estado?: EstadoPartido
          streaming_url?: string | null
          mvp_jugador_id?: string | null
          resumen?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          temporada_id?: string
          fecha_numero?: number | null
          local_id?: string
          visitante_id?: string
          fecha_hora?: string
          estadio?: string | null
          marcador_local?: number | null
          marcador_visitante?: number | null
          estado?: EstadoPartido
          streaming_url?: string | null
          mvp_jugador_id?: string | null
          resumen?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      noticias: {
        Row: {
          id: string
          titulo: string
          slug: string
          extracto: string | null
          contenido: string
          imagen_url: string | null
          autor_id: string | null
          club_id: string | null
          publicada: boolean
          destacada: boolean
          fecha_publicacion: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          titulo: string
          slug: string
          extracto?: string | null
          contenido: string
          imagen_url?: string | null
          autor_id?: string | null
          club_id?: string | null
          publicada?: boolean
          destacada?: boolean
          fecha_publicacion?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          slug?: string
          extracto?: string | null
          contenido?: string
          imagen_url?: string | null
          autor_id?: string | null
          club_id?: string | null
          publicada?: boolean
          destacada?: boolean
          fecha_publicacion?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      archivo_historico: {
        Row: {
          id: string
          fecha_hito: string
          titulo: string
          descripcion: string | null
          tipo: TipoHito
          media_url: string | null
          media_urls: Json
          club_id: string | null
          temporada_referencia: number | null
          fuente: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fecha_hito: string
          titulo: string
          descripcion?: string | null
          tipo: TipoHito
          media_url?: string | null
          media_urls?: Json
          club_id?: string | null
          temporada_referencia?: number | null
          fuente?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fecha_hito?: string
          titulo?: string
          descripcion?: string | null
          tipo?: TipoHito
          media_url?: string | null
          media_urls?: Json
          club_id?: string | null
          temporada_referencia?: number | null
          fuente?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      trivias: {
        Row: {
          id: string
          pregunta: string
          opciones: Json
          respuesta_correcta: number
          explicacion: string | null
          dificultad: number
          archivo_historico_id: string | null
          activa: boolean
          created_at: string
        }
        Insert: {
          id?: string
          pregunta: string
          opciones: Json
          respuesta_correcta: number
          explicacion?: string | null
          dificultad?: number
          archivo_historico_id?: string | null
          activa?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          pregunta?: string
          opciones?: Json
          respuesta_correcta?: number
          explicacion?: string | null
          dificultad?: number
          archivo_historico_id?: string | null
          activa?: boolean
          created_at?: string
        }
        Relationships: []
      }
      votos_mvp: {
        Row: {
          id: string
          partido_id: string
          jugador_id: string
          session_id: string
          ip_hash: string | null
          created_at: string
        }
        Insert: {
          id?: string
          partido_id: string
          jugador_id: string
          session_id: string
          ip_hash?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          partido_id?: string
          jugador_id?: string
          session_id?: string
          ip_hash?: string | null
          created_at?: string
        }
        Relationships: []
      }
      perfiles: {
        Row: {
          id: string
          nombre: string | null
          avatar_url: string | null
          rol: RolUsuario
          club_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          nombre?: string | null
          avatar_url?: string | null
          rol?: RolUsuario
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string | null
          avatar_url?: string | null
          rol?: RolUsuario
          club_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      posiciones: {
        Row: {
          id: string
          temporada_id: string
          club_id: string
          pj: number
          pg: number
          pp: number
          pe: number
          cf: number
          cc: number
          dif: number
          pts: number
          updated_at: string
        }
        Insert: {
          id?: string
          temporada_id: string
          club_id: string
          pj?: number
          pg?: number
          pp?: number
          pe?: number
          cf?: number
          cc?: number
          dif?: number
          pts?: number
          updated_at?: string
        }
        Update: {
          id?: string
          temporada_id?: string
          club_id?: string
          pj?: number
          pg?: number
          pp?: number
          pe?: number
          cf?: number
          cc?: number
          dif?: number
          pts?: number
          updated_at?: string
        }
        Relationships: []
      }
      autoridades: {
        Row: {
          id: string
          nombre: string
          cargo: string
          foto_url: string | null
          bio: string | null
          orden: number
          activo: boolean
          created_at: string
        }
        Insert: {
          id?: string
          nombre: string
          cargo: string
          foto_url?: string | null
          bio?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          cargo?: string
          foto_url?: string | null
          bio?: string | null
          orden?: number
          activo?: boolean
          created_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          id: string
          titulo: string
          descripcion: string | null
          archivo_url: string
          tipo: string | null
          fecha_documento: string | null
          publico: boolean
          created_at: string
        }
        Insert: {
          id?: string
          titulo: string
          descripcion?: string | null
          archivo_url: string
          tipo?: string | null
          fecha_documento?: string | null
          publico?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          titulo?: string
          descripcion?: string | null
          archivo_url?: string
          tipo?: string | null
          fecha_documento?: string | null
          publico?: boolean
          created_at?: string
        }
        Relationships: []
      }
      staff_clubes: {
        Row: {
          id: string
          club_id: string
          categoria: string
          nombre: string
          cargo: string
          foto_url: string | null
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          categoria?: string
          nombre: string
          cargo: string
          foto_url?: string | null
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          categoria?: string
          nombre?: string
          cargo?: string
          foto_url?: string | null
          orden?: number
          created_at?: string
        }
        Relationships: []
      }
      galeria_clubes: {
        Row: {
          id: string
          club_id: string
          imagen_url: string
          titulo: string | null
          descripcion: string | null
          orden: number
          created_at: string
        }
        Insert: {
          id?: string
          club_id: string
          imagen_url: string
          titulo?: string | null
          descripcion?: string | null
          orden?: number
          created_at?: string
        }
        Update: {
          id?: string
          club_id?: string
          imagen_url?: string
          titulo?: string | null
          descripcion?: string | null
          orden?: number
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      posicion_jugador: PosicionJugador
      estado_partido: EstadoPartido
      tipo_hito: TipoHito
      rol_usuario: RolUsuario
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
export type Club = Database['public']['Tables']['clubes']['Row']
export type Jugador = Database['public']['Tables']['jugadores']['Row']
export type Partido = Database['public']['Tables']['partidos']['Row']
export type Noticia = Database['public']['Tables']['noticias']['Row']
export type ArchivoHistorico = Database['public']['Tables']['archivo_historico']['Row']
export type Trivia = Database['public']['Tables']['trivias']['Row']
export type VotoMVP = Database['public']['Tables']['votos_mvp']['Row']
export type Perfil = Database['public']['Tables']['perfiles']['Row']
export type Posicion = Database['public']['Tables']['posiciones']['Row']
export type Temporada = Database['public']['Tables']['temporadas']['Row']
export type Autoridad = Database['public']['Tables']['autoridades']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']
export type StaffClub = Database['public']['Tables']['staff_clubes']['Row']
export type GaleriaClub = Database['public']['Tables']['galeria_clubes']['Row']

// Tipos con relaciones (joins)
export type JugadorConClub = Jugador & { clubes: Club }
export type PartidoConClubes = Partido & { local: Club; visitante: Club }
export type PosicionConClub = Posicion & { clubes: Club }
