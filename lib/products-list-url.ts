/**
 * Query params del listado interno `/products`.
 * La URL es la fuente de verdad de filtros + paginación.
 */

import {
  PRODUCTS_DEFAULT_PAGE_SIZE,
  parsePaginationParams,
} from '@/lib/pagination'

export const PRODUCTS_LIST_PATH = '/products'

export const PRODUCTS_LIST_DEFAULT_SORT = 'name_asc'

export const PRODUCTS_LIST_SORTS = [
  'name_asc',
  'name_desc',
  'price_asc',
  'price_desc',
] as const

export type ProductsListSort = (typeof PRODUCTS_LIST_SORTS)[number]

export type ProductsListState = {
  q: string
  brand: string
  category: string
  sort: ProductsListSort
  page: number
  pageSize: number
}

export const PRODUCTS_LIST_DEFAULTS: ProductsListState = {
  q: '',
  brand: '',
  category: '',
  sort: PRODUCTS_LIST_DEFAULT_SORT,
  page: 1,
  pageSize: PRODUCTS_DEFAULT_PAGE_SIZE,
}

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseSort(raw: string | undefined): ProductsListSort {
  if (
    raw &&
    (PRODUCTS_LIST_SORTS as readonly string[]).includes(raw)
  ) {
    return raw as ProductsListSort
  }
  return PRODUCTS_LIST_DEFAULT_SORT
}

/**
 * Lee y valida el estado del listado desde searchParams / URLSearchParams.
 * page inválida → 1; sort desconocido → default.
 */
export function parseProductsListState(
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null,
): ProductsListState {
  let q = ''
  let brand = ''
  let category = ''
  let sortRaw: string | undefined

  if (searchParams instanceof URLSearchParams) {
    q = (searchParams.get('q') ?? '').trim()
    brand = (searchParams.get('brand') ?? '').trim()
    category = (searchParams.get('category') ?? '').trim()
    sortRaw = searchParams.get('sort') ?? undefined
  } else if (searchParams) {
    q = (firstParam(searchParams.q) ?? '').trim()
    brand = (firstParam(searchParams.brand) ?? '').trim()
    category = (firstParam(searchParams.category) ?? '').trim()
    sortRaw = firstParam(searchParams.sort)
  }

  const { page, pageSize } = parsePaginationParams(searchParams, {
    defaultPageSize: PRODUCTS_DEFAULT_PAGE_SIZE,
  })

  return {
    q,
    brand,
    category,
    sort: parseSort(sortRaw),
    page,
    pageSize,
  }
}

export type ProductsListPatch = Partial<{
  q: string | null
  brand: string | null
  category: string | null
  sort: ProductsListSort | null
  page: number | null
  pageSize: number | null
}>

/**
 * Aplica un patch sobre el estado actual y arma URLSearchParams limpios
 * (omite defaults: page=1, sort default, strings vacíos).
 */
export function buildProductsListSearchParams(
  current: ProductsListState,
  patch: ProductsListPatch = {},
): URLSearchParams {
  const next: ProductsListState = {
    q:
      patch.q === null
        ? ''
        : patch.q !== undefined
          ? patch.q.trim()
          : current.q,
    brand:
      patch.brand === null
        ? ''
        : patch.brand !== undefined
          ? patch.brand.trim()
          : current.brand,
    category:
      patch.category === null
        ? ''
        : patch.category !== undefined
          ? patch.category.trim()
          : current.category,
    sort:
      patch.sort === null
        ? PRODUCTS_LIST_DEFAULT_SORT
        : patch.sort !== undefined
          ? patch.sort
          : current.sort,
    page:
      patch.page === null
        ? 1
        : patch.page !== undefined
          ? Math.max(1, Math.floor(patch.page) || 1)
          : current.page,
    pageSize:
      patch.pageSize === null
        ? PRODUCTS_DEFAULT_PAGE_SIZE
        : patch.pageSize !== undefined
          ? Math.max(1, Math.floor(patch.pageSize) || PRODUCTS_DEFAULT_PAGE_SIZE)
          : current.pageSize,
  }

  const sp = new URLSearchParams()

  if (next.q) sp.set('q', next.q)
  if (next.brand) sp.set('brand', next.brand)
  if (next.category) sp.set('category', next.category)
  if (next.sort !== PRODUCTS_LIST_DEFAULT_SORT) sp.set('sort', next.sort)
  if (next.page > 1) sp.set('page', String(next.page))
  if (next.pageSize !== PRODUCTS_DEFAULT_PAGE_SIZE) {
    sp.set('pageSize', String(next.pageSize))
  }

  return sp
}

export function buildProductsListHref(
  current: ProductsListState,
  patch: ProductsListPatch = {},
  pathname: string = PRODUCTS_LIST_PATH,
): string {
  const qs = buildProductsListSearchParams(current, patch).toString()
  return qs ? `${pathname}?${qs}` : pathname
}

/** URL exacta del listado actual (pathname + query string crudo). */
export function buildProductsListReturnUrl(
  searchParams: URLSearchParams | string,
  pathname: string = PRODUCTS_LIST_PATH,
): string {
  const qs =
    typeof searchParams === 'string'
      ? searchParams.replace(/^\?/, '')
      : searchParams.toString()
  return qs ? `${pathname}?${qs}` : pathname
}

const PRODUCTS_LIST_RETURN_QUERY_KEYS = new Set([
  'q',
  'brand',
  'category',
  'sort',
  'page',
  'pageSize',
])

/**
 * Valida un `from` decodificado: solo rutas internas `/products` o `/products?...`.
 * Rechaza URLs externas, protocol-relative y paths fuera del listado.
 */
export function isValidProductsListReturnUrl(url: string): boolean {
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

  if (parsed.pathname !== PRODUCTS_LIST_PATH) return false

  for (const key of parsed.searchParams.keys()) {
    if (!PRODUCTS_LIST_RETURN_QUERY_KEYS.has(key)) return false
  }

  return true
}

/** Decodifica `from` con un nivel; rechaza valores inválidos. */
export function parseProductsListReturnUrl(
  fromParam: string | null | undefined,
): string | null {
  if (fromParam == null || fromParam === '') return null
  let decoded: string
  try {
    decoded = decodeURIComponent(fromParam)
  } catch {
    return null
  }
  return isValidProductsListReturnUrl(decoded) ? decoded : null
}

/** Destino del botón «Volver al catálogo»: `from` válido o fallback. */
export function resolveProductsListBackHref(
  fromParam: string | null | undefined,
): string {
  return parseProductsListReturnUrl(fromParam) ?? PRODUCTS_LIST_PATH
}

/** Href al detalle preservando el listado de origen en `from`. */
export function buildProductDetailHref(
  productId: number,
  returnUrl: string,
): string {
  const safeReturn = isValidProductsListReturnUrl(returnUrl)
    ? returnUrl
    : PRODUCTS_LIST_PATH
  const from = encodeURIComponent(safeReturn)
  return `/products/${productId}?from=${from}`
}

/**
 * @deprecated Preferir `from` en la URL del detalle (`resolveProductsListBackHref`).
 * ¿Es seguro usar history.back() hacia el listado?
 * Next.js App Router guarda `idx` en history.state en navegaciones client-side.
 */
export function canSafelyBackToProductsList(
  historyState: unknown = typeof window !== 'undefined'
    ? window.history.state
    : null,
): boolean {
  if (!historyState || typeof historyState !== 'object') return false
  const idx = (historyState as { idx?: unknown }).idx
  return typeof idx === 'number' && idx > 0
}
