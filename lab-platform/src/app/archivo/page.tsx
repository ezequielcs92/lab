import { createClient } from '@/lib/supabase/server'
import Timeline from '@/components/archivo/Timeline'
import type { Metadata } from 'next'
import { TIPO_HITO_LABELS } from '@/lib/constants'
import type { TipoHito } from '@/lib/database.types'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Línea de Tiempo',
  description: 'Línea del tiempo del béisbol argentino.',
}

export const revalidate = 300

export default async function ArchivoPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>
}) {
  const filters = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('archivo_historico')
    .select('*')
    .order('fecha_hito', { ascending: false })

  if (filters.tipo) {
    query = query.eq('tipo', filters.tipo as TipoHito)
  }

  const { data: hitos } = await query

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <div className="mb-10">
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          LÍNEA DE <span className="text-gradient-gold">TIEMPO</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          Línea del tiempo del béisbol
        </p>
      </div>

      {/* Type filters */}
      <div className="flex flex-wrap gap-2 mb-10">
        <Link
          href="/archivo"
          className={`px-4 py-2 rounded-lg font-condensed text-sm tracking-wider uppercase transition-all
            ${!filters.tipo ? 'bg-lab-gold text-lab-navy font-bold' : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'}`}
        >
          Todos
        </Link>
        {(Object.entries(TIPO_HITO_LABELS) as [TipoHito, string][]).map(([key, label]) => (
          <Link
            key={key}
            href={`/archivo?tipo=${key}`}
            className={`px-4 py-2 rounded-lg font-condensed text-sm tracking-wider uppercase transition-all
              ${filters.tipo === key ? 'bg-lab-gold text-lab-navy font-bold' : 'bg-lab-surface border border-lab-border text-lab-muted hover:text-lab-white hover:border-lab-gold/30'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {hitos && hitos.length > 0 ? (
        <Timeline hitos={hitos} />
      ) : (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            La línea de tiempo se irá construyendo con el aporte de toda la comunidad
          </p>
        </div>
      )}
    </div>
  )
}
