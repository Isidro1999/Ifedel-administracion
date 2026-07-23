/**
 * Capa de datos del catálogo público (Prisma + serializers whitelist).
 * Usada por `/api/catalog/*` y por Server Components (sin self-fetch HTTP).
 * Nunca expone cost, márgenes ni precios internos.
 */

import {
  serializeCatalogProductDetail,
  serializeCatalogProductListItem,
} from '@/lib/catalog-api'
import type {
  CatalogBrand,
  CatalogCategory,
  CatalogProductDetail,
  CatalogProductsResponse,
} from '@/lib/catalog-client'

const MAX_PAGE_SIZE = 48
const DEFAULT_PAGE_SIZE = 12

function parsePositiveInt(raw: string | undefined, fallback: number): number {
  if (raw == null || raw === '') return fallback
  const n = Number.parseInt(raw, 10)
  if (!Number.isFinite(n) || n < 1) return fallback
  return n
}

export type CatalogProductListParams = {
  q?: string
  brand?: string
  category?: string
  featured?: string
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

export async function queryCatalogProducts(
  params: CatalogProductListParams = {},
): Promise<CatalogProductsResponse> {
  const { prisma } = await import('@/lib/prisma')

  try {
    const q = (params.q || '').trim()
    const brand = (params.brand || '').trim()
    const category = (params.category || '').trim()
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

    const page = parsePositiveInt(params.page, 1)
    const pageSize = Math.min(
      parsePositiveInt(params.pageSize, DEFAULT_PAGE_SIZE),
      MAX_PAGE_SIZE,
    )
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

    if (category) {
      where.category = { slug: category }
    }

    // Secuencial (no Promise.all): con PgBouncer evita choques de prepared statements.
    const total = await prisma.product.count({ where })
    const products = await prisma.product.findMany({
      where,
      orderBy: [
        { isFeatured: 'desc' },
        { catalogSort: 'asc' },
        { title: 'asc' },
      ],
      skip,
      take: pageSize,
      select: {
        id: true,
        sku: true,
        title: true,
        short: true,
        slug: true,
        catalogVisible: true,
        publicTitle: true,
        publicShortDescription: true,
        catalogSort: true,
        showPrice: true,
        catalogPriceList: true,
        isFeatured: true,
        brand: { select: { id: true, name: true, slug: true } },
        category: { select: { id: true, name: true, slug: true } },
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
          select: {
            id: true,
            url: true,
            isPrimary: true,
            sortOrder: true,
          },
        },
        // Solo se lee si showPrice; se filtra abajo. Nunca se serializa el array crudo.
        prices: {
          orderBy: { createdAt: 'desc' },
          select: {
            priceList: true,
            currency: true,
            netPrice: true,
            taxRate: true,
            validFrom: true,
            validTo: true,
            createdAt: true,
          },
        },
      },
    })

    const items = products.map((p) => {
      const listName = p.catalogPriceList?.trim()
      const prices =
        p.showPrice && listName
          ? (p.prices ?? []).filter((pr) => pr.priceList === listName)
          : []
      return serializeCatalogProductListItem({
        ...p,
        brand: p.brand ?? null,
        category: p.category ?? null,
        images: p.images ?? [],
        prices,
      })
    })

    return {
      items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 0,
      },
    }
  } catch (error) {
    logCatalogError('[catalog.products]', error)
    throw error
  }
}

export async function queryCatalogProductBySlug(
  slugRaw: string,
): Promise<CatalogProductDetail | null> {
  const { prisma } = await import('@/lib/prisma')
  const slug = decodeURIComponent(slugRaw || '').trim()
  if (!slug) {
    throw new CatalogQueryError('Slug inválido', 400)
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        slug,
        catalogVisible: true,
        isActive: true,
      },
      select: {
        id: true,
        sku: true,
        title: true,
        short: true,
        description: true,
        slug: true,
        catalogVisible: true,
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
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          select: {
            id: true,
            url: true,
            isPrimary: true,
            sortOrder: true,
          },
        },
        specs: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            label: true,
            value: true,
            sortOrder: true,
          },
        },
        files: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            type: true,
            url: true,
          },
        },
        prices: {
          orderBy: { createdAt: 'desc' },
          select: {
            priceList: true,
            currency: true,
            netPrice: true,
            taxRate: true,
            validFrom: true,
            validTo: true,
            createdAt: true,
          },
        },
      },
    })

    if (!product) return null

    const listName = product.catalogPriceList?.trim()
    const prices =
      product.showPrice && listName
        ? (product.prices ?? []).filter((pr) => pr.priceList === listName)
        : []

    return serializeCatalogProductDetail({
      ...product,
      brand: product.brand ?? null,
      category: product.category ?? null,
      images: product.images ?? [],
      specs: product.specs ?? [],
      files: product.files ?? [],
      prices,
    }) as CatalogProductDetail
  } catch (error) {
    logCatalogError('[catalog.products.slug]', error)
    throw error
  }
}

export async function queryCatalogCategories(): Promise<CatalogCategory[]> {
  const { prisma } = await import('@/lib/prisma')

  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: {
                catalogVisible: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    return categories
      .filter((c) => c._count.products > 0)
      .map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        count: c._count.products,
      }))
  } catch (error) {
    logCatalogError('[catalog.categories]', error)
    throw error
  }
}

export async function queryCatalogBrands(): Promise<CatalogBrand[]> {
  const { prisma } = await import('@/lib/prisma')

  try {
    // Misma forma que categories (findMany + _count filtrado).
    // No usar groupBy: con pooler es más frágil.
    const brands = await prisma.brand.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: {
            products: {
              where: {
                catalogVisible: true,
                isActive: true,
              },
            },
          },
        },
      },
    })

    return brands
      .filter((b) => b._count.products > 0)
      .map((b) => ({
        id: b.id,
        name: b.name,
        slug: b.slug,
        count: b._count.products,
      }))
  } catch (error) {
    logCatalogError('[catalog.brands]', error)
    throw error
  }
}
