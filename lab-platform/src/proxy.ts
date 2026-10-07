import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { isCrossSiteMutation } from '@/lib/request-security'
import { createMaintenanceResponse, SITE_MAINTENANCE_ENABLED } from '@/lib/site-maintenance'

export async function proxy(request: NextRequest) {
  if (SITE_MAINTENANCE_ENABLED) return createMaintenanceResponse(request.method)

  // Preserve the previous static-asset exclusions when maintenance is disabled.
  const pathname = request.nextUrl.pathname
  if (pathname.startsWith('/_next/static') || pathname.startsWith('/_next/image') ||
      pathname === '/favicon.ico' || /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pathname)) {
    return NextResponse.next()
  }

  if (isCrossSiteMutation(request)) {
    return NextResponse.json({ error: 'Origen no permitido' }, { status: 403 })
  }

  const response = await updateSession(request)
  // Inyecta el pathname como header para que el RootLayout pueda leerlo
  const res = response instanceof NextResponse ? response : NextResponse.next()
  res.headers.set('x-pathname', request.nextUrl.pathname)
  return res
}

export const config = {
  matcher: [
    '/:path*',
  ],
}
