import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const response = await updateSession(request)
  // Inyecta el pathname como header para que el RootLayout pueda leerlo
  const res = response instanceof NextResponse ? response : NextResponse.next()
  res.headers.set('x-pathname', request.nextUrl.pathname)
  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
