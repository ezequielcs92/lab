import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Comisión Directiva',
  description: 'Comisión directiva de la Liga Argentina de Béisbol',
}

export const revalidate = 600

export default async function AutoridadesPage() {
  const supabase = await createClient()

  const { data: autoridades } = await supabase
    .from('autoridades')
    .select('*')
    .eq('activo', true)
    .order('orden')

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
        <span className="text-gradient-gold">COMISIÓN DIRECTIVA</span>
      </h1>
      <p className="font-condensed text-lab-gray tracking-wide text-lg mb-10">
        Comisión directiva de la Liga Argentina de Béisbol
      </p>

      {autoridades && autoridades.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {autoridades.map((a) => (
            <div key={a.id} className="bg-lab-surface rounded-xl border border-lab-border p-6 flex gap-5">
              <div className="w-20 h-20 rounded-xl bg-lab-gold/10 flex items-center justify-center font-display text-2xl text-lab-gold flex-shrink-0">
                {a.nombre.split(' ').map(n => n[0]).join('')}
              </div>
              <div>
                <h2 className="font-display text-xl tracking-wider text-lab-white">{a.nombre}</h2>
                <p className="font-condensed text-sm text-lab-gold tracking-widest uppercase mt-1">{a.cargo}</p>
                {a.bio && (
                  <p className="text-lab-gray text-sm mt-2 leading-relaxed">{a.bio}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            La comisión directiva será publicada próximamente
          </p>
        </div>
      )}
    </div>
  )
}
