import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'

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
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Dashboard financiero
            </h1>
            <p className="text-sm text-gray-600">
              Visión ejecutiva de caja, cuentas por cobrar y por pagar.
            </p>
          </div>
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
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Saldo actual de caja
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(saldoCaja)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ingresos menos egresos registrados.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Pendiente por cobrar
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(totalPorCobrarPendiente)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de saldos de cuentas por cobrar abiertas.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Pendiente por pagar
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(totalPorPagarPendiente)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de saldos de cuentas por pagar abiertas.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-xs uppercase tracking-wide text-red-700">
              Vencido por cobrar
            </p>
            <p className="mt-1 text-2xl font-semibold text-red-700">
              {fmtMoneyARS(totalPorCobrarVencido)}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Cuentas por cobrar vencidas con saldo pendiente.
            </p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs uppercase tracking-wide text-amber-700">
              Vencido por pagar
            </p>
            <p className="mt-1 text-2xl font-semibold text-amber-700">
              {fmtMoneyARS(totalPorPagarVencido)}
            </p>
            <p className="mt-1 text-xs text-amber-700">
              Cuentas por pagar vencidas con saldo pendiente.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total cobrado / pagado
            </p>
            <p className="mt-1 text-lg font-semibold text-ifedel-black">
              Cobrado: {fmtMoneyARS(totalCobrado)}
            </p>
            <p className="mt-1 text-lg font-semibold text-ifedel-black">
              Pagado: {fmtMoneyARS(totalPagado)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Acumulado histórico en cuentas por cobrar y por pagar.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Cuentas por cobrar abiertas
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {cuentasPorCobrarAbiertas}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              En estado PENDING o PARTIAL.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Cuentas por pagar abiertas
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {cuentasPorPagarAbiertas}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              En estado PENDING o PARTIAL.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Ingresos de caja (mes actual)
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(ingresosMes)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de movimientos IN desde inicio de mes.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Egresos de caja (mes actual)
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(egresosMes)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de movimientos OUT desde inicio de mes.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}

