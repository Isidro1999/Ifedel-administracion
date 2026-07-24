/**
 * Rutas del catálogo público.
 *
 * - Local / dominio principal: `/catalogo`, `/catalogo/productos`, …
 * - Subdominio catalogo.ifedel.com: `/`, `/productos`, … (middleware reescribe a /catalogo/*)
 */

export const CATALOG_PREFIX = '/catalogo'

/** @deprecated Usar CATALOG_PREFIX o catalogPath() */
export const CATALOG_BASE = CATALOG_PREFIX

export function isCatalogHostName(host: string | null | undefined): boolean {
  const h = (host || '').split(':')[0].toLowerCase()
  return (
    h === 'catalogo.ifedel.com' ||
    h === 'www.catalogo.ifedel.com' ||
    h === 'catalogo.localhost'
  )
}

/**
 * Construye un path de UI del catálogo.
 * @param path segmento relativo, ej: "", "productos", "productos/mi-slug", "consulta", "categorias/x"
 * @param onCatalogHost si true, omite el prefijo /catalogo (subdominio)
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
    'https://catalogo.ifedel.com'

  // Si el origin es el subdominio de catálogo, paths limpios.
  let onHost = opts?.onCatalogHost
  if (onHost === undefined) {
    try {
      onHost = isCatalogHostName(new URL(origin).host)
    } catch {
      onHost = origin.includes('catalogo.ifedel.com')
    }
  }

  const rel = catalogPath(path, onHost)
  return `${origin}${rel === '/' ? '' : rel}` || origin
}
