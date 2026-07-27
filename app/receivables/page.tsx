import Link from 'next/link'
import { fmtMoneyARS } from '@/lib/format-money'
import { btnSecondary, linkAccentXs } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireApprovedPage } from '@/lib/session-auth'
import { withPerf } from '@/lib/perf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const RECEIVABLES_LIST_LIMIT = 500
const openReceivableStatuses = ['PENDING', 'PARTIAL'] as const

export default async function ReceivablesListPage() {
  await requireApprovedPage()
  const { prisma } = await import('@/lib/prisma')
  const today = new Date()

  const [
    totalPendingAgg,
    totalOverdueAgg,
    totalCollectedAgg,
    openCountAgg,
    paidCountAgg,
    receivableCount,
    receivables,
  ] = await Promise.all([
    prisma.receivable.aggregate({
      where: { status: { in: [...openReceivableStatuses] } },
      _sum: { balance: true },
    }),
    prisma.receivable.aggregate({
      where: {
        status: { in: [...openReceivableStatuses] },
        dueDate: { lt: today },
        balance: { gt: 0 },
      },
      _sum: { balance: true },
    }),
    prisma.receivable.aggregate({
      _sum: { amountPaid: true },
    }),
    prisma.receivable.count({
      where: { status: { in: [...openReceivableStatuses] } },
    }),
    prisma.receivable.count({
      where: { status: 'PAID' },
    }),
    prisma.receivable.count(),
    withPerf(
      'receivables.list',
      () =>
        prisma.receivable.findMany({
          take: RECEIVABLES_LIST_LIMIT,
          orderBy: { dueDate: 'asc' },
          select: {
            id: true,
            customerCompany: true,
            customerName: true,
            totalAmount: true,
            amountPaid: true,
            balance: true,
            currency: true,
            issuedAt: true,
            dueDate: true,
            status: true,
            customer: {
              select: {
                company: true,
                name: true,
              },
            },
            sale: {
              select: {
                id: true,
                saleNumber: true,
              },
            },
            // Solo lo necesario para #cuotas y próximo vencimiento abierto.
            installments: {
              orderBy: [{ dueDate: 'asc' }, { order: 'asc' }],
              select: {
                order: true,
                dueDate: true,
                balance: true,
                status: true,
              },
            },
          },
        }),
      (rows) => rows.length,
    ),
  ])

  const totalPending = totalPendingAgg._sum.balance ?? 0
  const totalOverdue = totalOverdueAgg._sum.balance ?? 0
  const totalCollected = totalCollectedAgg._sum.amountPaid ?? 0
  const openCount = openCountAgg
  const paidCount = paidCountAgg

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas por cobrar"
        description="Listado de saldos pendientes asociados a ventas confirmadas."
        actions={
          <Link href="/sales" className={btnSecondary}>
            Volver a ventas
          </Link>
        }
      />

      {receivableCount > 0 && (
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total pendiente"
            value={fmtMoneyARS(totalPending)}
            helper="Suma de saldos de cuentas PENDING + PARTIAL."
          />
          <MetricCard
            label="Total vencido"
            value={fmtMoneyARS(totalOverdue)}
            helper="Cuentas vencidas con saldo pendiente."
            tone="danger"
          />
          <MetricCard
            label="Total cobrado"
            value={fmtMoneyARS(totalCollected)}
            helper="Suma de cobros registrados en todas las cuentas."
          />
        </section>
      )}

      {receivableCount > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          <MetricCard
            label="Cuentas abiertas"
            value={openCount}
            helper="En estado PENDING o PARTIAL."
          />
          <MetricCard
            label="Cuentas pagadas"
            value={paidCount}
            helper="Con estado PAID y saldo en cero."
          />
        </section>
      )}

      {receivableCount === 0 ? (
        <EmptyState
          title="Todavía no hay cuentas por cobrar"
          description="A medida que confirmes ventas con condiciones de pago, se irán creando automáticamente las cuentas por cobrar asociadas."
        />
      ) : (
        <SectionCard
          title="Detalle de cuentas por cobrar"
          description="Listado detallado de cada cuenta, su cliente, fechas clave y estado de cobro."
        >
          <DataTableShell>
            <table className="dashboard-table min-w-full text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    ID
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Venta
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cliente
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cobrado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Saldo
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Moneda
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Emitida
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vence
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cuotas
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Próximo vencimiento
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Overdue
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => {
                  const clientLabel =
                    r.customerCompany ||
                    r.customerName ||
                    r.customer?.company ||
                    r.customer?.name ||
                    '-'

                  const fmtMoneyGeneric = (amount: number) => {
                    // Las cuentas por cobrar se expresan en ARS como moneda principal
                    return fmtMoneyARS(amount)
                  }

                  const issuedAt =
                    r.issuedAt instanceof Date
                      ? r.issuedAt
                      : new Date(r.issuedAt as any)
                  const dueDate =
                    r.dueDate instanceof Date
                      ? r.dueDate
                      : new Date(r.dueDate as any)

                  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)
                  const dueDateLabel = dueDate.toISOString().slice(0, 10)

                  const sortedInstallments = (r.installments.length > 0
                    ? r.installments
                    : [
                        {
                          order: 0,
                          dueDate: r.dueDate,
                          balance: r.balance,
                          status: r.status,
                        },
                      ]
                  )
                    .slice()
                    .sort((a, b) => {
                      const aDue =
                        a.dueDate instanceof Date ? a.dueDate : new Date(a.dueDate as any)
                      const bDue =
                        b.dueDate instanceof Date ? b.dueDate : new Date(b.dueDate as any)
                      if (aDue.getTime() === bDue.getTime()) return a.order - b.order
                      return aDue.getTime() - bDue.getTime()
                    })

                  const nextOpenInstallment = sortedInstallments.find((inst) => {
                    const status = inst.status
                    return (status === 'PENDING' || status === 'PARTIAL') && inst.balance > 0
                  })

                  const nextDueLabel = nextOpenInstallment
                    ? (nextOpenInstallment.dueDate instanceof Date
                        ? nextOpenInstallment.dueDate
                        : new Date(nextOpenInstallment.dueDate as any)
                      )
                        .toISOString()
                        .slice(0, 10)
                    : '-'

                  const isOverdue =
                    dueDate < today &&
                    (r.status === 'PENDING' || r.status === 'PARTIAL') &&
                    r.balance > 0

                  return (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-800">
                        #{r.id}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-ifedel-primary">
                        {r.sale ? (
                          <Link
                            href={`/sales/${r.sale.id}`}
                            className="hover:underline"
                          >
                            {r.sale.saleNumber}
                          </Link>
                        ) : (
                          <span className="text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className="block text-gray-900">{clientLabel}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtMoneyGeneric(r.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">
                        {fmtMoneyGeneric(r.amountPaid)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtMoneyGeneric(r.balance)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-700">
                        {r.currency}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {issuedAtLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {dueDateLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right text-gray-700">
                        {sortedInstallments.length}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {nextDueLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        {isOverdue ? (
                          <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                            Vencida
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">-</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                        <Link href={`/receivables/${r.id}`} className={linkAccentXs}>
                          Ver detalle
                        </Link>
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
