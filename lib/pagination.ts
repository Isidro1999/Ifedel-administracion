/**
 * Paginación server-side para listados del backoffice.
 * Conserva filtros vía query string; no asume búsqueda avanzada.
 */

export const DEFAULT_PAGE = 1
export const DEFAULT_PAGE_SIZE = 25
export const MAX_PAGE_SIZE = 100

/** Default usado por /api/products (UI de catálogo interno). */
export const PRODUCTS_DEFAULT_PAGE_SIZE = 12

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n <= 0) return fallback
  return n
}

export type PaginationSearchParams = {
  page?: string | string[]
  pageSize?: string | string[]
  [key: string]: string | string[] | undefined
}

export type ParsedPagination = {
  page: number
  pageSize: number
}

/**
 * Valida page / pageSize desde searchParams o query string.
 * page inválido → 1; pageSize inválido → default; pageSize alto → MAX_PAGE_SIZE.
 */
export function parsePaginationParams(
  searchParams?: PaginationSearchParams | URLSearchParams | null,
  options?: { defaultPageSize?: number; maxPageSize?: number },
): ParsedPagination {
  const defaultPageSize = options?.defaultPageSize ?? DEFAULT_PAGE_SIZE
  const maxPageSize = options?.maxPageSize ?? MAX_PAGE_SIZE

  let pageRaw: string | undefined
  let pageSizeRaw: string | undefined

  if (searchParams instanceof URLSearchParams) {
    pageRaw = searchParams.get('page') ?? undefined
    pageSizeRaw = searchParams.get('pageSize') ?? undefined
  } else if (searchParams) {
    pageRaw = firstParam(searchParams.page)
    pageSizeRaw = firstParam(searchParams.pageSize)
  }

  const page = parsePositiveInt(pageRaw, DEFAULT_PAGE)
  const pageSize = Math.min(
    parsePositiveInt(pageSizeRaw, defaultPageSize),
    maxPageSize,
  )

  return { page, pageSize }
}

export type PaginationResult = {
  page: number
  pageSize: number
  total: number
  totalPages: number
  skip: number
  take: number
}

/** Ajusta page si queda fuera de rango tras conocer el total. */
export function resolvePagination(
  page: number,
  pageSize: number,
  total: number,
): PaginationResult {
  const safeSize = Math.min(
    Math.max(pageSize > 0 ? pageSize : DEFAULT_PAGE_SIZE, 1),
    MAX_PAGE_SIZE,
  )
  const totalPages = total > 0 ? Math.ceil(total / safeSize) : 0
  const safePage =
    totalPages === 0
      ? DEFAULT_PAGE
      : Math.min(Math.max(page > 0 ? page : DEFAULT_PAGE, 1), totalPages)

  return {
    page: safePage,
    pageSize: safeSize,
    total,
    totalPages,
    skip: (safePage - 1) * safeSize,
    take: safeSize,
  }
}

/**
 * Arma href conservando query params existentes y seteando `page`.
 * Omite page=1 para URLs más limpias.
 */
export function buildPageHref(
  pathname: string,
  current: Record<string, string | string[] | undefined> | URLSearchParams,
  page: number,
): string {
  const sp =
    current instanceof URLSearchParams
      ? new URLSearchParams(current.toString())
      : new URLSearchParams()

  if (!(current instanceof URLSearchParams)) {
    for (const [key, value] of Object.entries(current)) {
      if (key === 'page') continue
      const v = firstParam(value)
      if (v != null && v !== '') sp.set(key, v)
    }
  } else {
    sp.delete('page')
  }

  if (page > 1) sp.set('page', String(page))
  else sp.delete('page')

  const qs = sp.toString()
  return qs ? `${pathname}?${qs}` : pathname
}
