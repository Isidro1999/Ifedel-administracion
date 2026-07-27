/**
 * GET /api/products
 *
 * API INTERNA — requiere sesión APPROVED.
 * Nunca pública. Datos sensibles (cost, prices) solo para usuarios autenticados;
 * `cost`/`costCurrency` solo ADMIN.
 * Catálogo público: `/api/catalog/*`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { withPerf } from '@/lib/perf'
import { serializeProductsForApi } from '@/lib/product-api'
import {
  privateApiHeaders,
  requireApprovedSession,
} from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/** Mismo criterio que JS: sin precio aplicable → último en asc, primero en desc. */
const NO_PRICE_ASC_SENTINEL = 1.7976931348623157e308

function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

function buildProductListWhereSql(
  q: string,
  brand: string,
  category: string,
  priceList: string,
  currency: string,
): Prisma.Sql[] {
  const parts: Prisma.Sql[] = [Prisma.sql`p."isActive" = true`]

  if (q.trim()) {
    const pat = `%${escapeLikePattern(q)}%`
    parts.push(
      Prisma.sql`(p."title" LIKE ${pat} ESCAPE '\\' OR p."sku" LIKE ${pat} ESCAPE '\\')`,
    )
  }

  if (brand) {
    const pat = `%${escapeLikePattern(brand)}%`
    parts.push(
      Prisma.sql`(br."slug" = ${brand} OR br."name" LIKE ${pat} ESCAPE '\\')`,
    )
  }

  if (category) {
    const pat = `%${escapeLikePattern(category)}%`
    parts.push(
      Prisma.sql`(ca."slug" = ${category} OR ca."name" LIKE ${pat} ESCAPE '\\')`,
    )
  }

  if (priceList || currency) {
    const ppConds: Prisma.Sql[] = [Prisma.sql`pp0."productId" = p."id"`]
    if (priceList) ppConds.push(Prisma.sql`pp0."priceList" = ${priceList}`)
    if (currency) ppConds.push(Prisma.sql`pp0."currency" = ${currency}`)
    parts.push(
      Prisma.sql`EXISTS (SELECT 1 FROM "product_prices" pp0 WHERE ${Prisma.join(ppConds, ' AND ')})`,
    )
  }

  return parts
}

function buildLatestPriceCteWhere(
  priceList: string,
  currency: string,
): Prisma.Sql {
  const ppConds: Prisma.Sql[] = []
  if (priceList) ppConds.push(Prisma.sql`pp."priceList" = ${priceList}`)
  if (currency) ppConds.push(Prisma.sql`pp."currency" = ${currency}`)
  if (ppConds.length === 0) return Prisma.empty
  return Prisma.sql`AND ${Prisma.join(ppConds, ' AND ')}`
}

function listProductSelect(priceList: string, currency: string, includeCost: boolean) {
  return {
    id: true,
    sku: true,
    title: true,
    short: true,
    description: true,
    isActive: true,
    isFeatured: true,
    slug: true,
    catalogVisible: true,
    publicTitle: true,
    publicShortDescription: true,
    publicDescription: true,
    catalogSort: true,
    showPrice: true,
    catalogPriceList: true,
    brandId: true,
    categoryId: true,
    createdAt: true,
    updatedAt: true,
    ...(includeCost
      ? { cost: true, costCurrency: true }
      : {}),
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
        sortOrder: true,
      },
    },
    prices: {
      where: {
        ...(priceList && { priceList }),
        ...(currency && { currency }),
      },
      orderBy: { createdAt: 'desc' as const },
      take: 1,
      select: {
        id: true,
        priceList: true,
        currency: true,
        netPrice: true,
        taxRate: true,
        validFrom: true,
        validTo: true,
        createdAt: true,
      },
    },
  } satisfies Prisma.ProductSelect
}

