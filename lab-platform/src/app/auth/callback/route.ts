import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const DEFAULT_REDIRECT = '/admin'
const LOGIN_ERROR_PATH = '/login'

function safeNext(value: string | null): string {
  if (!value) return DEFAULT_REDIRECT
  // Solo rutas relativas internas. Rechaza redirecciones de protocolo (//host),
  // barras invertidas y saltos de línea que puedan usarse para open redirect.
  if (
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.startsWith('/\\') ||
    /[\r\n]/.test(value)
  ) {
    return DEFAULT_REDIRECT
  }
  return value
}

function redirectWithError(origin: string, next: string, errorCode: string): NextResponse {
  const url = new URL(LOGIN_ERROR_PATH, origin)
  if (next && next !== DEFAULT_REDIRECT) url.searchParams.set('next', next)
  url.searchParams.set('error', errorCode)
  return NextResponse.redirect(url)
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  const next = safeNext(req.nextUrl.searchParams.get('next'))

  const origin = req.nextUrl.origin

  if (!code) {
    return redirectWithError(origin, next, 'codigo_requerido')
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('Error en callback de auth:', error.message)
    return redirectWithError(origin, next, 'sesion_invalida')
  }

  return NextResponse.redirect(new URL(next, req.url))
}
