import Link from 'next/link'
import { prisma } from '@/lib/prisma'

export default async function QuotesListPage() {
  const quotes = await prisma.quote.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      customer: true,
      createdBy: true,
    },
  })

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Cotizaciones guardadas
            </h1>
            <p className="text-sm text-gray-600">
              Listado simple de cotizaciones persistidas en el sistema.
            </p>
          </div>
          <Link
            href="/quotes/new"
            className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Nueva cotización
          </Link>
        </div>

        {quotes.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Todavía no hay cotizaciones guardadas.
          </div>
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
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-gray-800">
                        {q.quoteNumber}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        {q.status}
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
                      <td className="whitespace-nowrap px-4 py-2 text-gray-500">
                        <span className="text-xs text-gray-400">
                          Ver detalle (próximamente)
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

