import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isCatalogHostName } from '@/lib/catalog-paths'

/**
 * - catalogo.ifedel.com → reescribe UI a `/catalogo/*`.
 * - Dominio principal → catálogo en `/catalogo`.
 * - `/api/*` nunca se reescribe ni se marca como ruta de catálogo UI.
 * - La excepción pública es solo `/catalogo/*` y `/api/catalog/*` (estas últimas
 *   son públicas por diseño en sus route handlers; NO vía este flag).
 */
export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const catalogHost = isCatalogHostName(host)
  const { pathname } = req.nextUrl
  const isApi = pathname.startsWith('/api')
  const isCatalogUiPath =
    pathname === '/catalogo' || pathname.startsWith('/catalogo/')

  const requestHeaders = new Headers(req.headers)
  requestHeaders.set('x-pathname', pathname)

  // Flags SOLO para UI del catálogo. Nunca para /api/products ni ningún /api/*.
  if (!isApi && (catalogHost || isCatalogUiPath)) {
    requestHeaders.set('x-ifedel-catalog-route', '1')
  }
  if (!isApi && catalogHost) {
    requestHeaders.set('x-ifedel-catalog', '1')
  }

  // Assets / API / estáticos — sin rewrite
  if (
    isApi ||
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
  if (isCatalogUiPath) {
    const url = req.nextUrl.clone()
    const rest =
      pathname === '/catalogo' ? '/' : pathname.slice('/catalogo'.length) || '/'
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
