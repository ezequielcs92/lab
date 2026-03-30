import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'
import { FileText, Download } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Reglamentos',
  description: 'Documentación oficial y reglamentos de la Liga Argentina de Béisbol',
}

export const revalidate = 600

export default async function ReglamentosPage() {
  const supabase = await createClient()

  const { data: documentos } = await supabase
    .from('documentos')
    .select('*')
    .eq('publico', true)
    .order('fecha_documento', { ascending: false })

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
        <span className="text-gradient-gold">REGLAMENTOS</span>
      </h1>
      <p className="font-condensed text-lab-gray tracking-wide text-lg mb-10">
        Documentación oficial de la Liga Argentina de Béisbol
      </p>

      {documentos && documentos.length > 0 ? (
        <div className="space-y-4">
          {documentos.map((doc) => (
            <a
              key={doc.id}
              href={doc.archivo_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 bg-lab-surface rounded-lg border border-lab-border p-5 hover:border-lab-gold/30 transition-colors group"
            >
              <div className="w-12 h-12 rounded-lg bg-lab-gold/10 flex items-center justify-center flex-shrink-0">
                <FileText className="w-6 h-6 text-lab-gold" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-condensed font-semibold text-lab-white tracking-wide group-hover:text-lab-gold transition-colors">
                  {doc.titulo}
                </h2>
                {doc.descripcion && (
                  <p className="text-lab-muted text-sm mt-1">{doc.descripcion}</p>
                )}
                {doc.tipo && (
                  <span className="inline-block mt-2 px-2 py-0.5 rounded bg-lab-navy font-condensed text-xs tracking-widest uppercase text-lab-gold">
                    {doc.tipo}
                  </span>
                )}
              </div>
              <Download className="w-5 h-5 text-lab-muted group-hover:text-lab-gold transition-colors flex-shrink-0" />
            </a>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <FileText className="w-12 h-12 text-lab-muted/30 mx-auto mb-4" />
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            Los reglamentos serán publicados próximamente
          </p>
        </div>
      )}
    </div>
  )
}
