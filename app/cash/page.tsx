import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { btnSecondary } from '@/lib/ui-classes'
import { RegisterCashOutForm } from './RegisterCashOutForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
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
          <Link href="/finance" className={btnSecondary}>
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
          <DataTableShell>
            <table className="dashboard-table min-w-full text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Tipo
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Monto
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Concepto
                  </th>
                  <th className="whitespace-nowrap px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Categoría
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => {
                    const date =
                      m.occurredAt instanceof Date
                        ? m.occurredAt
                        : new Date(m.occurredAt as any)
                    const dateLabel = date.toISOString().slice(0, 10)
                    const sign = m.type === 'OUT' ? -1 : 1
                    const signedAmount = sign * m.amount
                    return (
                      <tr key={m.id}>
                        <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                          {dateLabel}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2">
                          <StatusBadge status={m.type} />
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
            </DataTableShell>
          </SectionCard>
        )}
    </div>
  )
}

