import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { btnPrimary, linkAccentXs } from '@/lib/ui-classes'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { EmptyState } from '@/components/ui/EmptyState'

export default async function QuotesListPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      createdBy: true,
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cotizaciones guardadas"
        description="Listado simple de cotizaciones persistidas en el sistema."
        actions={
          <Link href="/quotes/new" className={btnPrimary}>
            Nueva cotización
          </Link>
        }
      />

      {quotes.length === 0 ? (
        <EmptyState
          title="Todavía no hay cotizaciones guardadas"
          description="Podés generar una nueva cotización desde el catálogo de productos o usando el flujo de creación rápida."
          actionLabel="Crear cotización"
          actionHref="/quotes/new"
        />
      ) : (
        <SectionCard
          title="Listado de cotizaciones"
          description="Detalle de cada cotización con su cliente, monto y estado."
        >
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
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {quotes.map((q) => {
                  const clientLabel =
                    q.customerCompany ||
                    q.customerName ||
                    q.customerEmail ||
                    q.customerPhone ||
                    '-'

                  const createdByLabel =
                    q.createdBy?.email || q.createdBy?.name || '-'

                  const issuedAt =
                    q.issuedAt instanceof Date
                      ? q.issuedAt
                      : new Date(q.issuedAt as any)

                  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

                  return (
                    <tr key={q.id}>
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-800">
                        {q.quoteNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <StatusBadge status={q.status} />
                      </td>
                      <td className="px-4 py-2">
                        <span className="block text-gray-900">{clientLabel}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-right font-semibold text-gray-900">
                        {q.totalWithDiscount.toFixed(2)}
                      </td>
                      <td className="whitespace-nowrap px-2 py-2 text-gray-700">
                        {q.currency}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {issuedAtLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-gray-700">
                        {createdByLabel}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2">
                        <Link href={`/quotes/${q.id}`} className={linkAccentXs}>
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

