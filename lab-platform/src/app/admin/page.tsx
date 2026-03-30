import { createClient } from '@/lib/supabase/server'
import {
  Shield,
  Users,
  Newspaper,
  Swords,
  Archive,
  HelpCircle,
  TrendingUp,
  Calendar,
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
  ])

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
                      {p.local?.nombre_corto ?? 'LOC'} vs {p.visitante?.nombre_corto ?? 'VIS'}
                    </p>
                    <p className="font-condensed text-[11px] text-lab-muted tracking-wider">
                      {new Date(p.fecha_hora).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
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
