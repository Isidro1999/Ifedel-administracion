/**
 * Capa de datos del catálogo público (Prisma + serializers whitelist).
 * Usada por `/api/catalog/*` y por Server Components (sin self-fetch HTTP).
 * Nunca expone cost, márgenes ni precios internos.
 */

import { unstable_cache } from 'next/cache'
import {
  serializeCatalogProductDetail,
  serializeCatalogProductListItem,
} from '@/lib/catalog-api'
import {
  CATALOG_CACHE_TAGS,
  CATALOG_REVALIDATE_SECONDS,
} from '@/lib/catalog-cache'
import {
  effectiveCatalogPriceList,
  PUBLIC_PRICE_LABEL,
  resolvePublicCatalogPrice,
} from '@/lib/catalog-public-price'
import { getUsdArsRateSettings } from '@/lib/exchange-rate/get-usd-ars-rate'
import { withPerf } from '@/lib/perf'
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProductDetail,
  CatalogProductsResponse,
} from '@/lib/catalog-client'
import type {
  CatalogCategoryNode,
  CatalogCategoryResolved,
} from '@/lib/catalog-category-public'
import {
  buildCatalogCategoryTree,
  buildFlatPublicLeafCategories,
  buildPublicCategoryIndex,
  buildPublicProductCategoryWhere,
  impossibleProductWhere,
  resolveCatalogCategoryFromTree,
  type PublicCategoryIndex,
} from '@/lib/catalog-category-public'

const MAX_PAGE_SIZE = 48
const DEFAULT_PAGE_SIZE = 12

const listItemSelect = {
  id: true,
  sku: true,
  title: true,
  short: true,
  slug: true,
  publicTitle: true,
  publicShortDescription: true,
  catalogSort: true,
  showPrice: true,
  catalogPriceList: true,
  isFeatured: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    take: 1,
    select: {
      id: true,
      url: true,
      isPrimary: true,
      sortOrder: true,
    },
  },
}

const detailSelect = {
  id: true,
  sku: true,
  title: true,
  short: true,
  description: true,
  slug: true,
  publicTitle: true,
  publicShortDescription: true,
  publicDescription: true,
  catalogSort: true,
  showPrice: true,
  catalogPriceList: true,
  isFeatured: true,
  brand: { select: { id: true, name: true, slug: true } },
  category: { select: { id: true, name: true, slug: true } },
  images: {
    orderBy: [{ isPrimary: 'desc' as const }, { sortOrder: 'asc' as const }],
    select: {
      id: true,
      url: true,
      isPrimary: true,
      sortOrder: true,
    },
  },
  specs: {
    orderBy: { sortOrder: 'asc' as const },
    select: {
      id: true,
      label: true,
      value: true,
      sortOrder: true,
    },
  },
  files: {
    orderBy: { createdAt: 'desc' as const },
    select: {
      id: true,
      type: true,
      url: true,
    },
  },
}

const priceSelect = {
  id: true,
  productId: true,
  priceList: true,
  currency: true,
  netPrice: true,
  taxRate: true,
  validFrom: true,
  validTo: true,
  createdAt: true,
}

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

export const CATALOG_PRODUCT_SORTS = [
  'featured',
  'name_asc',
  'name_desc',
] as const

export type CatalogProductSort = (typeof CATALOG_PRODUCT_SORTS)[number]

export type CatalogProductListParams = {
  q?: string
  brand?: string
  /** Slug de subcategoría hoja V1. */
  category?: string
  /** Slug de categoría principal V1 (productos en cualquier hoja hija). */
  categoryRoot?: string
  featured?: string
  sort?: string
  page?: string
  pageSize?: string
}

export class CatalogQueryError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'CatalogQueryError'
    this.status = status
  }
}

function logCatalogError(scope: string, error: unknown) {
  if (process.env.NODE_ENV !== 'development') return
  console.error(scope, error)
}

