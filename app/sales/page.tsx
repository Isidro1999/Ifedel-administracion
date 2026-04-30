import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { btnSecondary, linkAccentXs } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
          <Link href="/quotes" className={btnSecondary}>
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
        <DataTableShell>
          <table className="dashboard-table min-w-full text-sm">
            <thead>
              <tr>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  N°
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Estado
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cliente
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Total
                </th>
                <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Moneda
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Emitida
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Creada por
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cotización origen
                </th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
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
                  <tr key={s.id}>
                    <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-800">
                      {s.saleNumber}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2">
                      <StatusBadge status={s.status} />
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
                    <td className="whitespace-nowrap px-4 py-2">
                      <Link href={`/sales/${s.id}`} className={linkAccentXs}>
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </DataTableShell>
      )}
    </div>
  )
}

