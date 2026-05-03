import Link from 'next/link'
import { fmtMoneyARS } from '@/lib/format-money'
import { btnSecondarySm } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function FinancePage() {
  const { prisma } = await import('@/lib/prisma')
  const today = new Date()
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)

  const openReceivableStatuses = ['PENDING', 'PARTIAL'] as const
  const openPayableStatuses = ['PENDING', 'PARTIAL'] as const

  const [
    sumCashIn,
    sumCashOut,
    sumCashInMonth,
    sumCashOutMonth,
    sumReceivablePaid,
    sumPayablePaid,
    sumInstallBalancePending,
    sumInstallBalanceOverdue,
    openReceivableGroups,
    sumPayableBalancePending,
    sumPayableBalanceOverdue,
    openPayableCount,
  ] = await Promise.all([
    prisma.cashMovement.aggregate({
      where: { type: 'IN' },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: { type: 'OUT' },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: {
        type: 'IN',
        occurredAt: { gte: startOfMonth, lte: today },
      },
      _sum: { amount: true },
    }),
    prisma.cashMovement.aggregate({
      where: {
        type: 'OUT',
        occurredAt: { gte: startOfMonth, lte: today },
      },
      _sum: { amount: true },
    }),
    prisma.receivable.aggregate({
      _sum: { amountPaid: true },
    }),
    prisma.payable.aggregate({
      _sum: { amountPaid: true },
    }),
    prisma.receivableInstallment.aggregate({
      where: { status: { in: [...openReceivableStatuses] } },
      _sum: { balance: true },
    }),
    prisma.receivableInstallment.aggregate({
      where: {
        status: { in: [...openReceivableStatuses] },
        dueDate: { lt: today },
        balance: { gt: 0 },
      },
      _sum: { balance: true },
    }),
    prisma.receivableInstallment.groupBy({
      by: ['receivableId'],
      where: {
        status: { in: [...openReceivableStatuses] },
        balance: { gt: 0 },
      },
    }),
    prisma.payable.aggregate({
      where: { status: { in: [...openPayableStatuses] } },
      _sum: { balance: true },
    }),
    prisma.payable.aggregate({
      where: {
        status: { in: [...openPayableStatuses] },
        dueDate: { lt: today },
        balance: { gt: 0 },
      },
      _sum: { balance: true },
    }),
    prisma.payable.count({
      where: { status: { in: [...openPayableStatuses] } },
    }),
  ])

  const saldoCaja =
    (sumCashIn._sum.amount ?? 0) - (sumCashOut._sum.amount ?? 0)
  const totalCobrado = sumReceivablePaid._sum.amountPaid ?? 0
  const totalPagado = sumPayablePaid._sum.amountPaid ?? 0

  const totalPorCobrarPendiente = sumInstallBalancePending._sum.balance ?? 0
  const totalPorCobrarVencido = sumInstallBalanceOverdue._sum.balance ?? 0

  const totalPorPagarPendiente = sumPayableBalancePending._sum.balance ?? 0
  const totalPorPagarVencido = sumPayableBalanceOverdue._sum.balance ?? 0

  const cuentasPorCobrarAbiertas = openReceivableGroups.length
  const cuentasPorPagarAbiertas = openPayableCount

  const ingresosMes = sumCashInMonth._sum.amount ?? 0
  const egresosMes = sumCashOutMonth._sum.amount ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard financiero"
        description="Visión ejecutiva de caja, cuentas por cobrar y por pagar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/cash" className={btnSecondarySm}>
              Ver caja
            </Link>
            <Link href="/receivables" className={btnSecondarySm}>
              Cuentas por cobrar
            </Link>
            <Link href="/payables" className={btnSecondarySm}>
              Cuentas por pagar
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Saldo actual de caja"
          value={fmtMoneyARS(saldoCaja)}
          helper="Ingresos menos egresos registrados."
        />
        <MetricCard
          label="Pendiente por cobrar"
          value={fmtMoneyARS(totalPorCobrarPendiente)}
          helper="Suma de saldos de cuentas por cobrar abiertas."
        />
        <MetricCard
          label="Pendiente por pagar"
          value={fmtMoneyARS(totalPorPagarPendiente)}
          helper="Suma de saldos de cuentas por pagar abiertas."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Vencido por cobrar"
          value={fmtMoneyARS(totalPorCobrarVencido)}
          helper="Cuentas por cobrar vencidas con saldo pendiente."
          tone="danger"
        />
        <MetricCard
          label="Vencido por pagar"
          value={fmtMoneyARS(totalPorPagarVencido)}
          helper="Cuentas por pagar vencidas con saldo pendiente."
          tone="warning"
        />
        <MetricCard
          label="Total cobrado / pagado"
          value={
            <div className="space-y-1 text-sm">
              <div>Cobrado: {fmtMoneyARS(totalCobrado)}</div>
              <div>Pagado: {fmtMoneyARS(totalPagado)}</div>
            </div>
          }
          helper="Acumulado histórico en cuentas por cobrar y por pagar."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Cuentas por cobrar abiertas"
          value={cuentasPorCobrarAbiertas}
          helper="En estado PENDING o PARTIAL."
        />
        <MetricCard
          label="Cuentas por pagar abiertas"
          value={cuentasPorPagarAbiertas}
          helper="En estado PENDING o PARTIAL."
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <SectionCard
          title="Ingresos de caja (mes actual)"
          description="Suma de movimientos IN desde inicio de mes."
        >
          <p className="text-2xl font-semibold text-ifedel-black">
            {fmtMoneyARS(ingresosMes)}
          </p>
        </SectionCard>
        <SectionCard
          title="Egresos de caja (mes actual)"
          description="Suma de movimientos OUT desde inicio de mes."
        >
          <p className="text-2xl font-semibold text-ifedel-black">
            {fmtMoneyARS(egresosMes)}
          </p>
        </SectionCard>
      </section>
    </div>
  )
}
