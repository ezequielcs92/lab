import { createClient } from '@/lib/supabase/server'
import { formatArgentinaDateTime } from '@/lib/date-time'
import {
  Shield,
  Users,
  Newspaper,
  Swords,
  Archive,
  HelpCircle,
  TrendingUp,
  Calendar,
  Eye,
} from 'lucide-react'

export default async function AdminDashboard() {
  const supabase = await createClient()

  // Vercel skill: async-parallel — parallel queries, no waterfalls
  const [
    { count: clubesCount },
    { count: jugadoresCount },
    { count: noticiasCount },
    { count: partidosCount },
    { count: archivoCount },
    { count: triviasCount },
    { data: proximosPartidos },
    { data: ultimasNoticias },
    visitsResult,
  ] = await Promise.all([
    supabase.from('clubes').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('jugadores').select('*', { count: 'exact', head: true }).eq('activo', true),
    supabase.from('noticias').select('*', { count: 'exact', head: true }).eq('publicada', true),
    supabase.from('partidos').select('*', { count: 'exact', head: true }),
    supabase.from('archivo_historico').select('*', { count: 'exact', head: true }),
    supabase.from('trivias').select('*', { count: 'exact', head: true }).eq('activa', true),
    supabase
      .from('partidos')
      .select('*, local:clubes!partidos_local_id_fkey(nombre_corto, colores), visitante:clubes!partidos_visitante_id_fkey(nombre_corto, colores)')
      .in('estado', ['programado', 'en_curso'])
      .order('fecha_hora', { ascending: true })
      .limit(5),
    supabase
      .from('noticias')
      .select('id, titulo, fecha_publicacion, publicada')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.rpc('resumen_visitas', { p_dias: 30 }),
  ])
  const visits = parseVisitSummary(visitsResult.data)

  const stats = [
    { label: 'Clubes', value: clubesCount ?? 0, icon: Shield, color: 'text-lab-gold' },
    { label: 'Jugadores', value: jugadoresCount ?? 0, icon: Users, color: 'text-emerald-400' },
    { label: 'Noticias', value: noticiasCount ?? 0, icon: Newspaper, color: 'text-sky-400' },
    { label: 'Partidos', value: partidosCount ?? 0, icon: Swords, color: 'text-orange-400' },
    { label: 'Archivo', value: archivoCount ?? 0, icon: Archive, color: 'text-purple-400' },
    { label: 'Trivias', value: triviasCount ?? 0, icon: HelpCircle, color: 'text-pink-400' },
  ]

  return (
    <div>
      {/* Header — Bebas Neue for authority, condensed for metadata */}
      <div className="mb-8">
        <h1 className="font-display text-3xl tracking-widest text-lab-white">DASHBOARD</h1>
        <p className="font-condensed text-sm text-lab-muted tracking-wider mt-1">
          Resumen general de la plataforma
        </p>
      </div>

      {/* Stat counters — each card distinctly identified by accent color dot, not full color wash */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-lab-surface rounded-lg border border-lab-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">
                {stat.label}
              </span>
            </div>
            <p className="font-display text-3xl tracking-wider text-lab-white leading-none">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Visitas: solo las ve el administrador de la liga (la función rechaza a los demás roles) */}
      {visitsResult.error?.code !== '42501' && <VisitsPanel visits={visits} unavailable={Boolean(visitsResult.error)} />}

      {/* Two-column layout: upcoming games + recent news */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Próximos Partidos */}
        <section className="bg-lab-surface rounded-lg border border-lab-border">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-lab-border">
            <Calendar className="w-4 h-4 text-lab-gold" />
            <h2 className="font-display text-base tracking-widest text-lab-white">PRÓXIMOS PARTIDOS</h2>
          </div>
          <div className="divide-y divide-lab-border">
            {proximosPartidos && proximosPartidos.length > 0 ? (
              proximosPartidos.map((p: any) => (
                <div key={p.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-condensed text-sm text-lab-white font-medium tracking-wide truncate">
                      {p.visitante?.nombre_corto ?? 'VIS'} vs {p.local?.nombre_corto ?? 'LOC'}
                    </p>
                    <p className="font-condensed text-[11px] text-lab-muted tracking-wider">
                      {formatArgentinaDateTime(p.fecha_hora, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {p.estado === 'en_curso' && (
                    <span className="flex items-center gap-1.5 font-condensed text-[10px] tracking-[0.15em] uppercase text-lab-red font-semibold">
                      <span className="live-dot" /> EN VIVO
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="font-condensed text-sm text-lab-muted tracking-wider">Sin partidos programados</p>
              </div>
            )}
          </div>
        </section>

        {/* Últimas Noticias */}
        <section className="bg-lab-surface rounded-lg border border-lab-border">
          <div className="flex items-center gap-2 px-5 py-3.5 border-b border-lab-border">
            <TrendingUp className="w-4 h-4 text-lab-gold" />
            <h2 className="font-display text-base tracking-widest text-lab-white">ÚLTIMA ACTIVIDAD</h2>
          </div>
          <div className="divide-y divide-lab-border">
            {ultimasNoticias && ultimasNoticias.length > 0 ? (
              ultimasNoticias.map((n: any) => (
                <div key={n.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${n.publicada ? 'bg-emerald-400' : 'bg-lab-muted'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-condensed text-sm text-lab-white tracking-wide truncate">
                      {n.titulo}
                    </p>
                    <p className="font-condensed text-[11px] text-lab-muted tracking-wider">
                      {new Date(n.fecha_publicacion).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={`font-condensed text-[10px] tracking-[0.12em] uppercase px-2 py-0.5 rounded ${
                    n.publicada ? 'bg-emerald-400/10 text-emerald-400' : 'bg-lab-muted/10 text-lab-muted'
                  }`}>
                    {n.publicada ? 'Publicada' : 'Borrador'}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-5 py-8 text-center">
                <p className="font-condensed text-sm text-lab-muted tracking-wider">Sin noticias recientes</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

interface VisitSummary {
  total: number
  lecturasNoticias: number
  porDia: { dia: string; vistas: number }[]
  topRutas: { ruta: string; vistas: number }[]
  topNoticias: { titulo: string; slug: string; vistas: number }[]
}

function parseVisitSummary(value: unknown): VisitSummary | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const data = value as Record<string, unknown>
  const list = <T,>(item: unknown): T[] => (Array.isArray(item) ? item as T[] : [])
  return {
    total: Number(data.total ?? 0),
    lecturasNoticias: Number(data.lecturas_noticias ?? 0),
    porDia: list<{ dia: string; vistas: number }>(data.por_dia),
    topRutas: list<{ ruta: string; vistas: number }>(data.top_rutas),
    topNoticias: list<{ titulo: string; slug: string; vistas: number }>(data.top_noticias),
  }
}

function VisitsPanel({ visits, unavailable }: { visits: VisitSummary | null; unavailable: boolean }) {
  const maxDay = Math.max(1, ...(visits?.porDia.map((day) => day.vistas) ?? [1]))
  return (
    <section className="bg-lab-surface rounded-lg border border-lab-border mb-6">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-lab-border">
        <Eye className="w-4 h-4 text-lab-gold" />
        <h2 className="font-display text-base tracking-widest text-lab-white">VISITAS · ÚLTIMOS 30 DÍAS</h2>
      </div>
      {!visits ? (
        <p className="px-5 py-6 font-condensed text-sm text-lab-muted tracking-wider">
          {unavailable ? 'Las estadísticas de visitas todavía no están activadas (falta aplicar la migración de visitas).' : 'Todavía no hay visitas registradas.'}
        </p>
      ) : (
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <div>
              <p className="font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Páginas vistas</p>
              <p className="font-display text-3xl tracking-wider text-lab-white leading-none mt-1">{visits.total.toLocaleString('es-AR')}</p>
            </div>
            <div>
              <p className="font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase">Lecturas de notas</p>
              <p className="font-display text-3xl tracking-wider text-lab-white leading-none mt-1">{visits.lecturasNoticias.toLocaleString('es-AR')}</p>
            </div>
          </div>
          {visits.porDia.length > 0 && (
            <div className="flex items-end gap-1 h-24" role="img" aria-label="Páginas vistas por día">
              {visits.porDia.map((day) => (
                <div key={day.dia} className="flex-1 bg-lab-gold/70 rounded-t min-h-[2px]" style={{ height: `${Math.max(2, (day.vistas / maxDay) * 100)}%` }} title={`${day.dia}: ${day.vistas}`} />
              ))}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Páginas más vistas</p>
              <ul className="space-y-1">
                {visits.topRutas.map((item) => (
                  <li key={item.ruta} className="flex justify-between gap-3 font-condensed text-sm text-lab-white"><span className="truncate">{item.ruta}</span><span className="text-lab-gold">{item.vistas}</span></li>
                ))}
              </ul>
            </div>
            <div>
              <p className="font-condensed text-[11px] tracking-[0.15em] text-lab-muted uppercase mb-2">Notas más leídas</p>
              {visits.topNoticias.length > 0 ? (
                <ul className="space-y-1">
                  {visits.topNoticias.map((item) => (
                    <li key={item.slug} className="flex justify-between gap-3 font-condensed text-sm text-lab-white"><span className="truncate">{item.titulo}</span><span className="text-lab-gold">{item.vistas}</span></li>
                  ))}
                </ul>
              ) : (
                <p className="font-condensed text-sm text-lab-muted">Sin lecturas todavía.</p>
              )}
            </div>
          </div>
          <p className="font-condensed text-[11px] text-lab-muted tracking-wider">Se cuenta una vista por página, pestaña y día. No se guardan datos personales ni se cuentan robots.</p>
        </div>
      )}
    </section>
  )
}
