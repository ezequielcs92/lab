import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { isUuid } from '@/lib/mvp-voting'

interface TriviaPayload {
  pregunta: string
  opciones: string[]
  respuesta_correcta: number
  dificultad: number
  explicacion: string | null
  activa: boolean
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data: profile } = await supabase.from('perfiles').select('rol').eq('id', user.id).single()
  return profile?.rol === 'admin_liga'
}

function parsePayload(value: unknown): TriviaPayload | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  const pregunta = typeof body.pregunta === 'string' ? body.pregunta.trim() : ''
  const opciones = Array.isArray(body.opciones)
    ? body.opciones.filter((item): item is string => typeof item === 'string').map((item) => item.trim()).filter(Boolean)
    : []
  const respuestaCorrecta = body.respuesta_correcta
  const dificultad = body.dificultad
  const explicacion = typeof body.explicacion === 'string' ? body.explicacion.trim() || null : null

  if (
    !pregunta || pregunta.length > 1000 || opciones.length < 2 || opciones.length > 6 ||
    opciones.some((option) => option.length > 500) ||
    !Number.isInteger(respuestaCorrecta) || (respuestaCorrecta as number) < 0 ||
    (respuestaCorrecta as number) >= opciones.length ||
    !Number.isInteger(dificultad) || (dificultad as number) < 1 || (dificultad as number) > 3 ||
    (explicacion?.length ?? 0) > 5000 || typeof body.activa !== 'boolean'
  ) {
    return null
  }

  return {
    pregunta,
    opciones,
    respuesta_correcta: respuestaCorrecta as number,
    dificultad: dificultad as number,
    explicacion,
    activa: body.activa,
  }
}

export async function POST(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const payload = parsePayload(await request.json().catch(() => null))
  if (!payload) return NextResponse.json({ error: 'Datos de trivia inválidos' }, { status: 400 })

  const { data, error } = await createAdminClient().from('trivias').insert({
    ...payload,
    archivo_historico_id: null,
  }).select('*').single()
  if (error) return NextResponse.json({ error: 'No se pudo crear la trivia' }, { status: 500 })
  return NextResponse.json({ trivia: data })
}

export async function PATCH(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await request.json().catch(() => null) as Record<string, unknown> | null
  const payload = parsePayload(body)
  if (!body || !isUuid(body.id) || !payload) {
    return NextResponse.json({ error: 'Datos de trivia inválidos' }, { status: 400 })
  }

  const { data, error } = await createAdminClient()
    .from('trivias')
    .update(payload)
    .eq('id', body.id)
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: 'No se pudo actualizar la trivia' }, { status: 500 })
  return NextResponse.json({ trivia: data })
}

export async function DELETE(request: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const id = request.nextUrl.searchParams.get('id')
  if (!isUuid(id)) return NextResponse.json({ error: 'Identificador inválido' }, { status: 400 })

  const { error } = await createAdminClient().from('trivias').delete().eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo eliminar la trivia' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
