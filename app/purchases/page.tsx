import Link from 'next/link'
import { fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { btnPrimary } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'
import { requireApprovedPage } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PURCHASES_LIST_LIMIT = 500

export default async function PurchasesListPage() {
  await requireApprovedPage()
  const { prisma } = await import('@/lib/prisma')
  const purchases = await prisma.purchase.findMany({
    take: PURCHASES_LIST_LIMIT,
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      purchaseNumber: true,
      issuedAt: true,
      currency: true,
      totalWithDiscount: true,
      status: true,
      supplierCompany: true,
      supplierName: true,
      supplier: {
        select: {
          name: true,
          company: true,
        },
      },
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras registradas"
        description="Listado simple de compras a proveedores y sus totales."
        actions={
          <Link href="/purchases/new" className={btnPrimary}>
            Nueva compra
          </Link>
        }
      />

      {purchases.length === 0 ? (
        <EmptyState
          title="Todavía no hay compras registradas"
          description="Cuando registres tus primeras compras a proveedores, van a aparecer listadas acá con sus totales y estado."
          actionLabel="Registrar compra"
          actionHref="/purchases/new"
        />
      ) : (
        <SectionCard
          title="Listado de compras"
          description="Detalle de cada compra con su proveedor, fecha, monto y estado."
        >
          <DataTableShell>
            <table className="dashboard-table min-w-full text-sm">
              <thead>
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    N°
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Proveedor
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Fecha
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Moneda
                  </th>
                  <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody>
                {purchases.map((p) => {
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
                  const issuedLabel = issued.toISOString().slice(0, 10)
                  const totalLabel =
                    p.currency === 'ARS'
                      ? fmtMoneyARS(p.totalWithDiscount)
                      : `${p.currency} ${fmtNumberAR(p.totalWithDiscount)}`

                  return (
                    <tr key={p.id}>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-ifedel-primary">
                        <Link
                          href={`/purchases/${p.id}`}
                          className="hover:underline"
                        >
                          {p.purchaseNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {supplierLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {issuedLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {totalLabel}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-700">
                        {p.currency}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <StatusBadge status={p.status} />
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