function normalizeListParams(params: CatalogProductListParams = {}) {
  const q = (params.q || '').trim()
  const brand = (params.brand || '').trim()
  const category = (params.category || '').trim()
  const categoryRoot = (params.categoryRoot || '').trim()
  const featuredRaw = (params.featured || '').trim().toLowerCase()

  if (
    featuredRaw &&
    !['1', 'true', 'yes', '0', 'false', 'no'].includes(featuredRaw)
  ) {
    throw new CatalogQueryError(
      'Parámetro featured inválido (usar true|false)',
      400,
    )
  }

  const featuredOnly =
    featuredRaw === '1' || featuredRaw === 'true' || featuredRaw === 'yes'

  const sortRaw = (params.sort || '').trim().toLowerCase()
  let sort: CatalogProductSort = 'featured'
  if (sortRaw) {
    if (!(CATALOG_PRODUCT_SORTS as readonly string[]).includes(sortRaw)) {
      throw new CatalogQueryError(
        'Parámetro sort inválido (usar featured|name_asc|name_desc)',
        400,
      )
    }
    sort = sortRaw as CatalogProductSort
  }

  const page = parsePositiveInt(params.page, 1)
  const pageSize = Math.min(
    parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE),
    MAX_PAGE_SIZE,
  )

  return { q, brand, category, categoryRoot, featuredOnly, sort, page, pageSize }
}

function catalogProductOrderBy(
  sort: CatalogProductSort,
): Array<Record<string, 'asc' | 'desc'>> {
  switch (sort) {
    case 'name_asc':
      return [{ title: 'asc' }]
    case 'name_desc':
      return [{ title: 'desc' }]
    case 'featured':
    default:
      return [
        { isFeatured: 'desc' },
        { catalogSort: 'asc' },
        { title: 'asc' },
      ]
  }
}

type PriceRow = {
  productId: number
  priceList: string
  currency: string
  netPrice: number
  taxRate: number
  validFrom: Date | null
  validTo: Date | null
  createdAt: Date
}

async function loadPublicPricesForProducts(
  products: Array<{
    id: number
    showPrice: boolean
    catalogPriceList: string | null
  }>,
): Promise<Map<number, PriceRow[]>> {
  const map = new Map<number, PriceRow[]>()
  // showPrice=true → lista efectiva (catalogPriceList ?? "minorista")
  const needPrice = products.filter((p) => p.showPrice)
  if (needPrice.length === 0) return map

  const { prisma } = await import('@/lib/prisma')
  const prices = await prisma.productPrice.findMany({
    where: {
      OR: needPrice.map((p) => ({
        productId: p.id,
        priceList: effectiveCatalogPriceList(p.catalogPriceList),
      })),
    },
    orderBy: { createdAt: 'desc' },
    select: priceSelect,
  })

  for (const pr of prices) {
    const list = map.get(pr.productId) ?? []
    list.push(pr)
    map.set(pr.productId, list)
  }
  return map
}

async function loadPublicProductCountsByCategoryId(): Promise<
  Map<number, number>
> {
  const { prisma } = await import('@/lib/prisma')
  const grouped = await prisma.product.groupBy({
    by: ['categoryId'],
    where: { catalogVisible: true, isActive: true },
    _count: { _all: true },
  })
  return new Map(
    grouped.map((g) => [g.categoryId, g._count._all] as const)
  )
}

async function loadPublicCategoryIndexUncached(): Promise<PublicCategoryIndex> {
  const { prisma } = await import('@/lib/prisma')
  const [categories, countsByCategoryId] = await Promise.all([
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true,
        shortDescription: true,
        imageUrl: true,
        sortOrder: true,
        isActive: true,
        showInHome: true,
      },
    }),
    loadPublicProductCountsByCategoryId(),
  ])
  return buildPublicCategoryIndex({ categories, countsByCategoryId })
}

async function getPublicCategoryIndex(): Promise<PublicCategoryIndex> {
  const cached = unstable_cache(
    () => loadPublicCategoryIndexUncached(),
    ['catalog-category-index'],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.categories],
    }
  )
  return cached()
}

