import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { btnSecondary, linkAccentXs } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { MetricCard } from '@/components/layout/MetricCard'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
          <Link href="/purchases" className={btnSecondary}>
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
          <DataTableShell>
            <table className="dashboard-table min-w-full text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Compra
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Proveedor
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Emitida
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Vence
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total (ARS)
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Saldo (ARS)
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
                    <tr key={p.id}>
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
                      <td className="whitespace-nowrap px-4 py-2">
                        <StatusBadge status={p.status} />
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
                      <td className="whitespace-nowrap px-4 py-2">
                        <Link href={`/payables/${p.id}`} className={linkAccentXs}>
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

