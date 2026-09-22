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
export type FasePartido = 'regular' | 'playoffs'
export type TipoHito = 'campeon' | 'historia' | 'documento' | 'foto_historica' | 'record' | 'homenaje'
export type SponsorLocation = 'home_top' | 'home_between' | 'match' | 'news'
/** Roles operativos de la liga y roles editoriales inspirados en WordPress. */
export type RolUsuario =
  | 'admin_liga'
  | 'editor_club'
  | 'editor_blog'
  | 'autor'
  | 'colaborador'
  | 'periodista'
  | 'fotografo'
  | 'suscriptor'
  | 'usuario'

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
          stable_id: string | null
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
          stable_id?: string | null
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
          stable_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'jugadores_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'jugadores_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
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
          fase: FasePartido
          marcador_innings: Json
          outs_ofensivos_local: number | null
          outs_defensivos_local: number | null
          outs_ofensivos_visitante: number | null
          outs_defensivos_visitante: number | null
          external_source: string | null
          external_key: string | null
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
          fase?: FasePartido
          marcador_innings?: Json
          outs_ofensivos_local?: number | null
          outs_defensivos_local?: number | null
          outs_ofensivos_visitante?: number | null
          outs_defensivos_visitante?: number | null
          external_source?: string | null
          external_key?: string | null
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
          fase?: FasePartido
          marcador_innings?: Json
          outs_ofensivos_local?: number | null
          outs_defensivos_local?: number | null
          outs_ofensivos_visitante?: number | null
          outs_defensivos_visitante?: number | null
          external_source?: string | null
          external_key?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'partidos_local_id_fkey'
            columns: ['local_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'partidos_visitante_id_fkey'
            columns: ['visitante_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'partidos_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
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
          jj: number
          jg: number
          jp: number
          pct: number
          gb: number
          racha: string | null
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
          jj?: number
          jg?: number
          jp?: number
          pct?: number
          gb?: number
          racha?: string | null
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
          jj?: number
          jg?: number
          jp?: number
          pct?: number
          gb?: number
          racha?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'posiciones_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'posiciones_temporada_id_fkey'
            columns: ['temporada_id']
            isOneToOne: false
            referencedRelation: 'temporadas'
            referencedColumns: ['id']
          },
        ]
      }
      divisiones: {
        Row: { id: string; temporada_id: string; nombre: string; orden: number; created_at: string }
        Insert: { id?: string; temporada_id: string; nombre: string; orden?: number; created_at?: string }
        Update: { id?: string; temporada_id?: string; nombre?: string; orden?: number; created_at?: string }
        Relationships: []
      }
      temporada_clubes: {
        Row: { temporada_id: string; club_id: string; division_id: string; visible: boolean; created_at: string }
        Insert: { temporada_id: string; club_id: string; division_id: string; visible?: boolean; created_at?: string }
        Update: { temporada_id?: string; club_id?: string; division_id?: string; visible?: boolean; created_at?: string }
        Relationships: []
      }
      posiciones_ajustes: {
        Row: {
          id: string; temporada_id: string; club_id: string; division_id: string | null
          scope_key: string
          jj: number | null; jg: number | null; jp: number | null; pct: number | null; gb: number | null
          racha: string | null; orden_manual: number | null; motivo: string; updated_by: string | null; updated_at: string
        }
        Insert: {
          id?: string; temporada_id: string; club_id: string; division_id?: string | null
          jj?: number | null; jg?: number | null; jp?: number | null; pct?: number | null; gb?: number | null
          racha?: string | null; orden_manual?: number | null; motivo: string; updated_by?: string | null; updated_at?: string
        }
        Update: {
          id?: string; temporada_id?: string; club_id?: string; division_id?: string | null
          jj?: number | null; jg?: number | null; jp?: number | null; pct?: number | null; gb?: number | null
          racha?: string | null; orden_manual?: number | null; motivo?: string; updated_by?: string | null; updated_at?: string
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
      sponsors: {
        Row: {
          id: string
          nombre: string
          logo_url: string
          destino_url: string | null
          ubicacion: SponsorLocation
          orden: number
          activo: boolean
          vigencia_inicio: string | null
          vigencia_fin: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          nombre: string
          logo_url: string
          destino_url?: string | null
          ubicacion?: SponsorLocation
          orden?: number
          activo?: boolean
          vigencia_inicio?: string | null
          vigencia_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          nombre?: string
          logo_url?: string
          destino_url?: string | null
          ubicacion?: SponsorLocation
          orden?: number
          activo?: boolean
          vigencia_inicio?: string | null
          vigencia_fin?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      estadisticas_bateo: {
        Row: {
          id: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          orden_bateo: number | null
          ab: number
          r: number
          h: number
          doble: number
          triple: number
          hr: number
          rbi: number
          bb: number
          so: number
          sb: number
          cs: number
          sf: number
          hbp: number
          extras: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          orden_bateo?: number | null
          ab?: number
          r?: number
          h?: number
          doble?: number
          triple?: number
          hr?: number
          rbi?: number
          bb?: number
          so?: number
          sb?: number
          cs?: number
          sf?: number
          hbp?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partido_id?: string
          jugador_id?: string
          temporada_id?: string
          club_id?: string
          orden_bateo?: number | null
          ab?: number
          r?: number
          h?: number
          doble?: number
          triple?: number
          hr?: number
          rbi?: number
          bb?: number
          so?: number
          sb?: number
          cs?: number
          sf?: number
          hbp?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estadisticas_bateo_jugador_id_fkey'
            columns: ['jugador_id']
            isOneToOne: false
            referencedRelation: 'jugadores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estadisticas_bateo_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
        ]
      }
      estadisticas_pitcheo: {
        Row: {
          id: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          ip: number
          h: number
          r: number
          er: number
          bb: number
          so: number
          hr: number
          w: boolean
          l: boolean
          sv: boolean
          hld: number
          wp: number
          bk: number
          bf: number
          extras: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          ip?: number
          h?: number
          r?: number
          er?: number
          bb?: number
          so?: number
          hr?: number
          w?: boolean
          l?: boolean
          sv?: boolean
          hld?: number
          wp?: number
          bk?: number
          bf?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partido_id?: string
          jugador_id?: string
          temporada_id?: string
          club_id?: string
          ip?: number
          h?: number
          r?: number
          er?: number
          bb?: number
          so?: number
          hr?: number
          w?: boolean
          l?: boolean
          sv?: boolean
          hld?: number
          wp?: number
          bk?: number
          bf?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estadisticas_pitcheo_jugador_id_fkey'
            columns: ['jugador_id']
            isOneToOne: false
            referencedRelation: 'jugadores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estadisticas_pitcheo_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
        ]
      }
      estadisticas_fildeo: {
        Row: {
          id: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          po: number
          a: number
          e: number
          dp: number
          extras: Json
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          partido_id: string
          jugador_id: string
          temporada_id: string
          club_id: string
          po?: number
          a?: number
          e?: number
          dp?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          partido_id?: string
          jugador_id?: string
          temporada_id?: string
          club_id?: string
          po?: number
          a?: number
          e?: number
          dp?: number
          extras?: Json
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'estadisticas_fildeo_jugador_id_fkey'
            columns: ['jugador_id']
            isOneToOne: false
            referencedRelation: 'jugadores'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'estadisticas_fildeo_club_id_fkey'
            columns: ['club_id']
            isOneToOne: false
            referencedRelation: 'clubes'
            referencedColumns: ['id']
          },
        ]
      }
      lideres_config: {
        Row: {
          id: string
          temporada_id: string
          categoria: string
          etiqueta: string
          scope: string
          metrica: string
          orden: number
          activo: boolean
          limite: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          temporada_id: string
          categoria: string
          etiqueta: string
          scope: string
          metrica: string
          orden?: number
          activo?: boolean
          limite?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          temporada_id?: string
          categoria?: string
          etiqueta?: string
          scope?: string
          metrica?: string
          orden?: number
          activo?: boolean
          limite?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_lotes: {
        Row: {
          id: string
          fuente: 'iscore' | 'google_sheets'
          temporada_id: string | null
          estado: 'preview' | 'bloqueado' | 'listo' | 'aplicando' | 'aplicado' | 'fallido'
          resumen: Json
          conflictos: Json
          creado_por: string | null
          created_at: string
          applied_at: string | null
        }
        Insert: {
          id?: string
          fuente: 'iscore' | 'google_sheets'
          temporada_id?: string | null
          estado?: 'preview' | 'bloqueado' | 'listo' | 'aplicando' | 'aplicado' | 'fallido'
          resumen?: Json
          conflictos?: Json
          creado_por?: string | null
          created_at?: string
          applied_at?: string | null
        }
        Update: {
          id?: string
          fuente?: 'iscore' | 'google_sheets'
          temporada_id?: string | null
          estado?: 'preview' | 'bloqueado' | 'listo' | 'aplicando' | 'aplicado' | 'fallido'
          resumen?: Json
          conflictos?: Json
          creado_por?: string | null
          created_at?: string
          applied_at?: string | null
        }
        Relationships: []
      }
      sync_registros: {
        Row: {
          id: string
          fuente: 'google_sheets'
          pestaña: 'Partidos' | 'Bateo' | 'Pitcheo' | 'Fildeo'
          clave_externa: string
          lab_hash: string | null
          sheet_hash: string | null
          last_synced_at: string
        }
        Insert: {
          id?: string
          fuente?: 'google_sheets'
          pestaña: 'Partidos' | 'Bateo' | 'Pitcheo' | 'Fildeo'
          clave_externa: string
          lab_hash?: string | null
          sheet_hash?: string | null
          last_synced_at?: string
        }
        Update: {
          id?: string
          fuente?: 'google_sheets'
          pestaña?: 'Partidos' | 'Bateo' | 'Pitcheo' | 'Fildeo'
          clave_externa?: string
          lab_hash?: string | null
          sheet_hash?: string | null
          last_synced_at?: string
        }
        Relationships: []
      }
      sync_conflictos: {
        Row: {
          id: string
          lote_id: string | null
          fuente: 'iscore' | 'google_sheets'
          tipo: string
          entidad: string
          clave_externa: string
          lab_payload: Json | null
          external_payload: Json | null
          estado: 'pendiente' | 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido'
          resuelto_por: string | null
          created_at: string
          resolved_at: string | null
        }
        Insert: {
          id?: string
          lote_id?: string | null
          fuente: 'iscore' | 'google_sheets'
          tipo: string
          entidad: string
          clave_externa: string
          lab_payload?: Json | null
          external_payload?: Json | null
          estado?: 'pendiente' | 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido'
          resuelto_por?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Update: {
          id?: string
          lote_id?: string | null
          fuente?: 'iscore' | 'google_sheets'
          tipo?: string
          entidad?: string
          clave_externa?: string
          lab_payload?: Json | null
          external_payload?: Json | null
          estado?: 'pendiente' | 'usar_lab' | 'usar_externo' | 'fusionado' | 'omitido'
          resuelto_por?: string | null
          created_at?: string
          resolved_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      v_posiciones_efectivas: {
        Row: {
          id: string
          temporada_id: string
          club_id: string
          division_id: string | null
          jj: number
          jg: number
          jp: number
          pct: number
          gb: number
          racha: string | null
          orden_manual: number | null
          serie_ganada: number | null
          tqb: number | null
          carreras_empatados: number | null
        }
        Relationships: []
      }
      v_stats_bateo_agregado: {
        Row: {
          jugador_id: string
          temporada_id: string
          club_id: string
          ab: number | null
          r: number | null
          h: number | null
          doble: number | null
          triple: number | null
          hr: number | null
          rbi: number | null
          bb: number | null
          so: number | null
          sb: number | null
          cs: number | null
          sf: number | null
          hbp: number | null
          avg: number | null
          obp: number | null
          slg: number | null
          ops: number | null
          fase: FasePartido
        }
        Relationships: []
      }
      v_stats_pitcheo_agregado: {
        Row: {
          jugador_id: string
          temporada_id: string
          club_id: string
          ip: number | null
          h: number | null
          r: number | null
          er: number | null
          bb: number | null
          so: number | null
          hr: number | null
          w: number | null
          l: number | null
          sv: number | null
          hld: number | null
          wp: number | null
          bk: number | null
          bf: number | null
          era: number | null
          whip: number | null
          so_pct: number | null
          fase: FasePartido
        }
        Relationships: []
      }
      v_stats_fildeo_agregado: {
        Row: {
          jugador_id: string
          temporada_id: string
          club_id: string
          po: number | null
          a: number | null
          e: number | null
          dp: number | null
          fld_pct: number | null
          fase: FasePartido
        }
        Relationships: []
      }
      v_stats_bateo_historico: {
        Row: {
          jugador_id: string
          club_id: string
          stable_id: string
          temporada_id: string | null
          ab: number | null
          r: number | null
          h: number | null
          doble: number | null
          triple: number | null
          hr: number | null
          rbi: number | null
          bb: number | null
          so: number | null
          sb: number | null
          cs: number | null
          sf: number | null
          hbp: number | null
          avg: number | null
          obp: number | null
          slg: number | null
          ops: number | null
          fase: string
        }
        Relationships: []
      }
      v_stats_pitcheo_historico: {
        Row: {
          jugador_id: string
          club_id: string
          stable_id: string
          temporada_id: string | null
          ip: number | null
          h: number | null
          r: number | null
          er: number | null
          bb: number | null
          so: number | null
          hr: number | null
          w: number | null
          l: number | null
          sv: number | null
          hld: number | null
          wp: number | null
          bk: number | null
          bf: number | null
          era: number | null
          whip: number | null
          fase: string
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      posicion_jugador: PosicionJugador
      estado_partido: EstadoPartido
      tipo_hito: TipoHito
      rol_usuario: RolUsuario
      sponsor_location: SponsorLocation
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
export type PosicionEfectiva = Database['public']['Views']['v_posiciones_efectivas']['Row']
export type Division = Database['public']['Tables']['divisiones']['Row']
export type PosicionAjuste = Database['public']['Tables']['posiciones_ajustes']['Row']
export type Temporada = Database['public']['Tables']['temporadas']['Row']
export type Autoridad = Database['public']['Tables']['autoridades']['Row']
export type Documento = Database['public']['Tables']['documentos']['Row']
export type StaffClub = Database['public']['Tables']['staff_clubes']['Row']
export type GaleriaClub = Database['public']['Tables']['galeria_clubes']['Row']
export type Sponsor = Database['public']['Tables']['sponsors']['Row']
export type EstadisticaBateo = Database['public']['Tables']['estadisticas_bateo']['Row']
export type EstadisticaPitcheo = Database['public']['Tables']['estadisticas_pitcheo']['Row']
export type EstadisticaFildeo = Database['public']['Tables']['estadisticas_fildeo']['Row']
export type LiderConfig = Database['public']['Tables']['lideres_config']['Row']
export type ImportLote = Database['public']['Tables']['import_lotes']['Row']
export type SyncRegistro = Database['public']['Tables']['sync_registros']['Row']
export type SyncConflicto = Database['public']['Tables']['sync_conflictos']['Row']
export type StatsBateoAgregado = Database['public']['Views']['v_stats_bateo_agregado']['Row']
export type StatsPitcheoAgregado = Database['public']['Views']['v_stats_pitcheo_agregado']['Row']
export type StatsFildeoAgregado = Database['public']['Views']['v_stats_fildeo_agregado']['Row']
export type StatsBateoHistorico = Database['public']['Views']['v_stats_bateo_historico']['Row']
export type StatsPitcheoHistorico = Database['public']['Views']['v_stats_pitcheo_historico']['Row']

// Tipos con relaciones (joins)
export type JugadorConClub = Jugador & { clubes: Club }
export type PartidoConClubes = Partido & { local: Club; visitante: Club }
export type PosicionConClub = Posicion & { clubes: Club }
export type PosicionEfectivaConClub = PosicionEfectiva & { clubes: Club }
export type EstadisticaBateoConJugador = EstadisticaBateo & { jugadores: Jugador; clubes: Club }
export type EstadisticaPitcheoConJugador = EstadisticaPitcheo & { jugadores: Jugador; clubes: Club }
export type EstadisticaFildeoConJugador = EstadisticaFildeo & { jugadores: Jugador; clubes: Club }
export type LeaderRow =
  | (StatsBateoAgregado & { jugadores: Jugador; clubes: Club })
  | (StatsPitcheoAgregado & { jugadores: Jugador; clubes: Club })
  | (StatsFildeoAgregado & { jugadores: Jugador; clubes: Club })
