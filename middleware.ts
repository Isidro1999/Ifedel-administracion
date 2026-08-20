import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import {
  CATALOG_PUBLIC_ORIGIN,
  catalogUiPathToPublicPathname,
  isAppHostName,
  isCatalogHostName,
  isLegacyCatalogRedirectHost,
  isWwwCatalogRedirectHost,
} from '@/lib/catalog-paths'

/**
 * - ifedel.com / catalogo.localhost → reescribe UI a `/catalogo/*`.
 * - catalogo.ifedel.com / www.catalogo.ifedel.com / www.ifedel.com → 308 a ifedel.com.
 * - app.ifedel.com/catalogo/* → 308 a ifedel.com paths limpios (sin duplicar catálogo).
 * - app.ifedel.com (resto) / localhost / *.vercel.app → backoffice o `/catalogo` con prefijo.
 * - `/api/*` nunca se reescribe ni se marca como ruta de catálogo UI.
 */
function redirectToPublicCatalogOrigin(req: NextRequest): NextResponse {
  const target = new URL(req.url)
  target.protocol = 'https:'
  target.hostname = 'ifedel.com'
  target.port = ''
  // path + search + hash se conservan desde req.url
  return NextResponse.redirect(target, 308)
}

/** app.ifedel.com/catalogo[/...] → https://ifedel.com[/...] (paths limpios). */
function redirectAppCatalogToPublicOrigin(req: NextRequest): NextResponse {
  const target = new URL(CATALOG_PUBLIC_ORIGIN)
  target.pathname = catalogUiPathToPublicPathname(req.nextUrl.pathname)
  target.search = req.nextUrl.search
  return NextResponse.redirect(target, 308)
}

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') || ''
  const { pathname } = req.nextUrl
  const isCatalogUiPath =
    pathname === '/catalogo' || pathname.startsWith('/catalogo/')

  // Redirects de host primero (evitan servir contenido indexable en hosts legacy/www).
  if (isLegacyCatalogRedirectHost(host) || isWwwCatalogRedirectHost(host)) {
    return redirectToPublicCatalogOrigin(req)
  }

  // Backoffice no debe servir el catálogo con prefijo (duplicado SEO).
  if (isAppHostName(host) && isCatalogUiPath) {
    return redirectAppCatalogToPublicOrigin(req)
  }

  const catalogHost = isCatalogHostName(host)
  const isApi = pathname.startsWith('/api')

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

  // En host catálogo, URLs con prefijo /catalogo → redirect limpio (SEO / UX)
  if (isCatalogUiPath) {
    const url = req.nextUrl.clone()
    url.pathname = catalogUiPathToPublicPathname(pathname)
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
