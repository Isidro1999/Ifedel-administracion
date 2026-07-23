/**
 * Tipos y acceso al catálogo público.
 *
 * - Server Components: usan Prisma vía `catalog-queries` (sin HTTP a sí mismos).
 * - Cliente (browser): fetch relativo a `/api/catalog/...`.
 *
 * No usa AUTH_URL. No usa `/api/products`.
 */

export type CatalogBrand = { id: number; name: string; slug: string; count?: number }
export type CatalogCategory = { id: number; name: string; slug: string; count?: number }

export type CatalogPrice = {
  currency: string
  netPrice: number
  taxRate: number
} | null

export type CatalogPrimaryImage = {
  id: number
  url: string
  isPrimary: boolean
  sortOrder: number
} | null

export type CatalogProductListItem = {
  id: number
  slug: string
  sku: string
  title: string
  shortDescription: string | null
  brand: CatalogBrand | null
  category: CatalogCategory | null
  primaryImage: CatalogPrimaryImage
  isFeatured: boolean
  catalogSort: number
  showPrice: boolean
  price: CatalogPrice
  priceLabel: string
}

export type CatalogProductDetail = CatalogProductListItem & {
  description: string | null
  images: Array<{
    id: number
    url: string
    isPrimary: boolean
    sortOrder: number
  }>
  specs: Array<{
    id: number
    label: string
    value: string
    sortOrder: number
  }>
  files: Array<{
    id: number
    type: string
    url: string
  }>
}

export type CatalogProductsResponse = {
  items: CatalogProductListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

/** Prefijo de rutas UI del catálogo (reexport). Preferí catalogPath(). */
export { CATALOG_BASE, CATALOG_PREFIX, catalogPath } from '@/lib/catalog-paths'

function isServer(): boolean {
  return typeof window === 'undefined'
}

async function catalogFetch(pathWithQuery: string): Promise<Response> {
  // Solo browser: rutas relativas (mismo origen que la UI).
  const res = await fetch(pathWithQuery, {
    cache: 'no-store',
    headers: { Accept: 'application/json' },
  })

  if (!res.ok) {
    let bodyPreview = ''
    try {
      bodyPreview = (await res.clone().text()).slice(0, 200)
    } catch {
      /* ignore */
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog-client] fetch failed', {
        path: pathWithQuery,
        status: res.status,
        statusText: res.statusText,
        bodyPreview,
      })
    }
  }

  return res
}

function assertProductsResponse(data: unknown): CatalogProductsResponse {
  if (!data || typeof data !== 'object') {
    throw new Error('Respuesta inválida del catálogo')
  }
  const obj = data as Record<string, unknown>
  if (!Array.isArray(obj.items)) {
    throw new Error('Respuesta del catálogo sin items[]')
  }
  const pagination = (obj.pagination ?? {
    page: 1,
    pageSize: obj.items.length,
    total: obj.items.length,
    totalPages: 1,
  }) as CatalogProductsResponse['pagination']

  return {
    items: obj.items as CatalogProductListItem[],
    pagination,
  }
}

export async function fetchCatalogProducts(
  params: Record<string, string | undefined> = {},
): Promise<CatalogProductsResponse> {
  if (isServer()) {
    const { queryCatalogProducts } = await import('@/lib/catalog-queries')
    return queryCatalogProducts(params)
  }

  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') sp.set(k, v)
  }
  const qs = sp.toString()
  const res = await catalogFetch(`/api/catalog/products${qs ? `?${qs}` : ''}`)
  if (!res.ok) {
    throw new Error(`No se pudo cargar el catálogo de productos (${res.status})`)
  }
  return assertProductsResponse(await res.json())
}

export async function fetchCatalogProduct(
  slug: string,
): Promise<CatalogProductDetail | null> {
  if (isServer()) {
    const { queryCatalogProductBySlug } = await import('@/lib/catalog-queries')
    return queryCatalogProductBySlug(slug)
  }

  const res = await catalogFetch(
    `/api/catalog/products/${encodeURIComponent(slug)}`,
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`No se pudo cargar el producto (${res.status})`)
  return res.json()
}

export async function fetchCatalogCategories(): Promise<CatalogCategory[]> {
  if (isServer()) {
    const { queryCatalogCategories } = await import('@/lib/catalog-queries')
    return queryCatalogCategories()
  }

  const res = await catalogFetch('/api/catalog/categories')
  if (!res.ok) {
    throw new Error(`No se pudieron cargar las categorías (${res.status})`)
  }
  const data = await res.json()
  return Array.isArray(data?.items) ? data.items : []
}

export async function fetchCatalogBrands(): Promise<CatalogBrand[]> {
  if (isServer()) {
    const { queryCatalogBrands } = await import('@/lib/catalog-queries')
    return queryCatalogBrands()
  }

  const res = await catalogFetch('/api/catalog/brands')
  if (!res.ok) throw new Error(`No se pudieron cargar las marcas (${res.status})`)
  const data = await res.json()
  return Array.isArray(data?.items) ? data.items : []
}
