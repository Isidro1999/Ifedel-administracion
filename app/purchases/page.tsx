import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function PurchasesListPage() {
  const purchases = await prisma.purchase.findMany({
    orderBy: { issuedAt: 'desc' },
    include: {
      supplier: true,
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compras registradas"
        description="Listado simple de compras a proveedores y sus totales."
        actions={
          <Link
            href="/purchases/new"
            className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
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
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    N°
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Total
                  </th>
                  <th className="px-2 py-2 text-left font-semibold text-gray-700">
                    Moneda
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    <tr key={p.id} className="hover:bg-gray-50">
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
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        {p.status}
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

