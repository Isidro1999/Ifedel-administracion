import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { getFinancialSettings } from '@/lib/financial-settings'
import { computeSaleMarginForSale } from '@/lib/margin'

export default async function PeriodAnalyticsPage() {
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const [settings, sales] = await Promise.all([
    getFinancialSettings(),
    prisma.sale.findMany({
      where: {
        status: 'CONFIRMED',
        issuedAt: {
          gte: startOfMonth,
          lte: today,
        },
      },
      include: {
        items: { include: { product: true }, orderBy: { sortOrder: 'asc' } },
      },
    }),
  ])

  const margins = sales.map((sale) =>
    computeSaleMarginForSale(sale, settings)
  )

  const totalIncome = margins.reduce(
    (acc, m) => acc + m.incomeARS,
    0
  )
  const totalCost = margins.reduce(
    (acc, m) => acc + m.estimatedCostARS,
    0
  )
  const totalGrossMargin = margins.reduce(
    (acc, m) => acc + m.grossMarginARS,
    0
  )
  const totalIIBB = margins.reduce(
    (acc, m) => acc + m.estimatedIIBB,
    0
  )
  const totalBankCreditCost = margins.reduce(
    (acc, m) => acc + m.estimatedBankCreditCost,
    0
  )
  const totalBankDebitCost = margins.reduce(
    (acc, m) => acc + m.estimatedBankDebitCost,
    0
  )

  const grossMarginPct =
    totalIncome > 0 ? (totalGrossMargin / totalIncome) * 100 : 0

  const fixedMonthlyCosts = settings.fixedMonthlyOverheadARS
  const daysInMonth = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0
  ).getDate()
  const elapsedDays = today.getDate()
  const fixedCostsYtd =
    daysInMonth > 0
      ? (fixedMonthlyCosts * elapsedDays) / daysInMonth
      : fixedMonthlyCosts

  const operatingResult =
    totalGrossMargin -
    totalIIBB -
    totalBankCreditCost -
    totalBankDebitCost -
    fixedCostsYtd

  const operatingMarginBase =
    totalIncome > 0 ? totalIncome : Math.abs(operatingResult) || 1
  const operatingMarginPct =
    (operatingResult / operatingMarginBase) * 100

  const analyzedSalesCount = sales.length
  const anyMissingCosts = margins.some((m) => m.hasMissingCosts)

  const periodLabel = `${startOfMonth
    .toISOString()
    .slice(0, 10)} al ${today.toISOString().slice(0, 10)}`

  return (
    <div className="space-y-6">
      <PageHeader
        title="Resultado operativo estimado"
        description="Mes actual acumulado al día, en base a las ventas confirmadas registradas en el sistema."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/analytics/sales"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Ver analytics de ventas
            </Link>
            <Link
              href="/analytics/products"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Ver analytics de productos
            </Link>
            <Link
              href="/finance"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Ver dashboard financiero
            </Link>
          </div>
        }
      />

      <SectionCard
        title="Resumen del período"
        description={`Período analizado: ${periodLabel}. Todos los montos están expresados en ARS.`}
      >
        {analyzedSalesCount === 0 ? (
          <p className="text-sm text-gray-600">
            Todavía no hay ventas confirmadas en el mes actual para calcular el resultado operativo estimado.
          </p>
        ) : (
          <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Ventas del período (ingreso estimado)
              </dt>
              <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                {fmtMoneyARS(totalIncome)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Costo estimado del período
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
                {fmtMoneyARS(totalGrossMargin)}{' '}
                <span className="text-xs text-gray-600">
                  ({fmtNumberAR(grossMarginPct)}%)
                </span>
              </dd>
            </div>
          </dl>
        )}
        {anyMissingCosts && (
          <p className="mt-3 text-xs text-amber-700">
            Algunas ventas tienen productos sin costo cargado o sin tipo de cambio válido; el margen puede estar
            subestimado respecto de la realidad.
          </p>
        )}
      </SectionCard>

      {analyzedSalesCount > 0 && (
        <>
          <SectionCard
            title="Ajustes impositivos y financieros"
            description="Componentes que se descuentan del margen bruto para estimar el resultado operativo."
          >
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  IIBB estimado
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {fmtMoneyARS(totalIIBB)}
                </dd>
                <p className="mt-1 text-xs text-gray-500">
                  Calculado como ingreso ARS × tasa de Ingresos Brutos configurada.
                </p>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Costo bancario créditos
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {fmtMoneyARS(totalBankCreditCost)}
                </dd>
                <p className="mt-1 text-xs text-gray-500">
                  Estimación sobre créditos en cuenta según la tasa configurada.
                </p>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Costo bancario débitos
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {fmtMoneyARS(totalBankDebitCost)}
                </dd>
                <p className="mt-1 text-xs text-gray-500">
                  Estimación sobre débitos en cuenta según la tasa configurada.
                </p>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Gastos fijos (mes completo)
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {fmtMoneyARS(settings.fixedMonthlyOverheadARS)}
                </dd>
                <p className="mt-1 text-xs text-gray-500">
                  Para el resultado del período se prorratean al período transcurrido del mes.
                </p>
              </div>
            </dl>
          </SectionCard>

          <SectionCard
            title="Resultado operativo estimado"
            description="Margen luego de costos, IIBB, costo bancario y gastos fijos del mes prorrateados."
          >
            <dl className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Resultado operativo ARS
                </dt>
                <dd
                  className={
                    operatingResult < 0
                      ? 'mt-1 text-lg font-semibold text-red-700'
                      : 'mt-1 text-lg font-semibold text-ifedel-black'
                  }
                >
                  {fmtMoneyARS(operatingResult)}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Margen operativo %
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {fmtNumberAR(operatingMarginPct)}%
                </dd>
              </div>
              <div>
                <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Ventas analizadas
                </dt>
                <dd className="mt-1 text-lg font-semibold text-ifedel-black">
                  {analyzedSalesCount}
                </dd>
              </div>
            </dl>
          </SectionCard>
        </>
      )}
    </div>
  )
}


