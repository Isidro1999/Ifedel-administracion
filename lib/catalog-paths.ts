/**
 * Rutas del catálogo público.
 *
 * Producción (host catálogo):
 *   ifedel.com → `/`, `/productos`, … (middleware reescribe a /catalogo/*)
 *
 * Legacy (redirect 308 a ifedel.com):
 *   catalogo.ifedel.com, www.catalogo.ifedel.com, www.ifedel.com
 *
 * Local / Preview:
 *   catalogo.localhost → paths limpios (simulación)
 *   localhost / *.vercel.app → `/catalogo`, `/catalogo/productos`, …
 *
 * Backoffice: app.ifedel.com (no es host de catálogo).
 */

export const CATALOG_PREFIX = '/catalogo'

/** Origen canónico público del catálogo (producción). */
export const CATALOG_PUBLIC_ORIGIN = 'https://ifedel.com'

/** @deprecated Usar CATALOG_PREFIX o catalogPath() */
export const CATALOG_BASE = CATALOG_PREFIX

function normalizeHost(host: string | null | undefined): string {
  return (host || '').split(':')[0].toLowerCase()
}

/**
 * Hosts que sirven el catálogo con paths limpios (rewrite a /catalogo/*).
 * No incluye www ni catalogo.* legacy (esos redirigen a ifedel.com).
 */
export function isCatalogHostName(host: string | null | undefined): boolean {
  const h = normalizeHost(host)
  return h === 'ifedel.com' || h === 'catalogo.localhost'
}

/** Subdominio legacy del catálogo → redirect permanente a ifedel.com. */
export function isLegacyCatalogRedirectHost(
  host: string | null | undefined,
): boolean {
  const h = normalizeHost(host)
  return h === 'catalogo.ifedel.com' || h === 'www.catalogo.ifedel.com'
}

/** www del apex → redirect permanente a ifedel.com (sin www). */
export function isWwwCatalogRedirectHost(
  host: string | null | undefined,
): boolean {
  return normalizeHost(host) === 'www.ifedel.com'
}

/**
 * Construye un path de UI del catálogo.
 * @param path segmento relativo, ej: "", "productos", "productos/mi-slug", "consulta", "categorias/x"
 * @param onCatalogHost si true, omite el prefijo /catalogo (host catálogo / simulación local)
 */
export function catalogPath(
  path: string = '',
  onCatalogHost?: boolean,
): string {
  let onHost = onCatalogHost
  if (onHost === undefined && typeof window !== 'undefined') {
    onHost = isCatalogHostName(window.location.host)
  }

  let segment = (path || '').replace(/^\/+/, '')
  // Evitar /catalogo/catalogo/...
  if (segment === 'catalogo' || segment.startsWith('catalogo/')) {
    segment = segment.replace(/^catalogo\/?/, '')
  }

  if (onHost) {
    return segment ? `/${segment}` : '/'
  }
  return segment ? `${CATALOG_PREFIX}/${segment}` : CATALOG_PREFIX
}

/** URL absoluta de una ruta de catálogo (para WhatsApp / preview admin). */
export function catalogAbsoluteUrl(
  path: string = '',
  opts?: { onCatalogHost?: boolean; origin?: string },
): string {
  const origin =
    opts?.origin?.replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_CATALOG_URL?.replace(/\/$/, '') ||
    (typeof window !== 'undefined' ? window.location.origin : '') ||
    CATALOG_PUBLIC_ORIGIN

  // Si el origin es el host público del catálogo, paths limpios.
  let onHost = opts?.onCatalogHost
  if (onHost === undefined) {
    try {
      onHost = isCatalogHostName(new URL(origin).host)
    } catch {
      onHost =
        origin.includes('://ifedel.com') &&
        !origin.includes('://app.ifedel.com') &&
        !origin.includes('://www.ifedel.com')
    }
  }

  const rel = catalogPath(path, onHost)
  return `${origin}${rel === '/' ? '' : rel}` || origin
}
