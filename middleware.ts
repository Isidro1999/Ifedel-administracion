import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isCatalogHostName } from '@/lib/catalog-paths'

/**
 * - catalogo.ifedel.com → reescribe `/productos` → `/catalogo/productos`, etc.
 * - Dominio principal → sin cambios (catálogo en `/catalogo`).
 * - No toca `/api`, `_next`, estáticos.
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const catalogHost = isCatalogHostName(host)
  const { pathname } = req.nextUrl

  const requestHeaders = new Headers(req.headers)
  if (catalogHost) {
    requestHeaders.set('x-ifedel-catalog', '1')
  }

  // Assets / API / estáticos
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/brand') ||
    pathname.startsWith('/favicon') ||
    /\.[a-zA-Z0-9]+$/.test(pathname)
  ) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  if (!catalogHost) {
    return NextResponse.next({
      request: { headers: requestHeaders },
    })
  }

  // En subdominio, URLs con prefijo /catalogo → redirect limpio (SEO / UX)
  if (pathname === '/catalogo' || pathname.startsWith('/catalogo/')) {
    const url = req.nextUrl.clone()
    const rest =
      pathname === '/catalogo' ? '/' : pathname.slice('/catalogo'.length) || '/'
    // Evitar /catalogo/catalogo
    const clean =
      rest === '/catalogo' || rest.startsWith('/catalogo/')
        ? rest.replace(/^\/catalogo/, '') || '/'
        : rest
    url.pathname = clean.startsWith('/') ? clean : `/${clean}`
    return NextResponse.redirect(url)
  }

  // Rewrite limpio → app/(catalogo)/catalogo/*
  const url = req.nextUrl.clone()
  if (pathname === '/') {
    url.pathname = '/catalogo'
  } else {
    url.pathname = `/catalogo${pathname}`
  }

  // Guard contra doble prefijo
  if (url.pathname.startsWith('/catalogo/catalogo')) {
    url.pathname = url.pathname.replace(/^\/catalogo\/catalogo/, '/catalogo')
  }

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
