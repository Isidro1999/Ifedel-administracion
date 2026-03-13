import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function PayablesListPage() {
  const payables = await prisma.payable.findMany({
    orderBy: { dueDate: 'asc' },
    include: {
      supplier: true,
      purchase: true,
    },
  })

  const today = new Date()

  const totalPending = payables
    .filter((p) => p.status === 'PENDING' || p.status === 'PARTIAL')
    .reduce((acc, p) => acc + (p.balance || 0), 0)

  const totalOverdue = payables
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

  const totalPaid = payables.reduce(
    (acc, p) => acc + (p.amountPaid || 0),
    0
  )

  const openCount = payables.filter(
    (p) => p.status === 'PENDING' || p.status === 'PARTIAL'
  ).length

  const paidCount = payables.filter((p) => p.status === 'PAID').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cuentas por pagar"
        description="Deudas con proveedores originadas en compras registradas."
        actions={
          <Link
            href="/purchases"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ver compras
          </Link>
        }
      />

      {payables.length > 0 && (
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
            tone="warning"
          />
          <MetricCard
            label="Total pagado"
            value={fmtMoneyARS(totalPaid)}
            helper="Pagos registrados a proveedores."
          />
        </section>
      )}

      {payables.length > 0 && (
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

      {payables.length === 0 ? (
        <EmptyState
          title="Todavía no hay cuentas por pagar"
          description="A medida que registres compras con condiciones de pago, se irán creando automáticamente las cuentas por pagar asociadas."
        />
      ) : (
        <SectionCard
          title="Detalle de cuentas por pagar"
          description="Listado detallado de cada cuenta, su proveedor, fechas clave y estado de pago."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Compra
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Emitida
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Vence
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Total (ARS)
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Saldo (ARS)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Overdue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payables.map((p) => {
                  const supplierLabel =
                    p.supplierCompany ||
                    p.supplierName ||
                    p.supplier?.company ||
                    p.supplier?.name ||
                    '-'

                  const issued =
                    p.issuedAt instanceof Date
                      ? p.issuedAt
                      : new Date(p.issuedAt as any)
                  const due =
                    p.dueDate instanceof Date
                      ? p.dueDate
                      : new Date(p.dueDate as any)

                  const issuedLabel = issued.toISOString().slice(0, 10)
                  const dueLabel = due.toISOString().slice(0, 10)

                  const isOverdue =
                    due < today &&
                    (p.status === 'PENDING' || p.status === 'PARTIAL') &&
                    p.balance > 0

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 text-xs text-ifedel-primary">
                        {p.purchase ? (
                          <Link
                            href={`/purchases/${p.purchase.id}`}
                            className="hover:underline"
                          >
                            {p.purchase.purchaseNumber}
                          </Link>
                        ) : (
                          `Compra #${p.purchaseId}`
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {supplierLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {issuedLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {dueLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtMoneyARS(p.totalAmount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {fmtMoneyARS(p.balance)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        {p.status}
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

