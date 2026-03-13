import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { PageHeader } from '@/components/layout/PageHeader'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function SalesListPage() {
  const sales = await prisma.sale.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      createdBy: true,
      quote: true,
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ventas registradas"
        description="Listado simple de ventas generadas a partir de cotizaciones u otros procesos comerciales."
        actions={
          <Link
            href="/quotes"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Volver a cotizaciones
          </Link>
        }
      />

      {sales.length === 0 ? (
        <EmptyState
          title="Todavía no hay ventas registradas"
          description="Cuando registres ventas confirmadas, vas a poder analizarlas desde este listado y desde el módulo de analytics."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  N°
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Estado
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Cliente
                </th>
                <th className="px-4 py-2 text-right font-semibold text-gray-700">
                  Total
                </th>
                <th className="px-2 py-2 text-left font-semibold text-gray-700">
                  Moneda
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Emitida
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Creada por
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Cotización origen
                </th>
                <th className="px-4 py-2 text-left font-semibold text-gray-700">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sales.map((s) => {
                const clientLabel =
                  s.customerCompany ||
                  s.customerName ||
                  s.customerEmail ||
                  s.customerPhone ||
                  '-'

                const createdByLabel =
                  s.createdBy?.email || s.createdBy?.name || '-'

                const issuedAt =
                  s.issuedAt instanceof Date
                    ? s.issuedAt
                    : new Date(s.issuedAt as any)

                const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

                const hasTotalARS = s.totalARS != null && !Number.isNaN(s.totalARS)
                const mainTotalLabel = hasTotalARS
                  ? fmtMoneyARS(s.totalARS as number)
                  : s.currency === 'ARS'
                  ? fmtMoneyARS(s.totalWithDiscount)
                  : s.currency === 'USD'
                  ? fmtMoneyUSD(s.totalWithDiscount)
                  : `${s.currency} ${fmtNumberAR(s.totalWithDiscount)}`

                const secondaryLabel =
                  hasTotalARS && s.currency === 'USD'
                    ? fmtMoneyUSD(s.totalWithDiscount)
                    : null

                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-800">
                      {s.saleNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                      {s.status}
                    </td>
                    <td className="px-4 py-2">
                      <span className="block text-gray-900">{clientLabel}</span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                      <div>{mainTotalLabel}</div>
                      {secondaryLabel && (
                        <div className="text-xs text-gray-500">
                          ({secondaryLabel})
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-2 py-2 text-gray-700">
                      {s.currency}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {issuedAtLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                      {createdByLabel}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-xs text-ifedel-primary">
                      {s.quote ? (
                        <Link
                          href={`/quotes/${s.quote.id}`}
                          className="hover:underline"
                        >
                          {s.quote.quoteNumber}
                        </Link>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                      <Link
                        href={`/sales/${s.id}`}
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
      )}
    </div>
  )
}