export async function GET(request: NextRequest) {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  const includeCost = gate.role === 'ADMIN'

  const { prisma } = await import('@/lib/prisma')
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const brand = searchParams.get('brand') || ''
    const category = searchParams.get('category') || ''
    const priceList = searchParams.get('priceList') || ''
    const currency = searchParams.get('currency') || ''
    const sort = searchParams.get('sort') || 'name_asc'
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '12', 10)

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    }

    if (q) {
      where.OR = [{ title: { contains: q } }, { sku: { contains: q } }]
    }

    if (brand) {
      where.brand = {
        OR: [{ slug: brand }, { name: { contains: brand } }],
      }
    }

    if (category) {
      where.category = {
        OR: [{ slug: category }, { name: { contains: category } }],
      }
    }

    if (priceList || currency) {
      where.prices = {
        some: {
          ...(priceList && { priceList }),
          ...(currency && { currency }),
        },
      }
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { title: 'asc' }
    const needsPriceSort = sort === 'price_asc' || sort === 'price_desc'
    switch (sort) {
      case 'name_desc':
        orderBy = { title: 'desc' }
        break
      case 'name_asc':
      default:
        orderBy = { title: 'asc' }
        break
    }

    const total = await withPerf(
      'api.products.count',
      () => prisma.product.count({ where }),
      (n) => n,
    )

    const safePage = Number.isFinite(page) && page > 0 ? page : 1
    const safePageSize =
      Number.isFinite(pageSize) && pageSize > 0 ? pageSize : 12
    const skip = (safePage - 1) * safePageSize

    const productSelect = listProductSelect(priceList, currency, includeCost)

    type ListRow = Prisma.ProductGetPayload<{ select: typeof productSelect }>
    let products: ListRow[]

    if (needsPriceSort) {
      products = await withPerf(
        'api.products.list',
        async () => {
          const whereParts = buildProductListWhereSql(
            q,
            brand,
            category,
            priceList,
            currency,
          )
          const ctePriceFilter = buildLatestPriceCteWhere(priceList, currency)

          const orderSql =
            sort === 'price_asc'
              ? Prisma.sql`ORDER BY COALESCE(lp."netPrice", ${NO_PRICE_ASC_SENTINEL}) ASC, p."id" ASC`
              : Prisma.sql`ORDER BY lp."netPrice" DESC NULLS FIRST, p."id" DESC`

          const idRows = await prisma.$queryRaw<{ id: number }[]>(Prisma.sql`
            WITH latest_price AS (
              SELECT DISTINCT ON (pp."productId")
                pp."productId",
                pp."netPrice"
              FROM "product_prices" pp
              WHERE 1 = 1
                ${ctePriceFilter}
              ORDER BY pp."productId", pp."createdAt" DESC
            )
            SELECT p."id"
            FROM "products" p
            INNER JOIN "brands" br ON br."id" = p."brandId"
            INNER JOIN "categories" ca ON ca."id" = p."categoryId"
            LEFT JOIN latest_price lp ON lp."productId" = p."id"
            WHERE ${Prisma.join(whereParts, ' AND ')}
            ${orderSql}
            LIMIT ${safePageSize} OFFSET ${skip}
          `)

          const orderedIds = idRows.map((r) => r.id)
          if (orderedIds.length === 0) return []

          const fetched = await prisma.product.findMany({
            where: { id: { in: orderedIds } },
            select: productSelect,
          })
          const byId = new Map(fetched.map((p) => [p.id, p]))
          return orderedIds
            .map((id) => byId.get(id))
            .filter((p): p is NonNullable<typeof p> => p != null)
        },
        (rows) => rows.length,
      )
    } else {
      products = await withPerf(
        'api.products.list',
        () =>
          prisma.product.findMany({
            where,
            select: productSelect,
            orderBy,
            skip,
            take: safePageSize,
          }),
        (rows) => rows.length,
      )
    }

    const facets = await withPerf(
      'api.products.facets',
      async () => {
        const [brandFacets, categoryFacets] = await Promise.all([
          prisma.brand.findMany({
            select: {
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      isActive: true,
                      ...(q && {
                        OR: [
                          { title: { contains: q } },
                          { sku: { contains: q } },
                        ],
                      }),
                    },
                  },
                },
              },
            },
          }),
          prisma.category.findMany({
            select: {
              name: true,
              _count: {
                select: {
                  products: {
                    where: {
                      isActive: true,
                      ...(q && {
                        OR: [
                          { title: { contains: q } },
                          { sku: { contains: q } },
                        ],
                      }),
                    },
                  },
                },
              },
            },
          }),
        ])

        return {
          brands: brandFacets
            .filter((b) => b._count.products > 0)
            .map((b) => ({ name: b.name, count: b._count.products })),
          categories: categoryFacets
            .filter((c) => c._count.products > 0)
            .map((c) => ({ name: c.name, count: c._count.products })),
        }
      },
      (f) => f.brands.length + f.categories.length,
    )

    return NextResponse.json(
      {
        items: serializeProductsForApi(products, { includeCost }),
        pagination: {
          page: safePage,
          pageSize: safePageSize,
          total,
          totalPages: Math.ceil(total / safePageSize),
        },
        facets,
      },
      { headers: privateApiHeaders() },
    )
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
