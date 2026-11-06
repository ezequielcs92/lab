import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { hasAuthCookie, isSessionRoute, withTimeout } from './session-guard'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })
  const pathname = request.nextUrl.pathname
  const isAdminRoute = pathname.startsWith('/admin')

  // Without a session cookie there is nothing to refresh and nobody to authenticate, so
  // anonymous visitors never wait on Supabase here.
  if (!hasAuthCookie(request.cookies.getAll())) {
    if (!isAdminRoute) return supabaseResponse
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Public pages do not use the session, so a logged-in visitor does not need a lookup there either.
  if (!isSessionRoute(pathname)) return supabaseResponse

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  let user = null
  try {
    const { data } = await withTimeout(supabase.auth.getUser())
    user = data.user
  } catch {
    // Supabase is not answering. Public pages go on without refreshing the session; the admin
    // cannot verify who is asking, so it answers right away instead of hanging.
    if (!isAdminRoute) return supabaseResponse
    return new NextResponse('El servicio no responde. Probá de nuevo en unos minutos.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', 'Retry-After': '60' },
    })
  }

  // Proteger rutas de admin
  if (isAdminRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
