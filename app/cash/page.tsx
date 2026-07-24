import Link from 'next/link'
import { fmtMoneyARS } from '@/lib/format-money'
import { btnSecondary } from '@/lib/ui-classes'
import { RegisterCashOutForm } from './RegisterCashOutForm'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireApprovedPage } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const CASH_MOVEMENTS_LIST_LIMIT = 500

export default async function CashPage() {
  await requireApprovedPage()
  const { prisma } = await import('@/lib/prisma')

  const [sumCashIn, sumCashOut, movementCount, movements] = await Promise.all([
    prisma.cashMovement.aggregate({
      where: { type: 'IN' },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: { type: 'OUT' },
      _sum: { amount: true },
    }),
    prisma.cashMovement.count(),
    prisma.cashMovement.findMany({
      take: CASH_MOVEMENTS_LIST_LIMIT,
      orderBy: { occurredAt: 'desc' },
      select: {
        id: true,
        occurredAt: true,
        type: true,
        amount: true,
        concept: true,
        category: true,
      },
    }),
  ])

  const saldo = (sumCashIn._sum.amount ?? 0) - (sumCashOut._sum.amount ?? 0)
  const totalIngresos = sumCashIn._sum.amount ?? 0
  const totalEgresos = sumCashOut._sum.amount ?? 0

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

      {movementCount === 0 ? (
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
