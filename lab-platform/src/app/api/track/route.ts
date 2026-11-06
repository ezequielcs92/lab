import { NextResponse } from 'next/server'
import { createPublicClient } from '@/lib/supabase/public'
import { isBotUserAgent, trackedPath } from '@/lib/page-views'

// Counts one page view. It never fails loudly: a visitor must not notice if the counter is down.
export async function POST(request: Request) {
  try {
    if (isBotUserAgent(request.headers.get('user-agent'))) return new NextResponse(null, { status: 204 })
    const body = await request.json().catch(() => null) as { path?: unknown } | null
    const path = trackedPath(body?.path)
    if (path) await createPublicClient().rpc('registrar_visita', { p_ruta: path })
  } catch (error) {
    console.error('[track]', error instanceof Error ? error.message : error)
  }
  return new NextResponse(null, { status: 204, headers: { 'Cache-Control': 'no-store' } })
}
