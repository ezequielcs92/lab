import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { isUuid } from '@/lib/mvp-voting'

function noStoreJson(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } })
}

export async function GET() {
  const { data, error } = await createAdminClient()
    .from('trivias')
    .select('id, pregunta, opciones, dificultad')
    .eq('activa', true)
    .limit(10)

  if (error) {
    console.error('[trivias] Failed to load questions')
    return noStoreJson({ error: 'No se pudieron cargar las trivias' }, 500)
  }

  return noStoreJson({ trivias: data ?? [] })
}

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return noStoreJson({ error: 'Solicitud inválida' }, 400)
  }

  if (!body || typeof body !== 'object') {
    return noStoreJson({ error: 'Solicitud inválida' }, 400)
  }

  const { trivia_id: triviaId, selected } = body as Record<string, unknown>
  if (!isUuid(triviaId) || !Number.isInteger(selected) || (selected as number) < 0) {
    return noStoreJson({ error: 'Solicitud inválida' }, 400)
  }

  const { data: trivia, error } = await createAdminClient()
    .from('trivias')
    .select('respuesta_correcta, explicacion, opciones')
    .eq('id', triviaId)
    .eq('activa', true)
    .maybeSingle()

  const optionCount = Array.isArray(trivia?.opciones) ? trivia.opciones.length : 0
  if (error || !trivia || (selected as number) >= optionCount) {
    return noStoreJson({ error: 'Trivia no encontrada' }, 404)
  }

  return noStoreJson({
    correct: selected === trivia.respuesta_correcta,
    correctAnswer: trivia.respuesta_correcta,
    explanation: trivia.explicacion,
  })
}
