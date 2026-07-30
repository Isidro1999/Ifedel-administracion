/**
 * Listado admin de productos para publicación en catálogo online.
 * Select mínimo: sin cost, prices, specs, files ni proveedores.
 */

import { Prisma } from '@prisma/client'
import {
  DEFAULT_PAGE_SIZE,
  parsePaginationParams,
  resolvePagination,
  type PaginationSearchParams,
} from '@/lib/pagination'
import { withPerf } from '@/lib/perf'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'

export type TriFilter = 'true' | 'false' | 'all'

export type AdminCatalogFilters = {
  q: string
  brand: string
  category: string
  /** Publicado en catálogo (catalogVisible). Default: false */
  published: TriFilter
  /** Tiene al menos una imagen. Default: true */
  hasImage: TriFilter
  /** Producto activo. Default: true */
  isActive: TriFilter
  /** Destacado. Default: all */
  featured: TriFilter
}

export const ADMIN_CATALOG_DEFAULT_FILTERS: AdminCatalogFilters = {
  q: '',
  brand: '',
  category: '',
  published: 'false',
  hasImage: 'true',
  isActive: 'true',
  featured: 'all',
}

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parseTriFilter(
  raw: string | undefined,
  fallback: TriFilter,
): TriFilter {
  if (raw === 'true' || raw === 'false' || raw === 'all') return raw
  return fallback
}

/**
 * Parsea filtros desde searchParams / query string.
 * Si el param está ausente, aplica el default de v1 (no publicados + con imagen + activos).
 */
export function parseAdminCatalogFilters(
  searchParams?: PaginationSearchParams | URLSearchParams | null,
): AdminCatalogFilters {
  const get = (key: string): string | undefined => {
    if (!searchParams) return undefined
    if (searchParams instanceof URLSearchParams) {
      return searchParams.get(key) ?? undefined
    }
    return firstParam(searchParams[key])
  }

  return {
    q: (get('q') ?? '').trim(),
    brand: (get('brand') ?? '').trim(),
    category: (get('category') ?? '').trim(),
    published: parseTriFilter(get('published'), ADMIN_CATALOG_DEFAULT_FILTERS.published),
    hasImage: parseTriFilter(get('hasImage'), ADMIN_CATALOG_DEFAULT_FILTERS.hasImage),
    isActive: parseTriFilter(get('isActive'), ADMIN_CATALOG_DEFAULT_FILTERS.isActive),
    featured: parseTriFilter(get('featured'), ADMIN_CATALOG_DEFAULT_FILTERS.featured),
  }
}

export function buildAdminCatalogWhere(
  filters: AdminCatalogFilters,
): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {}

  if (filters.q) {
    where.OR = [
      { sku: { contains: filters.q } },
      { title: { contains: filters.q } },
      { publicTitle: { contains: filters.q } },
    ]
  }

  if (filters.brand) {
    where.brand = {
      OR: [
        { slug: filters.brand },
        { name: { contains: filters.brand } },
      ],
    }
  }

  if (filters.category) {
    where.category = {
      OR: [
        { slug: filters.category },
        { name: { contains: filters.category } },
      ],
    }
  }

  if (filters.published === 'true') where.catalogVisible = true
  else if (filters.published === 'false') where.catalogVisible = false

  if (filters.hasImage === 'true') where.images = { some: {} }
  else if (filters.hasImage === 'false') where.images = { none: {} }

  if (filters.isActive === 'true') where.isActive = true
  else if (filters.isActive === 'false') where.isActive = false

  if (filters.featured === 'true') where.isFeatured = true
  else if (filters.featured === 'false') where.isFeatured = false

  return where
}

export const adminCatalogListSelect = {
  id: true,
  sku: true,
  title: true,
  isActive: true,
  isFeatured: true,
  slug: true,
  catalogVisible: true,
  publicTitle: true,
  showPrice: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [
      { isPrimary: 'desc' as const },
      { sortOrder: 'asc' as const },
    ],
    take: 1,
    select: {
      id: true,
      url: true,
      isPrimary: true,
    },
  },
  _count: {
    select: { images: true },
  },
} satisfies Prisma.ProductSelect

export type AdminCatalogListRow = Prisma.ProductGetPayload<{
  select: typeof adminCatalogListSelect
}>

export type AdminCatalogListItem = {
  id: number
  sku: string
  title: string
  publicTitle: string | null
  isActive: boolean
  isFeatured: boolean
  slug: string
  catalogVisible: boolean
  showPrice: boolean
  hasImage: boolean
  thumbnailUrl: string | null
  brand: { id: number; name: string; slug: string }
  category: { id: number; name: string; slug: string }
}

export function mapAdminCatalogItem(row: AdminCatalogListRow): AdminCatalogListItem {
  const imageUrl = row.images[0]?.url ?? null
  return {
    id: row.id,
    sku: row.sku,
    title: row.title,
    publicTitle: row.publicTitle,
    isActive: row.isActive,
    isFeatured: row.isFeatured,
    slug: row.slug,
    catalogVisible: row.catalogVisible,
    showPrice: row.showPrice,
    hasImage: row._count.images > 0,
    thumbnailUrl: imageUrl ? getOptimizedImageUrl(imageUrl, 80) : null,
    brand: row.brand,
    category: row.category,
  }
}

export type AdminCatalogFacetOption = {
  slug: string
  name: string
}

export type AdminCatalogListResult = {
  items: AdminCatalogListItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
  filters: AdminCatalogFilters
  facets: {
    brands: AdminCatalogFacetOption[]
    categories: AdminCatalogFacetOption[]
  }
}

export async function listAdminCatalogProducts(
  searchParams?: PaginationSearchParams | URLSearchParams | null,
): Promise<AdminCatalogListResult> {
  const { prisma } = await import('@/lib/prisma')

  const filters = parseAdminCatalogFilters(searchParams)
  const { page: rawPage, pageSize: rawPageSize } = parsePaginationParams(
    searchParams,
    { defaultPageSize: DEFAULT_PAGE_SIZE },
  )
  const where = buildAdminCatalogWhere(filters)

  const [total, facets] = await Promise.all([
    withPerf(
      'admin.catalog.list.count',
      () => prisma.product.count({ where }),
      (n) => n,
    ),
    withPerf('admin.catalog.list.facets', async () => {
      const [brands, categories] = await Promise.all([
        prisma.brand.findMany({
          orderBy: { name: 'asc' },
          select: { slug: true, name: true },
        }),
        prisma.category.findMany({
          orderBy: { name: 'asc' },
          select: { slug: true, name: true },
        }),
      ])
      return { brands, categories }
    }),
  ])

  const { page, pageSize, skip, take, totalPages } = resolvePagination(
    rawPage,
    rawPageSize,
    total,
  )

  const rows = await withPerf(
    'admin.catalog.list',
    () =>
      prisma.product.findMany({
        where,
        select: adminCatalogListSelect,
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      }),
    (r) => r.length,
  )

  return {
    items: rows.map(mapAdminCatalogItem),
    pagination: { page, pageSize, total, totalPages },
    filters,
    facets,
  }
}
