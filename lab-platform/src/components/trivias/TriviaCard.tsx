'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, ArrowRight, Lightbulb } from 'lucide-react'

export interface PublicTrivia {
  id: string
  pregunta: string
  opciones: string[]
  dificultad: number | null
}

interface TriviaCardProps {
  trivia: PublicTrivia
  onNextTrivia?: () => void
}

export default function TriviaCard({ trivia, onNextTrivia }: TriviaCardProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [correctAnswer, setCorrectAnswer] = useState<number | null>(null)
  const [explanation, setExplanation] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const opciones = trivia.opciones
  const difficulty = trivia.dificultad ?? 0
  const isCorrect = selected !== null && selected === correctAnswer

  async function handleSelect(idx: number) {
    if (revealed || checking) return
    setSelected(idx)
    setChecking(true)
    setError(null)

    try {
      const response = await fetch('/api/trivias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trivia_id: trivia.id, selected: idx }),
      })
      const result = await response.json() as {
        correctAnswer?: number
        explanation?: string | null
        error?: string
      }
      if (!response.ok || !Number.isInteger(result.correctAnswer)) {
        throw new Error(result.error ?? 'No se pudo validar la respuesta')
      }
      setCorrectAnswer(result.correctAnswer ?? null)
      setExplanation(result.explanation ?? null)
      setRevealed(true)
    } catch (cause) {
      setSelected(null)
      setError(cause instanceof Error ? cause.message : 'No se pudo validar la respuesta')
    } finally {
      setChecking(false)
    }
  }

  function handleNext() {
    setSelected(null)
    setRevealed(false)
    setCorrectAnswer(null)
    setExplanation(null)
    setError(null)
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
          {difficulty > 0 && (
            <span className="ml-auto flex gap-0.5">
              {[1, 2, 3].map((d) => (
                <span
                  key={d}
                  className={`w-2 h-2 rounded-full ${d <= difficulty ? 'bg-lab-gold' : 'bg-lab-border'}`}
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
            if (idx === correctAnswer) {
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
              onClick={() => void handleSelect(idx)}
              disabled={revealed || checking}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all font-condensed tracking-wide ${bgClass} ${textClass} ${
                !revealed ? 'cursor-pointer' : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span>{opcion}</span>
                {revealed && idx === correctAnswer && (
                  <CheckCircle className="w-5 h-5 text-green-400 ml-auto flex-shrink-0" />
                )}
                {revealed && idx === selected && idx !== correctAnswer && (
                  <XCircle className="w-5 h-5 text-red-400 ml-auto flex-shrink-0" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {error && <p className="px-5 pb-3 text-sm text-lab-red">{error}</p>}

      {/* Result + Explanation */}
      {revealed && (
        <div className="px-5 pb-5 space-y-3 animate-fade-in-up">
          <div className={`rounded-lg px-4 py-3 ${isCorrect ? 'bg-green-900/20 border border-green-500/30' : 'bg-red-900/20 border border-red-500/30'}`}>
            <p className={`font-display text-lg tracking-wider ${isCorrect ? 'text-green-300' : 'text-red-300'}`}>
              {isCorrect ? '¡CORRECTO!' : 'INCORRECTO'}
            </p>
            {explanation && (
              <p className="text-lab-gray text-sm mt-1">{explanation}</p>
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
