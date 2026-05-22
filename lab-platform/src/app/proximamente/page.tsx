import Image from 'next/image'
import type { Metadata } from 'next'
import { Calendar } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Próximamente',
  description: 'Lanzamiento oficial el 1ro de junio',
}

export default function ProximamentePage() {
  return (
    <div className="min-h-screen bg-field-gradient relative overflow-hidden flex items-center justify-center px-4">
      <div className="bg-diamond-pattern absolute inset-0 opacity-20" />

      <div className="relative w-full max-w-2xl bg-lab-surface/90 backdrop-blur-sm border border-lab-border rounded-2xl p-8 md:p-12 text-center">
        <p className="font-condensed text-xs tracking-[0.2em] uppercase text-lab-gold mb-4">LAB</p>

        <h1 className="font-display text-4xl md:text-6xl tracking-wider text-lab-white leading-none mb-4">
          PRÓXIMAMENTE
        </h1>

        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-lab-navy border border-lab-border mb-6">
          <Calendar className="w-4 h-4 text-lab-gold" />
          <span className="font-condensed text-sm tracking-wider text-lab-white uppercase">
            Lanzamiento 1ro de Junio
          </span>
        </div>

        <p className="text-lab-gray text-sm md:text-base leading-relaxed max-w-xl mx-auto mb-8">
          Estamos preparando la nueva plataforma oficial de la Liga Argentina de Béisbol.
          Muy pronto vas a poder acceder a todos los contenidos desde aquí.
        </p>
      </div>

      <div className="absolute bottom-6 right-6 w-10 h-10 rounded-full bg-lab-navy/80 border border-lab-border flex items-center justify-center">
        <div className="relative w-5 h-5">
          <Image
            src="/logos/lab.svg"
            alt="LAB"
            fill
            sizes="20px"
            className="object-contain"
            priority
          />
        </div>
      </div>
    </div>
  )
}