async function getCatalogProductsUncached(
  params: CatalogProductListParams = {},
  usdArsRate: number | null = null,
): Promise<CatalogProductsResponse> {
  const { prisma } = await import('@/lib/prisma')
  const { q, brand, category, categoryRoot, featuredOnly, sort, page, pageSize } =
    normalizeListParams(params)
  const skip = (page - 1) * pageSize

  const where: Record<string, unknown> = {
    catalogVisible: true,
    isActive: true,
    ...(featuredOnly ? { isFeatured: true } : {}),
  }

  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { publicTitle: { contains: q, mode: 'insensitive' } },
      { sku: { contains: q, mode: 'insensitive' } },
      { slug: { contains: q, mode: 'insensitive' } },
    ]
  }

  if (brand) {
    where.brand = { slug: brand }
  }

  if (category || categoryRoot) {
    const index = await getPublicCategoryIndex()
    const categoryWhere = buildPublicProductCategoryWhere(index, {
      category: category || undefined,
      categoryRoot: categoryRoot || undefined,
    })
    if (categoryWhere === null) {
      Object.assign(where, impossibleProductWhere())
    } else {
      Object.assign(where, categoryWhere)
    }
  }

  // Secuencial (no Promise.all): con PgBouncer evita choques de prepared statements.
  const total = await prisma.product.count({ where })
  const products = await prisma.product.findMany({
    where,
    orderBy: catalogProductOrderBy(sort),
    skip,
    take: pageSize,
    select: listItemSelect,
  })

  const priceMap = await loadPublicPricesForProducts(products)
  const serializeOpts = { usdArsRate }

  const items = products.map((p) =>
    serializeCatalogProductListItem(
      {
        ...p,
        brand: p.brand ?? null,
        category: p.category ?? null,
        images: p.images ?? [],
        prices: priceMap.get(p.id) ?? [],
      },
      serializeOpts,
    ),
  )

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 0,
    },
  }
}

async function getCatalogProductBySlugUncached(
  slugRaw: string,
  usdArsRate: number | null = null,
): Promise<CatalogProductDetail | null> {
  const { prisma } = await import('@/lib/prisma')
  const slug = decodeURIComponent(slugRaw || '').trim()
  if (!slug) {
    throw new CatalogQueryError('Slug inválido', 400)
  }

  const product = await prisma.product.findFirst({
    where: {
      slug,
      catalogVisible: true,
      isActive: true,
    },
    select: detailSelect,
  })

  if (!product) return null

  const priceMap = await loadPublicPricesForProducts([product])

  return serializeCatalogProductDetail(
    {
      ...product,
      brand: product.brand ?? null,
      category: product.category ?? null,
      images: product.images ?? [],
      specs: product.specs ?? [],
      files: product.files ?? [],
      prices: priceMap.get(product.id) ?? [],
    },
    { usdArsRate },
  ) as CatalogProductDetail
}

async function getCatalogCategoriesUncached(): Promise<CatalogCategory[]> {
  const index = await loadPublicCategoryIndexUncached()
  return buildFlatPublicLeafCategories(index)
}

/** Entrada mínima de producto para sitemap (sin precios ni media). */
export type CatalogSitemapProduct = {
  slug: string
  updatedAt: Date
}

async function getCatalogSitemapProductsUncached(): Promise<
  CatalogSitemapProduct[]
> {
  const { prisma } = await import('@/lib/prisma')

  return prisma.product.findMany({
    where: {
      catalogVisible: true,
      isActive: true,
      NOT: { slug: '' },
    },
    select: {
      slug: true,
      updatedAt: true,
    },
    orderBy: [{ catalogSort: 'asc' }, { slug: 'asc' }],
  })
}

/**
 * Slugs de productos públicos para sitemap XML.
 * Select mínimo; misma visibilidad que el catálogo (`catalogVisible` + `isActive`).
 */
export async function getCatalogSitemapProducts(): Promise<
  CatalogSitemapProduct[]
> {
  return withPerf(
    'getCatalogSitemapProducts',
    async () => {
      try {
        const cached = unstable_cache(
          () => getCatalogSitemapProductsUncached(),
          ['catalog-sitemap-products'],
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.products],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.sitemap.products]', error)
        throw error
      }
    },
    (r) => r.length,
  )
}

