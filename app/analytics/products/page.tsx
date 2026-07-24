import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { EmptyState } from '@/components/ui/EmptyState'

export const revalidate = 120
export const runtime = 'nodejs'

type ProductAggRow = {
  productId: number
  sku: string
  title: string
  brandName: string | null
  categoryName: string | null
  qty: number
  revenueARS: number
  costARS: number
  grossMarginARS: number
  grossMarginPct: number
  hasMissingCosts: boolean
}

const ANALYTICS_MONTHS = 12

export default async function ProductsAnalyticsPage() {
  const [{ prisma }, { getFinancialSettings }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/financial-settings'),
  ])

  const issuedTo = new Date()
  const issuedFrom = new Date(issuedTo)
  issuedFrom.setMonth(issuedFrom.getMonth() - ANALYTICS_MONTHS)

  const [settings, sales] = await Promise.all([
    getFinancialSettings(),
    prisma.sale.findMany({
      where: {
        status: 'CONFIRMED',
        issuedAt: {
          gte: issuedFrom,
          lte: issuedTo,
        },
      },
      orderBy: { issuedAt: 'desc' },
      select: {
        exchangeRateARS: true,
        totalARS: true,
        totalWithDiscount: true,
        items: {
          orderBy: { sortOrder: 'asc' },
          select: {
            productId: true,
            sku: true,
            title: true,
            total: true,
            qty: true,
            product: {
              select: {
                cost: true,
                costCurrency: true,
                brand: { select: { name: true } },
                category: { select: { name: true } },
              },
            },
          },
        },
      },
    }),
  ])

  const productMap = new Map<number, ProductAggRow>()

  for (const sale of sales) {
    const rate =
      sale.exchangeRateARS && sale.exchangeRateARS > 0
        ? sale.exchangeRateARS
        : settings.usdArsRate

    const saleIncomeARS =
      sale.totalARS ??
      (rate && rate > 0
        ? sale.totalWithDiscount * rate
        : sale.totalWithDiscount)

    const saleItemsTotal = sale.items.reduce(
      (acc, i) => acc + i.total,
      0
    )

    for (const item of sale.items) {
      if (!item.productId || !item.product) continue

      const existing = productMap.get(item.productId)

      const itemShare =
        saleItemsTotal > 0 ? item.total / saleItemsTotal : 0
      const lineRevenueARS = saleIncomeARS * itemShare

      let unitCostARS = 0
      let missingCost = false

      if (item.product.cost != null) {
        const currency = item.product.costCurrency || 'USD'
        if (currency === 'ARS') {
          unitCostARS = item.product.cost
        } else {
          const r = rate
          if (r && r > 0) {
            unitCostARS = item.product.cost * r
          } else {
            missingCost = true
          }
        }
      } else {
        missingCost = true
      }

      const lineCostARS = missingCost ? 0 : unitCostARS * item.qty

      if (!existing) {
        productMap.set(item.productId, {
          productId: item.productId,
          sku: item.sku,
          title: item.title,
          brandName: item.product.brand?.name ?? null,
          categoryName: item.product.category?.name ?? null,
          qty: item.qty,
          revenueARS: lineRevenueARS,
          costARS: lineCostARS,
          grossMarginARS: lineRevenueARS - lineCostARS,
          grossMarginPct:
            lineRevenueARS > 0
              ? ((lineRevenueARS - lineCostARS) / lineRevenueARS) * 100
              : 0,
          hasMissingCosts: missingCost,
        })
      } else {
        const newRevenue = existing.revenueARS + lineRevenueARS
        const newCost = existing.costARS + lineCostARS
        const newGross = newRevenue - newCost
        productMap.set(item.productId, {
          ...existing,
          qty: existing.qty + item.qty,
          revenueARS: newRevenue,
          costARS: newCost,
          grossMarginARS: newGross,
          grossMarginPct:
            newRevenue > 0 ? (newGross / newRevenue) * 100 : 0,
          hasMissingCosts: existing.hasMissingCosts || missingCost,
        })
      }
    }
  }

  const rows = Array.from(productMap.values()).sort(
    (a, b) => b.revenueARS - a.revenueARS
  )

  const totalRevenue = rows.reduce(
    (acc, r) => acc + r.revenueARS,
    0
  )
  const totalCost = rows.reduce((acc, r) => acc + r.costARS, 0)
  const totalGrossMargin = rows.reduce(
    (acc, r) => acc + r.grossMarginARS,
    0
  )

  const anyMissingCosts = rows.some((r) => r.hasMissingCosts)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics de productos"
        description="Análisis agregado de ingresos y margen estimado por producto en ARS."
      />

      <SectionCard
        title="Resumen de catálogo vendido"
        description="Totales calculados a partir de las ventas confirmadas registradas."
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Sin ventas asociadas a productos"
            description="Cuando registres ventas confirmadas con productos vinculados vas a ver acá el resumen por producto."
          />
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ingreso total ARS
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalRevenue)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Costo estimado total ARS
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalCost)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Margen bruto estimado ARS
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalGrossMargin)}
              </dd>
            </div>
          </dl>
        )}
        {anyMissingCosts && (
          <p className="mt-3 text-xs text-amber-700">
            Algunos productos no tienen costo cargado o no cuentan con un tipo de cambio válido; sus márgenes pueden
            estar subestimados.
          </p>
        )}
      </SectionCard>

      {rows.length > 0 && (
        <SectionCard
          title="Detalle por producto"
          description="Cada producto con su cantidad vendida, ingreso estimado, costo y margen bruto."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Marca / Categoría
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    SKU
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Cantidad vendida
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Ingreso total ARS
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Costo estimado ARS
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Margen bruto ARS
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Margen bruto %
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Advertencias
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((row) => {
                  const isLow = row.grossMarginPct < 10
                  const isNegative = row.grossMarginARS < 0

                  return (
                    <tr key={row.productId} className="hover:bg-gray-50">
                      <td className="px-4 py-2">
                        <Link
                          href={`/products/${row.productId}`}
                          className="text-ifedel-primary hover:underline"
                        >
                          {row.title}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-700">
                        {row.brandName || '-'}{' '}
                        {row.categoryName ? `• ${row.categoryName}` : ''}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-gray-500">
                        {row.sku}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {fmtNumberAR(row.qty)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {fmtMoneyARS(row.revenueARS)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {fmtMoneyARS(row.costARS)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <span
                          className={
                            isNegative
                              ? 'font-semibold text-red-700'
                              : isLow
                              ? 'font-semibold text-amber-700'
                              : 'font-semibold text-gray-900'
                          }
                        >
                          {fmtMoneyARS(row.grossMarginARS)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {`${fmtNumberAR(row.grossMarginPct)}%`}
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {row.hasMissingCosts ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            Falta costo en una o más compras vinculadas
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  )
}


