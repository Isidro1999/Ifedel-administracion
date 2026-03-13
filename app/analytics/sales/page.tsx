import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { getFinancialSettings } from '@/lib/financial-settings'
import { computeSaleMarginForSale, formatMarginPct } from '@/lib/margin'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function SalesAnalyticsPage() {
  const [settings, sales] = await Promise.all([
    getFinancialSettings(),
    prisma.sale.findMany({
      orderBy: { issuedAt: 'desc' },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
        customer: true,
      },
      where: {
        status: 'CONFIRMED',
      },
    }),
  ])

  const rows = sales.map((sale) => {
    const margin = computeSaleMarginForSale(sale, settings)

    const clientLabel =
      sale.customerCompany ||
      sale.customerName ||
      sale.customer?.company ||
      sale.customer?.name ||
      '-'

    return {
      sale,
      margin,
      clientLabel,
    }
  })

  const totalIncome = rows.reduce(
    (acc, r) => acc + r.margin.incomeARS,
    0
  )
  const totalCost = rows.reduce(
    (acc, r) => acc + r.margin.estimatedCostARS,
    0
  )
  const totalGrossMargin = rows.reduce(
    (acc, r) => acc + r.margin.grossMarginARS,
    0
  )

  const anyMissingCosts = rows.some((r) => r.margin.hasMissingCosts)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Analytics de ventas"
        description="Vista comparativa de ventas confirmadas con margen estimado en ARS."
      />

      <SectionCard
        title="Resumen de márgenes"
        description="Totales estimados sobre las ventas confirmadas cargadas en el sistema."
      >
        {rows.length === 0 ? (
          <EmptyState
            title="Sin ventas confirmadas para analizar"
            description="Cuando registres ventas con estado CONFIRMED vas a ver acá el resumen de márgenes estimados."
          />
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ingreso total estimado
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalIncome)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Costo estimado total
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalCost)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Margen bruto estimado
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalGrossMargin)}
              </dd>
            </div>
          </dl>
        )}
        {anyMissingCosts && (
          <p className="mt-3 text-xs text-amber-700">
            Algunas ventas tienen productos sin costo cargado o sin tipo de cambio válido, por lo que sus márgenes
            pueden estar subestimados.
          </p>
        )}
      </SectionCard>

      {rows.length > 0 && (
        <SectionCard
          title="Detalle por venta"
          description="Cada venta con su ingreso estimado, costo, margen bruto y margen operativo en ARS."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Venta
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Cliente
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Ingreso ARS
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Costo estimado ARS
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Margen bruto
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Margen operativo
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Advertencias
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map(({ sale, margin, clientLabel }) => {
                  const issuedAt =
                    sale.issuedAt instanceof Date
                      ? sale.issuedAt
                      : new Date(sale.issuedAt as any)
                  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

                  const grossPctLabel = formatMarginPct(margin.grossMarginPct)
                  const operatingPctLabel = formatMarginPct(
                    margin.operatingMarginPct
                  )

                  const isGrossLow = margin.grossMarginPct < 10
                  const isGrossNegative = margin.grossMarginARS < 0
                  const isOperatingNegative = margin.operatingMarginARS < 0

                  return (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-ifedel-primary">
                        {sale.saleNumber}
                      </td>
                      <td className="px-4 py-2">
                        <span className="block text-gray-900">
                          {clientLabel}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {issuedAtLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {fmtMoneyARS(margin.incomeARS)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-900">
                        {fmtMoneyARS(margin.estimatedCostARS)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div
                          className={
                            isGrossNegative
                              ? 'font-semibold text-red-700'
                              : isGrossLow
                              ? 'font-semibold text-amber-700'
                              : 'font-semibold text-gray-900'
                          }
                        >
                          {fmtMoneyARS(margin.grossMarginARS)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {grossPctLabel}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right">
                        <div
                          className={
                            isOperatingNegative
                              ? 'font-semibold text-red-700'
                              : 'font-semibold text-gray-900'
                          }
                        >
                          {fmtMoneyARS(margin.operatingMarginARS)}
                        </div>
                        <div className="text-xs text-gray-600">
                          {operatingPctLabel}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-xs text-gray-600">
                        {margin.hasMissingCosts ? (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                            Falta costo en uno o más productos
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                        <Link
                          href={`/sales/${sale.id}`}
                          className="text-xs font-medium text-ifedel-primary hover:underline"
                        >
                          Ver venta
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Todos los montos se muestran en ARS con base en la configuración financiera actual. Los márgenes son
            estimados y se calculan únicamente a partir de la información cargada en el sistema.
          </p>
        </SectionCard>
      )}
    </div>
  )
}