async function getCatalogBrandsUncached(
  params: { category?: string; categoryRoot?: string } = {},
): Promise<CatalogBrand[]> {
  const { prisma } = await import('@/lib/prisma')
  const categorySlug = (params.category || '').trim()
  const categoryRootSlug = (params.categoryRoot || '').trim()

  const productWhere: Record<string, unknown> = {
    catalogVisible: true,
    isActive: true,
  }

  if (categorySlug || categoryRootSlug) {
    const index = await loadPublicCategoryIndexUncached()
    const categoryWhere = buildPublicProductCategoryWhere(index, {
      category: categorySlug || undefined,
      categoryRoot: categoryRootSlug || undefined,
    })
    if (categoryWhere === null) {
      return []
    }
    Object.assign(productWhere, categoryWhere)
  }

  const grouped = await prisma.product.groupBy({
    by: ['brandId'],
    where: productWhere,
    _count: { _all: true },
  })

  // Sin pastilla “Sin marca”: omitir productos sin brandId.
  const withBrand = grouped.filter(
    (g): g is { brandId: number; _count: { _all: number } } =>
      g.brandId != null,
  )
  if (withBrand.length === 0) return []

  const counts = new Map(
    withBrand.map((g) => [g.brandId, g._count._all] as const),
  )
  const brands = await prisma.brand.findMany({
    where: { id: { in: [...counts.keys()] } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  })

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    count: counts.get(b.id) ?? 0,
  }))
}

function cacheKeyForListParams(params: CatalogProductListParams): string {
  try {
    const n = normalizeListParams(params)
    return JSON.stringify(n)
  } catch {
    return JSON.stringify(params)
  }
}

/** Listado público de productos (con caché Data Cache). */
export async function getCatalogProducts(
  params: CatalogProductListParams = {},
): Promise<CatalogProductsResponse> {
  return withPerf(
    'getCatalogProducts',
    async () => {
      try {
        // TC una vez por request; entra en la cache key para coherencia con invalidación.
        const { usdArsRate } = await getUsdArsRateSettings()
        const rateKey =
          usdArsRate != null && Number.isFinite(usdArsRate)
            ? String(usdArsRate)
            : 'none'
        const key = cacheKeyForListParams(params)
        const cached = unstable_cache(
          () => getCatalogProductsUncached(params, usdArsRate),
          ['catalog-products', key, rateKey],
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.products],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.products]', error)
        throw error
      }
    },
    (r) => r.items.length,
  )
}

/** Detalle público por slug. */
export async function getCatalogProductBySlug(
  slugRaw: string,
): Promise<CatalogProductDetail | null> {
  return withPerf(
    'getCatalogProductBySlug',
    async () => {
      try {
        const slug = decodeURIComponent(slugRaw || '').trim()
        if (!slug) {
          throw new CatalogQueryError('Slug inválido', 400)
        }
        const { usdArsRate } = await getUsdArsRateSettings()
        const rateKey =
          usdArsRate != null && Number.isFinite(usdArsRate)
            ? String(usdArsRate)
            : 'none'
        const cached = unstable_cache(
          () => getCatalogProductBySlugUncached(slug, usdArsRate),
          ['catalog-product', slug, rateKey],
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.product],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.products.slug]', error)
        throw error
      }
    },
    (r) => (r ? 1 : 0),
  )
}

/** Categorías con al menos un producto visible en catálogo (lista plana de hojas V1). */
export async function getCatalogCategories(): Promise<CatalogCategory[]> {
  return withPerf(
    'getCatalogCategories',
    async () => {
      try {
        const cached = unstable_cache(
          () => getCatalogCategoriesUncached(),
          ['catalog-categories-flat'],
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.categories],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.categories]', error)
        throw error
      }
    },
    (r) => r.length,
  )
}

/** Árbol jerárquico V1 para navegación pública (P4A). */
export async function getCatalogCategoryTree(): Promise<CatalogCategoryNode[]> {
  return withPerf(
    'getCatalogCategoryTree',
    async () => {
      try {
        const cached = unstable_cache(
          async () => {
            const index = await loadPublicCategoryIndexUncached()
            return buildCatalogCategoryTree(index)
          },
          ['catalog-categories-tree'],
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.categories],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.categories.tree]', error)
        throw error
      }
    },
    (r) => r.length,
  )
}

/** Resuelve categoría V1 pública por slug (principal o hoja).
 * Reutiliza el mismo árbol cacheado que P4B (`getCatalogCategoryTree`),
 * para que roots visibles por count agregado no dependan de un índice
 * aparte que falle y se traduzca en 404 en P4C.
 */
