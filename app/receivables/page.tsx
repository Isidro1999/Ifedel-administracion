import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function ReceivablesListPage() {
  const receivables = await prisma.receivable.findMany({
    orderBy: { dueDate: 'asc' },
    include: {
      sale: true,
      customer: true,
    },
  })

  const today = new Date()

  const totalPending = receivables
    .filter((r) => r.status === 'PENDING' || r.status === 'PARTIAL')
    .reduce((acc, r) => acc + (r.balance || 0), 0)

  const totalOverdue = receivables
    .filter((r) => {
      const dueDate =
        r.dueDate instanceof Date ? r.dueDate : new Date(r.dueDate as any)
      return (
        dueDate < today &&
        (r.status === 'PENDING' || r.status === 'PARTIAL') &&
        (r.balance || 0) > 0
      )
    })
    .reduce((acc, r) => acc + (r.balance || 0), 0)

  const totalCollected = receivables.reduce(
    (acc, r) => acc + (r.amountPaid || 0),
    0
  )

  const openCount = receivables.filter(
    (r) => r.status === 'PENDING' || r.status === 'PARTIAL'
  ).length

  const paidCount = receivables.filter((r) => r.status === 'PAID').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas por cobrar"
        description="Listado de saldos pendientes asociados a ventas confirmadas."
        actions={
          <Link
            href="/sales"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver a ventas
          </Link>
        }
      />

      {receivables.length > 0 && (
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

      {receivables.length > 0 && (
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

      {receivables.length === 0 ? (
        <EmptyState
          title="Todavía no hay cuentas por cobrar"
          description="A medida que confirmes ventas con condiciones de pago, se irán creando automáticamente las cuentas por cobrar asociadas."
        />
      ) : (
        <SectionCard
          title="Detalle de cuentas por cobrar"
          description="Listado detallado de cada cuenta, su cliente, fechas clave y estado de cobro."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    ID
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Venta
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Cliente
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Cobrado
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Saldo
                  </th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700">
                    Moneda
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Emitida
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Vence
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Overdue
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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

                  const isOverdue =
                    dueDate < today &&
                    (r.status === 'PENDING' || r.status === 'PARTIAL') &&
                    r.balance > 0

                  return (
                    <tr key={r.id} className="hover:bg-gray-50">
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
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        {r.status}
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
                        <Link
                          href={`/receivables/${r.id}`}
                          className="text-xs font-medium text-ifedel-primary hover:underline"
                        >
                          Ver detalle
                        </Link>
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

