'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import TriviaCard from '@/components/trivias/TriviaCard'
import type { Trivia } from '@/lib/database.types'
import { Gamepad2, RotateCw } from 'lucide-react'

export default function TriviasPage() {
  const [trivias, setTrivias] = useState<Trivia[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [loading, setLoading] = useState(true)

  async function loadTrivias() {
    const supabase = createClient()
    setLoading(true)
    const { data } = await supabase
      .from('trivias')
      .select('*')
      .eq('activa', true)
      .limit(10)

    if (data) {
      // Shuffle
      const shuffled = data.sort(() => Math.random() - 0.5)
      setTrivias(shuffled)
      setCurrentIdx(0)
    }
    setLoading(false)
  }

  useEffect(() => {
    void loadTrivias()
  }, [])

  function handleNext() {
    setCurrentIdx((prev) => prev + 1)
  }

  const currentTrivia = trivias[currentIdx]
  const isFinished = currentIdx >= trivias.length && trivias.length > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Gamepad2 className="w-8 h-8 text-lab-gold" />
        </div>
        <h1 className="font-display text-4xl md:text-5xl tracking-wider text-lab-white mb-2">
          <span className="text-gradient-gold">TRIVIAS</span>
        </h1>
        <p className="font-condensed text-lab-gray tracking-wide text-lg">
          ¿Cuánto sabés de béisbol argentino? Poné a prueba tus conocimientos.
        </p>

        {trivias.length > 0 && !isFinished && (
          <div className="mt-4 flex items-center justify-center gap-4">
            <span className="font-condensed text-sm text-lab-muted tracking-wider">
              Pregunta {currentIdx + 1} de {trivias.length}
            </span>
            <div className="w-32 h-1.5 bg-lab-border rounded-full overflow-hidden">
              <div
                className="h-full bg-lab-gold rounded-full transition-all"
                style={{ width: `${((currentIdx + 1) / trivias.length) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-lab-gold border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="font-condensed text-lab-muted tracking-wider">Cargando trivias...</p>
        </div>
      ) : isFinished ? (
        <div className="text-center py-16 animate-fade-in-up">
          <div className="bg-lab-surface rounded-xl border border-lab-border p-8 max-w-md mx-auto">
            <Gamepad2 className="w-12 h-12 text-lab-gold mx-auto mb-4" />
            <h2 className="font-display text-3xl tracking-wider text-lab-white mb-2">
              ¡TERMINASTE!
            </h2>
            <p className="font-condensed text-lab-gray tracking-wider mb-6">
              Completaste todas las trivias disponibles
            </p>
            <button
              onClick={loadTrivias}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-lab-gold text-lab-navy font-condensed font-bold tracking-wider uppercase hover:bg-lab-gold-light transition-colors"
            >
              <RotateCw className="w-4 h-4" />
              Jugar de nuevo
            </button>
          </div>
        </div>
      ) : currentTrivia ? (
        <TriviaCard trivia={currentTrivia} onNextTrivia={handleNext} />
      ) : (
        <div className="text-center py-16">
          <p className="font-condensed text-lab-muted tracking-wider text-lg">
            No hay trivias disponibles en este momento.
          </p>
        </div>
      )}
    </div>
  )
}
