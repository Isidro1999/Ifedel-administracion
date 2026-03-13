import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'

export default async function FinancePage() {
  const [movements, receivables, payables] = await Promise.all([
    prisma.cashMovement.findMany(),
    prisma.receivable.findMany(),
    prisma.payable.findMany(),
  ])

  const today = new Date()

  const saldoCaja = movements.reduce((acc, m) => {
    const sign = m.type === 'OUT' ? -1 : 1
    return acc + sign * m.amount
  }, 0)

  const totalCobrado = receivables.reduce(
    (acc, r) => acc + (r.amountPaid || 0),
    0
  )
  const totalPagado = payables.reduce(
    (acc, p) => acc + (p.amountPaid || 0),
    0
  )

  const totalPorCobrarPendiente = receivables
    .filter((r) => r.status === 'PENDING' || r.status === 'PARTIAL')
    .reduce((acc, r) => acc + (r.balance || 0), 0)

  const totalPorCobrarVencido = receivables
    .filter((r) => {
      const due =
        r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate as any)
      return (
        due < today &&
        (r.status === 'PENDING' || r.status === 'PARTIAL') &&
        (r.balance || 0) > 0
      )
    })
    .reduce((acc, r) => acc + (r.balance || 0), 0)

  const totalPorPagarPendiente = payables
    .filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL')
    .reduce((acc, p) => acc + (p.balance || 0), 0)

  const totalPorPagarVencido = payables
    .filter((p) => {
      const due =
        p.dueDate instanceof Date ? p.dueDate : new Date(p.dueDate as any)
      return (
        due < today &&
        (p.status === 'PENDING' || p.status === 'PARTIAL') &&
        (p.balance || 0) > 0
      )
    })
    .reduce((acc, p) => acc + (p.balance || 0), 0)

  const cuentasPorCobrarAbiertas = receivables.filter(
    (r) => r.status === 'PENDING' || r.status === 'PARTIAL'
  ).length

  const cuentasPorPagarAbiertas = payables.filter(
    (p) => p.status === 'PENDING' || p.status === 'PARTIAL'
  ).length

  // Métricas de caja del mes actual (opcional)
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const movimientosMes = movements.filter((m) => {
    const d =
      m.occurredAt instanceof Date
        ? m.occurredAt
        : new Date(m.occurredAt as any)
    return d >= startOfMonth && d <= today
  })

  const ingresosMes = movimientosMes
    .filter((m) => m.type === 'IN')
    .reduce((acc, m) => acc + m.amount, 0)

  const egresosMes = movimientosMes
    .filter((m) => m.type === 'OUT')
    .reduce((acc, m) => acc + m.amount, 0)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard financiero"
        description="Visión ejecutiva de caja, cuentas por cobrar y por pagar."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/cash"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Ver caja
            </Link>
            <Link
              href="/receivables"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
              Cuentas por cobrar
            </Link>
            <Link
              href="/payables"
              className="rounded-md border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
            >
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

