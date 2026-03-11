import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { RegisterCashOutForm } from './RegisterCashOutForm'

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
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">Caja</h1>
            <p className="text-sm text-gray-600">
              Resumen simple de ingresos y egresos en ARS.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver al inicio
          </Link>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Saldo actual
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(saldo)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Ingresos menos egresos registrados.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total ingresos
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(totalIngresos)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de movimientos de tipo IN.
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Total egresos
            </p>
            <p className="mt-1 text-2xl font-semibold text-ifedel-black">
              {fmtMoneyARS(totalEgresos)}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Suma de movimientos de tipo OUT.
            </p>
          </div>
        </section>

        <RegisterCashOutForm />

        {movements.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Todavía no hay movimientos de caja registrados.
          </div>
        ) : (
          <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="text-base font-semibold text-ifedel-black mb-3">
              Movimientos de caja
            </h2>
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
          </section>
        )}
      </div>
    </div>
  )
}

