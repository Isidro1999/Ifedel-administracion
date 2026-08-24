import type { Metadata } from 'next'

/** Páginas de listado/detalle públicas del catálogo. */
export const catalogIndexFollowRobots: Metadata['robots'] = {
  index: true,
  follow: true,
}

/**
 * URLs utilitarias (filtros, búsqueda, paginación, consulta):
 * no indexar, pero seguir enlaces a productos.
 */
export const catalogNoindexFollowRobots: Metadata['robots'] = {
  index: false,
  follow: true,
}

export function firstSearchParam(
  v: string | string[] | undefined,
): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

/** Query params utilitarios del listado `/productos`. */
export const PRODUCTOS_UTILITY_PARAM_KEYS = [
  'q',
  'brand',
  'category',
  'categoryRoot',
  'page',
  'sort',
] as const

/** Query params utilitarios de `/categorias/[slug]`. */
export const CATEGORIA_UTILITY_PARAM_KEYS = [
  'category',
  'brand',
  'page',
  'sort',
] as const

export function hasUtilitySearchParams(
  searchParams: Record<string, string | string[] | undefined>,
  keys: readonly string[],
): boolean {
  return keys.some((key) => firstSearchParam(searchParams[key]).length > 0)
}

/**
 * Canonical relativo al `metadataBase` del layout catálogo
 * (`https://ifedel.com`).
 */
export function catalogCanonicalPath(path: string): string {
  if (!path || path === '/') return '/'
  return path.startsWith('/') ? path : `/${path}`
}

export function catalogListingSeo(opts: {
  hasUtilityParams: boolean
  canonicalPath: string
}): Pick<Metadata, 'robots' | 'alternates'> {
  return {
    robots: opts.hasUtilityParams
      ? catalogNoindexFollowRobots
      : catalogIndexFollowRobots,
    alternates: {
      canonical: catalogCanonicalPath(opts.canonicalPath),
    },
  }
}
