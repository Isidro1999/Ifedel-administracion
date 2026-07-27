import Link from 'next/link'
import { notFound } from 'next/navigation'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { ConvertToSaleButton } from './ConvertToSaleButton'
import { requireApprovedPage } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface QuotesDetailPageProps {
  params: { id: string }
}

export default async function QuoteDetailPage({ params }: QuotesDetailPageProps) {
  await requireApprovedPage()
  const { prisma } = await import('@/lib/prisma')
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: true,
      items: true,
      sale: true,
    },
  })

  if (!quote) {
    notFound()
  }

  const clientLabel =
    quote.customerCompany ||
    quote.customerName ||
    quote.customerEmail ||
    quote.customerPhone ||
    'Sin datos de cliente'

  const createdByLabel =
    quote.createdBy?.email || quote.createdBy?.name || 'Desconocido'

  const issuedAt =
    quote.issuedAt instanceof Date
      ? quote.issuedAt
      : new Date(quote.issuedAt as any)
  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

  const expiresAtLabel = quote.expiresAt
    ? (quote.expiresAt instanceof Date
        ? quote.expiresAt
        : new Date(quote.expiresAt as any)
      )
        .toISOString()
        .slice(0, 10)
    : '-'

  const currencyLabel = quote.currency

  const fmtMoneyGeneric = (amount: number | null | undefined) => {
    if (amount == null || Number.isNaN(amount)) return '-'
    if (currencyLabel === 'ARS') return fmtMoneyARS(amount)
    if (currencyLabel === 'USD') return fmtMoneyUSD(amount)
    return `${currencyLabel} ${fmtNumberAR(amount)}`
  }

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Cotización {quote.quoteNumber}
            </h1>
            <p className="text-sm text-gray-600">
              Estado:{' '}
              <StatusBadge status={quote.status} className="align-middle" />
            </p>
            {quote.paymentTermLabelSnapshot && (
              <p className="text-xs text-gray-600 mt-1">
                Condición de pago:{' '}
                <span className="font-medium">
                  {quote.paymentTermLabelSnapshot} ({quote.paymentTermCodeSnapshot})
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/quotes"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Volver al listado
            </Link>
            <ConvertToSaleButton
              quoteId={quote.id}
              quoteStatus={quote.status}
              existingSale={quote.sale ? { id: quote.sale.id, saleNumber: quote.sale.saleNumber } : null}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
            <h2 className="text-base font-semibold text-ifedel-black mb-1">
              Datos de la cotización
            </h2>
            <div className="flex justify-between">
              <span className="text-gray-600">N° cotización</span>
              <span className="font-mono text-xs text-gray-900">
                {quote.quoteNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emitida</span>
              <span className="text-gray-900">{issuedAtLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vence</span>
              <span className="text-gray-900">{expiresAtLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda</span>
              <span className="text-gray-900">{quote.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo de cambio (ARS por {quote.currency})</span>
              <span className="text-gray-900">
                {quote.exchangeRateARS != null
                  ? fmtNumberAR(quote.exchangeRateARS)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento (%)</span>
              <span className="text-gray-900">
                {quote.discountPct.toFixed(2)}%
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-600">Creada por</span>
              <span className="text-gray-900">{createdByLabel}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
            <h2 className="text-base font-semibold text-ifedel-black mb-1">
              Cliente
            </h2>
            <div className="space-y-1">
              <p className="text-gray-900">{clientLabel}</p>
              {quote.customerEmail && (
                <p className="text-gray-700 text-xs">
                  Email: {quote.customerEmail}
                </p>
              )}
              {quote.customerPhone && (
                <p className="text-gray-700 text-xs">
                  Teléfono: {quote.customerPhone}
                </p>
              )}
            </div>
            {quote.notes && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Notas
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {quote.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Resumen de importes
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal (sin IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(quote.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA</span>
              <span className="font-medium">
                {fmtMoneyGeneric(quote.taxAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total (con IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(quote.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento</span>
              <span className="font-medium text-red-600">
                -{fmtMoneyGeneric(quote.discountAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-800">Total final</span>
              <span className="font-semibold">
                {fmtMoneyGeneric(quote.totalWithDiscount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total en ARS</span>
              <span className="font-semibold">
                {quote.totalARS != null
                  ? fmtMoneyARS(quote.totalARS)
                  : '-'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Ítems de la cotización
          </h2>
          {quote.items.length === 0 ? (
            <p className="text-gray-600 text-sm">
              Esta cotización no tiene ítems guardados.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Producto
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Cant.
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Unitario
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      IVA %
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Subtotal
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {quote.items
                    .slice()
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-gray-800">
                          {item.sku}
                        </td>
                        <td className="px-3 py-2">
                          <div className="text-gray-900">{item.title}</div>
                          {item.description && (
                            <div className="text-xs text-gray-600">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {item.qty}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {fmtMoneyGeneric(item.unitPrice)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {item.taxRate.toFixed(2)}%
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {fmtMoneyGeneric(item.subtotal)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                          {fmtMoneyGeneric(item.total)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

