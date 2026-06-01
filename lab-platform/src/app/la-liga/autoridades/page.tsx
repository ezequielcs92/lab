import type { Metadata } from 'next'
import { Users } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Autoridades | Liga Argentina de Béisbol',
  description: 'Conocé las autoridades de la Liga Argentina de Béisbol',
}

const autoridades = [
  {
    nombre: 'Roberto Braccini',
    cargo: 'Presidente',
    mision:
      'Ejercer la representación legal y máxima autoridad de la Liga Argentina de Béisbol, garantizando la estabilidad institucional y el crecimiento del ecosistema del béisbol en el país.',
  },
  {
    nombre: 'Wilmer Castellano',
    cargo: 'Comisionado',
    mision:
      'Garantizar la integridad, el cumplimiento reglamentario y la excelencia operativa de la competición.',
  },
  {
    nombre: 'Nicolás Solari',
    cargo: 'Director Deportivo',
    mision: 'Garantizar la excelencia y el equilibrio competitivo de la Liga.',
  },
  {
    nombre: 'Flavia Ruíz',
    cargo: 'Secretaría y Logística',
    mision:
      'Administrar el flujo de información y la documentación oficial de la Liga Argentina de Béisbol.',
  },
  {
    nombre: 'Agustina Vidal',
    cargo: 'Directora de Comunicaciones',
    mision:
      'Gestionar la imagen pública y la narrativa de la Liga Argentina de Béisbol.',
  },
  {
    nombre: 'Pablo Viera',
    cargo: 'Director de Marketing',
    mision:
      'Transformar la estructura deportiva de la LAB en una marca comercial atractiva y rentable.',
  },
]

function getInitials(nombre: string) {
  return nombre
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export default function AutoridadesPage() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-field-gradient">
        <div className="bg-diamond-pattern absolute inset-0 opacity-20" />
        <div className="relative max-w-5xl mx-auto px-4 py-14 md:py-20 text-center">
          <h1 className="font-display text-4xl md:text-6xl tracking-wider text-lab-white leading-none mb-4">
            AUTORIDADES <span className="text-gradient-gold">LAB</span>
          </h1>
          <p className="font-condensed text-lg text-lab-gray tracking-wide max-w-xl mx-auto">
            Las personas que lideran y conducen la Liga Argentina de Béisbol
          </p>
        </div>
      </section>

      {/* Grid de autoridades */}
      <section className="max-w-5xl mx-auto px-4 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {autoridades.map((a) => (
            <div
              key={a.nombre}
              className="bg-lab-surface border border-lab-border rounded-xl p-6 flex flex-col gap-4 hover:border-lab-gold/30 transition-colors"
            >
              {/* Avatar */}
              <div className="w-14 h-14 rounded-full bg-lab-gold/15 border border-lab-gold/30 flex items-center justify-center flex-shrink-0">
                <span className="font-display text-lg text-lab-gold tracking-wider">
                  {getInitials(a.nombre)}
                </span>
              </div>

              {/* Info */}
              <div>
                <p className="font-condensed text-[10px] tracking-[0.2em] uppercase text-lab-gold font-semibold mb-1">
                  {a.cargo}
                </p>
                <h2 className="font-display text-xl tracking-wider text-lab-white leading-tight">
                  {a.nombre.toUpperCase()}
                </h2>
              </div>

              {/* Misión */}
              <p className="text-lab-muted text-sm leading-relaxed flex-1">
                {a.mision}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