export async function getCatalogCategoryBySlug(
  slugRaw: string,
): Promise<CatalogCategoryResolved | null> {
  const slug = decodeURIComponent(slugRaw || '').trim()
  if (!slug) {
    throw new CatalogQueryError('Slug inválido', 400)
  }

  return withPerf(
    'getCatalogCategoryBySlug',
    async () => {
      try {
        const tree = await getCatalogCategoryTree()
        return resolveCatalogCategoryFromTree(tree, slug)
      } catch (error) {
        logCatalogError('[catalog.category.slug]', error)
        throw error
      }
    },
    (r) => (r ? 1 : 0),
  )
}

/** Marcas con al menos un producto visible en catálogo (opcionalmente por categoría). */
export async function getCatalogBrands(
  params: { category?: string; categoryRoot?: string } = {},
): Promise<CatalogBrand[]> {
  const categorySlug = (params.category || '').trim()
  const categoryRootSlug = (params.categoryRoot || '').trim()
  const cacheKey =
    categorySlug && categoryRootSlug
      ? ['catalog-brands', categorySlug, categoryRootSlug]
      : categorySlug
        ? ['catalog-brands', 'leaf', categorySlug]
        : categoryRootSlug
          ? ['catalog-brands', 'root', categoryRootSlug]
          : ['catalog-brands']
  return withPerf(
    'getCatalogBrands',
    async () => {
      try {
        const cached = unstable_cache(
          () =>
            getCatalogBrandsUncached({
              category: categorySlug || undefined,
              categoryRoot: categoryRootSlug || undefined,
            }),
          cacheKey,
          {
            revalidate: CATALOG_REVALIDATE_SECONDS,
            tags: [CATALOG_CACHE_TAGS.all, CATALOG_CACHE_TAGS.brands],
          },
        )
        return await cached()
      } catch (error) {
        logCatalogError('[catalog.brands]', error)
        throw error
      }
    },
    (r) => r.length,
  )
}

export type PublicCatalogPriceById = {
  productId: number
  found: boolean
  slug?: string
  price: { currency: 'ARS'; amount: number; includesTax: true; netPrice: number; taxRate: 0 } | null
  priceLabel: string
  showPrice: boolean
}

/**
 * Precios públicos vigentes por IDs (catálogo visible + activo).
 * Sin caché: la lista de consulta necesita TC/listas actuales.
 * No expone USD, costos ni Settings.
 */
export async function getPublicCatalogPricesByProductIds(
  productIds: number[],
): Promise<PublicCatalogPriceById[]> {
  const uniqueIds = [
    ...new Set(productIds.filter((id) => Number.isInteger(id) && id > 0)),
  ]
  if (uniqueIds.length === 0) return []

  const { prisma } = await import('@/lib/prisma')
  const products = await prisma.product.findMany({
    where: {
      id: { in: uniqueIds },
      isActive: true,
      catalogVisible: true,
    },
    select: {
      id: true,
      slug: true,
      showPrice: true,
      catalogPriceList: true,
    },
  })

  const priceMap = await loadPublicPricesForProducts(products)
  const { usdArsRate } = await getUsdArsRateSettings()

  return uniqueIds.map((id) => {
    const product = products.find((row) => row.id === id)
    if (!product) {
      return {
        productId: id,
        found: false,
        price: null,
        priceLabel: PUBLIC_PRICE_LABEL,
        showPrice: false,
      }
    }

    const resolved = resolvePublicCatalogPrice(
      {
        showPrice: product.showPrice,
        catalogPriceList: product.catalogPriceList,
        prices: priceMap.get(id) ?? [],
      },
      usdArsRate,
    )

    return {
      productId: id,
      found: true,
      slug: product.slug,
      price: resolved.price,
      priceLabel: resolved.priceLabel,
      showPrice: resolved.showPrice,
    }
  })
}

/** Aliases legacy (APIs / client). */
export const queryCatalogProducts = getCatalogProducts
export const queryCatalogProductBySlug = getCatalogProductBySlug
export const queryCatalogCategories = getCatalogCategories
export const queryCatalogCategoryTree = getCatalogCategoryTree
export const queryCatalogCategoryBySlug = getCatalogCategoryBySlug
export const queryCatalogBrands = getCatalogBrands
