/**
 * Query params del listado público `/productos`.
 * La URL es la fuente de verdad de filtros + paginación.
 */

import type { CatalogCategoryNode } from '@/lib/catalog-category-public'

export const CATALOG_PRODUCTOS_SORTS = [
  'featured',
  'name_asc',
  'name_desc',
] as const

export type CatalogProductosSort = (typeof CATALOG_PRODUCTOS_SORTS)[number]

export const CATALOG_PRODUCTOS_DEFAULT_SORT: CatalogProductosSort = 'featured'

export type CatalogProductosState = {
  q: string
  categoryRoot: string
  category: string
  brand: string
  sort: CatalogProductosSort
  page: number
}

export const CATALOG_PRODUCTOS_DEFAULTS: CatalogProductosState = {
  q: '',
  categoryRoot: '',
  category: '',
  brand: '',
  sort: CATALOG_PRODUCTOS_DEFAULT_SORT,
  page: 1,
}

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function parseCatalogProductosSort(
  raw: string | undefined,
): CatalogProductosSort {
  if (raw && (CATALOG_PRODUCTOS_SORTS as readonly string[]).includes(raw)) {
    return raw as CatalogProductosSort
  }
  return CATALOG_PRODUCTOS_DEFAULT_SORT
}

export function parseCatalogProductosState(
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null,
): CatalogProductosState {
  if (searchParams instanceof URLSearchParams) {
    return {
      q: (searchParams.get('q') ?? '').trim(),
      categoryRoot: (searchParams.get('categoryRoot') ?? '').trim(),
      category: (searchParams.get('category') ?? '').trim(),
      brand: (searchParams.get('brand') ?? '').trim(),
      sort: parseCatalogProductosSort(searchParams.get('sort') ?? undefined),
      page: parsePage(searchParams.get('page') ?? undefined),
    }
  }

  if (searchParams) {
    return {
      q: (firstParam(searchParams.q) ?? '').trim(),
      categoryRoot: (firstParam(searchParams.categoryRoot) ?? '').trim(),
      category: (firstParam(searchParams.category) ?? '').trim(),
      brand: (firstParam(searchParams.brand) ?? '').trim(),
      sort: parseCatalogProductosSort(firstParam(searchParams.sort)),
      page: parsePage(firstParam(searchParams.page)),
    }
  }

  return { ...CATALOG_PRODUCTOS_DEFAULTS }
}

export type CatalogProductosPatch = Partial<{
  q: string | null
  categoryRoot: string | null
  category: string | null
  brand: string | null
  sort: CatalogProductosSort | null
  page: number | null
}>

/**
 * Cambiar root invalida la hoja anterior salvo que el patch la reemplace explícitamente.
 */
export function applyCatalogProductosPatch(
  current: CatalogProductosState,
  patch: CatalogProductosPatch = {},
): CatalogProductosState {
  const rootChanged =
    patch.categoryRoot !== undefined && patch.categoryRoot !== current.categoryRoot

  const nextRoot =
    patch.categoryRoot === null
      ? ''
      : patch.categoryRoot !== undefined
        ? patch.categoryRoot.trim()
        : current.categoryRoot

  let nextCategory =
    patch.category === null
      ? ''
      : patch.category !== undefined
        ? patch.category.trim()
        : current.category

  if (rootChanged && patch.category === undefined) {
    nextCategory = ''
  }

  if (patch.categoryRoot === null) {
    nextCategory = ''
  }

  return {
    q:
      patch.q === null
        ? ''
        : patch.q !== undefined
          ? patch.q.trim()
          : current.q,
    categoryRoot: nextRoot,
    category: nextCategory,
    brand:
      patch.brand === null
        ? ''
        : patch.brand !== undefined
          ? patch.brand.trim()
          : current.brand,
    sort:
      patch.sort === null
        ? CATALOG_PRODUCTOS_DEFAULT_SORT
        : patch.sort !== undefined
          ? patch.sort
          : current.sort,
    page:
      patch.page === null
        ? 1
        : patch.page !== undefined
          ? Math.max(1, Math.floor(patch.page) || 1)
          : current.page,
  }
}

/** Params serializados (omite defaults vacíos y sort=featured). */
export function buildCatalogProductosSearchParams(
  state: CatalogProductosState,
): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.q) sp.set('q', state.q)
  if (state.categoryRoot) sp.set('categoryRoot', state.categoryRoot)
  if (state.category) sp.set('category', state.category)
  if (state.brand) sp.set('brand', state.brand)
  if (state.sort !== CATALOG_PRODUCTOS_DEFAULT_SORT) sp.set('sort', state.sort)
  if (state.page > 1) sp.set('page', String(state.page))
  return sp
}

export function buildCatalogProductosHref(
  basePath: string,
  current: CatalogProductosState,
  patch: CatalogProductosPatch = {},
): string {
  const next = applyCatalogProductosPatch(current, patch)
  const qs = buildCatalogProductosSearchParams(next).toString()
  return `${basePath}${qs ? `?${qs}` : ''}`
}

/** Params para paginación (sin page). */
export function catalogProductosPaginationParams(
  state: CatalogProductosState,
): Record<string, string> {
  const sp = buildCatalogProductosSearchParams({ ...state, page: 1 })
  const out: Record<string, string> = {}
  sp.forEach((value, key) => {
    out[key] = value
  })
  return out
}

