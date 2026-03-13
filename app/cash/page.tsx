import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { RegisterCashOutForm } from './RegisterCashOutForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function CashPage() {
  const movements = await prisma.cashMovement.findMany({
    orderBy: { occurredAt: 'desc' },
  })

  const saldo = movements.reduce((acc, m) => {
    const sign = m.type === 'OUT' ? -1 : 1
    return acc + sign * m.amount
  }, 0)

  const totalIngresos = movements
    .filter((m) => m.type === 'IN')
    .reduce((acc, m) => acc + m.amount, 0)

  const totalEgresos = movements
    .filter((m) => m.type === 'OUT')
    .reduce((acc, m) => acc + m.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Caja"
        description="Resumen simple de ingresos y egresos en ARS."
        actions={
          <Link
            href="/finance"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ver dashboard financiero
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Saldo actual"
          value={fmtMoneyARS(saldo)}
          helper="Ingresos menos egresos registrados."
        />
        <MetricCard
          label="Total ingresos"
          value={fmtMoneyARS(totalIngresos)}
          helper="Suma de movimientos de tipo IN."
        />
        <MetricCard
          label="Total egresos"
          value={fmtMoneyARS(totalEgresos)}
          helper="Suma de movimientos de tipo OUT."
        />
      </section>

      <SectionCard
        title="Registrar egreso de caja"
        description="Registrar de forma rápida un nuevo movimiento de salida."
      >
        <RegisterCashOutForm />
      </SectionCard>

      {movements.length === 0 ? (
        <EmptyState
          title="Todavía no hay movimientos de caja"
          description="Cuando registres ingresos o egresos, vas a ver el detalle histórico de caja en este bloque."
        />
      ) : (
        <SectionCard
          title="Movimientos de caja"
          description="Detalle histórico de ingresos y egresos registrados."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Tipo
                  </th>
                  <th className="px-3 py-2 text-right font-semibold text-gray-700">
                    Monto
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Concepto
                  </th>
                  <th className="px-3 py-2 text-left font-semibold text-gray-700">
                    Categoría
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movements.map((m) => {
                    const date =
                      m.occurredAt instanceof Date
                        ? m.occurredAt
                        : new Date(m.occurredAt as any)
                    const dateLabel = date.toISOString().slice(0, 10)
                    const sign = m.type === 'OUT' ? -1 : 1
                    const signedAmount = sign * m.amount
                    return (
                      <tr key={m.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                          {dateLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                          {m.type}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right font-semibold text-gray-900">
                          {fmtMoneyARS(signedAmount)}
                        </td>
                        <td className="px-3 py-2 text-gray-800">
                          {m.concept}
                        </td>
                        <td className="px-3 py-2 text-gray-600 text-xs">
                          {m.category || '-'}
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

