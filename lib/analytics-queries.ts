/**
 * Queries lean compartidas para analytics de backoffice.
 * No cambia lógica de margen: solo proyecta campos mínimos.
 */
import type { PrismaClient } from '@prisma/client'
import { withPerf } from '@/lib/perf'

/** Select mínimo para `computeSaleMarginForSale`. */
export const saleMarginSelect = {
  exchangeRateARS: true,
  totalARS: true,
  totalWithDiscount: true,
  items: {
    select: {
      qty: true,
      product: {
        select: { cost: true, costCurrency: true },
      },
    },
  },
} as const

/** Select para analytics de productos (snapshots + costo; brand/category aparte). */
export const saleProductAnalyticsSelect = {
  exchangeRateARS: true,
  totalARS: true,
  totalWithDiscount: true,
  items: {
    select: {
      productId: true,
      sku: true,
      title: true,
      total: true,
      qty: true,
      product: {
        select: { cost: true, costCurrency: true },
      },
    },
  },
} as const

/** Select para tabla de analytics de ventas (margen + columnas UI). */
export const saleAnalyticsTableSelect = {
  id: true,
  saleNumber: true,
  issuedAt: true,
  customerCompany: true,
  customerName: true,
  exchangeRateARS: true,
  totalARS: true,
  totalWithDiscount: true,
  customer: {
    select: {
      company: true,
      name: true,
    },
  },
  items: {
    select: {
      qty: true,
      product: {
        select: {
          cost: true,
          costCurrency: true,
        },
      },
    },
  },
} as const

type DateRange = { gte: Date; lte: Date }

export function confirmedSalesWhere(issuedAt: DateRange) {
  return {
    status: 'CONFIRMED' as const,
    issuedAt,
  }
}

export async function fetchSalesForPeriodMargin(
  prisma: PrismaClient,
  issuedAt: DateRange,
) {
  return withPerf(
    'analytics.period.sales',
    () =>
      prisma.sale.findMany({
        where: confirmedSalesWhere(issuedAt),
        select: saleMarginSelect,
      }),
    (rows) => rows.length,
  )
}

export async function fetchSalesForProductsAnalytics(
  prisma: PrismaClient,
  issuedAt: DateRange,
) {
  return withPerf(
    'analytics.products.sales',
    () =>
      prisma.sale.findMany({
        where: confirmedSalesWhere(issuedAt),
        select: saleProductAnalyticsSelect,
      }),
    (rows) => rows.length,
  )
}

export async function fetchSalesForSalesAnalytics(
  prisma: PrismaClient,
  issuedAt: DateRange,
) {
  return withPerf(
    'analytics.sales.sales',
    () =>
      prisma.sale.findMany({
        where: confirmedSalesWhere(issuedAt),
        orderBy: { issuedAt: 'desc' },
        select: saleAnalyticsTableSelect,
      }),
    (rows) => rows.length,
  )
}

export async function fetchProductBrandCategoryMeta(
  prisma: PrismaClient,
  productIds: number[],
) {
  if (productIds.length === 0) {
    return new Map<
      number,
      { brandName: string | null; categoryName: string | null }
    >()
  }

  const rows = await withPerf(
    'analytics.products.meta',
    () =>
      prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
          id: true,
          brand: { select: { name: true } },
          category: { select: { name: true } },
        },
      }),
    (r) => r.length,
  )

  return new Map(
    rows.map((p) => [
      p.id,
      {
        brandName: p.brand?.name ?? null,
        categoryName: p.category?.name ?? null,
      },
    ]),
  )
}

/**
 * Métricas de cobranza del mes vía aggregate/count (mismo criterio que el filtro JS previo).
 */
export async function fetchPeriodReceivableMetrics(
  prisma: PrismaClient,
  startOfMonth: Date,
  endOfMonth: Date,
  today: Date,
) {
  return withPerf('analytics.period.receivables', async () => {
    const openStatuses = ['PENDING', 'PARTIAL'] as const
    const openInMonth = {
      dueDate: { gte: startOfMonth, lte: endOfMonth },
      status: { in: [...openStatuses] },
      balance: { gt: 0 },
    }

    const [projectedAgg, openCount, overdueCount] = await Promise.all([
      prisma.receivableInstallment.aggregate({
        where: openInMonth,
        _sum: { balance: true },
      }),
      prisma.receivableInstallment.count({ where: openInMonth }),
      prisma.receivableInstallment.count({
        where: {
          dueDate: { gte: startOfMonth, lt: today },
          status: { in: [...openStatuses] },
          balance: { gt: 0 },
        },
      }),
    ])

    return {
      projectedCollectionsMonth: projectedAgg._sum.balance ?? 0,
      openInstallmentsCount: openCount,
      overdueInstallmentsCount: overdueCount,
    }
  })
}