export function countActiveCatalogProductosFilters(
  state: CatalogProductosState,
): number {
  let n = 0
  if (state.q) n += 1
  if (state.categoryRoot) n += 1
  if (state.category) n += 1
  if (state.brand) n += 1
  if (state.sort !== CATALOG_PRODUCTOS_DEFAULT_SORT) n += 1
  return n
}

/** Resuelve root efectivo cuando la URL trae solo `category` (legacy). */
export function resolveEffectiveCategoryRoot(
  state: Pick<CatalogProductosState, 'categoryRoot' | 'category'>,
  tree: CatalogCategoryNode[],
): string {
  if (state.categoryRoot) return state.categoryRoot
  if (!state.category) return ''
  return findRootSlugForLeaf(tree, state.category) ?? ''
}

export function findRootSlugForLeaf(
  tree: CatalogCategoryNode[],
  leafSlug: string,
): string | null {
  for (const root of tree) {
    if (root.slug === leafSlug) return root.slug
    for (const child of root.children ?? []) {
      if (child.slug === leafSlug) return root.slug
    }
  }
  return null
}

export function findCategoryNodeBySlug(
  tree: CatalogCategoryNode[],
  slug: string,
): CatalogCategoryNode | null {
  for (const root of tree) {
    if (root.slug === slug) return root
    for (const child of root.children ?? []) {
      if (child.slug === slug) return child
    }
  }
  return null
}

/** Si la marca no está en el contexto actual, limpiarla. */
export function sanitizeBrandForContext(
  brand: string,
  availableBrands: Array<{ slug: string }>,
): string {
  if (!brand) return ''
  return availableBrands.some((b) => b.slug === brand) ? brand : ''
}

export const CATALOG_PRODUCTOS_SORT_LABELS: Record<CatalogProductosSort, string> =
  {
    featured: 'Relevancia / Destacados',
    name_asc: 'Nombre A–Z',
    name_desc: 'Nombre Z–A',
  }

/** Path limpio del listado público (host catálogo). */
export const CATALOG_PRODUCTOS_PUBLIC_PATH = '/productos'

/** Path con prefijo en local/preview. */
export const CATALOG_PRODUCTOS_PREFIX_PATH = '/catalogo/productos'

const CATALOG_PRODUCTOS_RETURN_QUERY_KEYS = new Set([
  'q',
  'categoryRoot',
  'category',
  'brand',
  'sort',
  'page',
])

function isCatalogProductosListPathname(pathname: string): boolean {
  return (
    pathname === CATALOG_PRODUCTOS_PUBLIC_PATH ||
    pathname === CATALOG_PRODUCTOS_PREFIX_PATH
  )
}

/**
 * Valida un `from` decodificado: solo rutas internas del listado `/productos`.
 * Rechaza URLs externas, protocol-relative y query keys no permitidas.
 */
export function isValidCatalogProductosReturnUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false
  const trimmed = url.trim()
  if (!trimmed.startsWith('/')) return false
  if (trimmed.startsWith('//')) return false
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) return false

  let parsed: URL
  try {
    parsed = new URL(trimmed, 'http://internal.local')
  } catch {
    return false
  }

  if (!isCatalogProductosListPathname(parsed.pathname)) return false

  for (const key of parsed.searchParams.keys()) {
    if (!CATALOG_PRODUCTOS_RETURN_QUERY_KEYS.has(key)) return false
  }

  return true
}

/** Decodifica `from` con un nivel; rechaza valores inválidos. */
export function parseCatalogProductosReturnUrl(
  fromParam: string | null | undefined,
): string | null {
  if (fromParam == null || fromParam === '') return null
  let decoded: string
  try {
    decoded = decodeURIComponent(fromParam)
  } catch {
    return null
  }
  return isValidCatalogProductosReturnUrl(decoded) ? decoded : null
}

/** Destino del breadcrumb/enlace «Productos»: `from` válido o fallback. */
export function resolveCatalogProductosBackHref(
  fromParam: string | null | undefined,
  fallbackPath: string = CATALOG_PRODUCTOS_PUBLIC_PATH,
): string {
  return parseCatalogProductosReturnUrl(fromParam) ?? fallbackPath
}

/** URL exacta del listado actual (pathname + query string). */
export function buildCatalogProductosReturnUrl(
  searchParams: URLSearchParams | string,
  pathname: string,
): string {
  const qs =
    typeof searchParams === 'string'
      ? searchParams.replace(/^\?/, '')
      : searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** Href al detalle preservando el listado de origen en `from`. */
export function buildCatalogProductDetailHref(
  detailPath: string,
  returnUrl: string,
  fallbackPath: string = CATALOG_PRODUCTOS_PUBLIC_PATH,
): string {
  const safeReturn = isValidCatalogProductosReturnUrl(returnUrl)
    ? returnUrl
    : fallbackPath
  const from = encodeURIComponent(safeReturn)
  return `${detailPath}?from=${from}`
}

/** ¿El pathname corresponde al listado público de productos? */
export function isCatalogProductosListPath(pathname: string): boolean {
  return isCatalogProductosListPathname(pathname)
}
