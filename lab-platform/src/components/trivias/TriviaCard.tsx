'use client'

import { useState } from 'react'
import type { Trivia } from '@/lib/database.types'
import { CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react'

interface TriviaCardProps {
  trivia: Trivia
  onNextTrivia?: () => void
}

export default function TriviaCard({ trivia, onNextTrivia }: TriviaCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  const opciones = trivia.opciones as string[]
  const isCorrect = selected === trivia.respuesta_correcta

  function handleSelect(idx: number) {
    if (revealed) return
    setSelected(idx)
    setRevealed(true)
  }

  function handleNext() {
    setSelected(null)
    setRevealed(false)
    onNextTrivia?.()
  }

  return (
    <div className="bg-lab-surface rounded-xl border border-lab-border overflow-hidden max-w-xl mx-auto">
      {/* Header */}
      <div className="px-5 py-4 border-b border-lab-border/50 bg-lab-surface-light">
        <div className="flex items-center gap-2 mb-2">
          <Lightbulb className="w-4 h-4 text-lab-gold" />
          <span className="font-condensed text-xs tracking-widest uppercase text-lab-gold font-semibold">
            Trivia
          </span>
          {trivia.dificultad && (
            <span className="ml-auto flex gap-0.5">
              {[1, 2, 3].map((d) => (
                <span
                  key={d}
                  className={`w-2 h-2 rounded-full ${d <= trivia.dificultad ? 'bg-lab-gold' : 'bg-lab-border'}`}
                />
              ))}
            </span>
          )}
        </div>
        <h3 className="font-display text-xl tracking-wider text-lab-white">
          {trivia.pregunta}
        </h3>
      </div>

      {/* Options */}
      <div className="p-5 space-y-2">
        {opciones.map((opcion, idx) => {
          let bgClass = 'bg-lab-navy hover:bg-lab-surface-light border-lab-border hover:border-lab-gold/30'
          let textClass = 'text-lab-gray'

          if (revealed) {
            if (idx === trivia.respuesta_correcta) {
              bgClass = 'bg-green-900/30 border-green-500/50'
              textClass = 'text-green-300'
            } else if (idx === selected) {
              bgClass = 'bg-red-900/30 border-red-500/50'
              textClass = 'text-red-300'
            } else {
              bgClass = 'bg-lab-navy/50 border-lab-border/50 opacity-50'
            }
          }

          return (
            <button
              key={idx}
              onClick={() => handleSelect(idx)}
              disabled={revealed}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all font-condensed tracking-wide ${bgClass} ${textClass} ${
                !revealed ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opcion}</span>
                {revealed && idx === trivia.respuesta_correcta && (
                  <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />
                )}
                {revealed && idx === selected && idx !== trivia.respuesta_correcta && (
                  <XCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Result + Explanation */}
      {revealed && (
        <div className="px-5 pb-5 space-y-3 animate-fade-in-up">
          <div className={`rounded-lg px-4 py-3 ${isCorrect ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
            <p className={`font-display text-lg tracking-wider ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {isCorrect ? '¡CORRECTO!' : 'INCORRECTO'}
            </p>
            {trivia.explicacion && (
              <p className="text-lab-gray text-sm mt-1">{trivia.explicacion}</p>
            )}
          </div>

          {onNextTrivia && (
            <button
              onClick={handleNext}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-lab-gold text-lab-accent-fg font-condensed font-bold tracking-wider uppercase hover:bg-lab-gold-light transition-colors"
            >
              Siguiente Pregunta
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      )}
    </div>
  )
}
