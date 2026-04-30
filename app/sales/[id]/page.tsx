import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'
import { RegisterPaymentForm } from '@/app/receivables/[id]/RegisterPaymentForm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface SalesDetailPageProps {
  params: { id: string }
}

export default async function SaleDetailPage({ params }: SalesDetailPageProps) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      quote: true,
      receivable: {
        include: {
          installments: {
            orderBy: { order: 'asc' },
          },
        },
      },
      createdBy: true,
      items: { orderBy: { sortOrder: 'asc' } },
    },
  })

  if (!sale) {
    notFound()
  }

  const clientLabel =
    sale.customerCompany ||
    sale.customerName ||
    sale.customerEmail ||
    sale.customerPhone ||
    'Sin datos de cliente'

  const createdByLabel =
    sale.createdBy?.email || sale.createdBy?.name || 'Desconocido'

  const issuedAt =
    sale.issuedAt instanceof Date
      ? sale.issuedAt
        : new Date(sale.issuedAt as Date)
  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

  const currencyLabel = sale.currency

  const fmtMoneyGeneric = (amount: number | null | undefined) => {
    if (amount == null || Number.isNaN(amount)) return '-'
    if (currencyLabel === 'USD') return fmtMoneyUSD(amount)
    if (currencyLabel === 'ARS') return fmtMoneyARS(amount)
    return `${currencyLabel} ${fmtNumberAR(amount)}`
  }

  const receivable = sale.receivable
  const hasReceivable = !!receivable
  const receivableBalance = receivable?.balance ?? null
  const receivableStatus = receivable?.status ?? null
  const displayInstallments = receivable
    ? receivable.installments.length > 0
      ? receivable.installments
      : [
          {
            id: -1,
            order: 0,
            dueDate: receivable.dueDate,
            amount: receivable.totalAmount,
            amountPaid: receivable.amountPaid,
            balance: receivable.balance,
            status: receivable.status,
            label: 'Cuota única (legacy)',
          },
        ]
    : []

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Venta {sale.saleNumber}
            </h1>
            <p className="text-sm text-gray-600">
              Estado: <span className="font-medium">{sale.status}</span>
            </p>
            {sale.paymentTermLabelSnapshot && (
              <p className="text-xs text-gray-600 mt-1">
                Condición de pago:{' '}
                <span className="font-medium">
                  {sale.paymentTermLabelSnapshot} ({sale.paymentTermCodeSnapshot})
                </span>
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/quotes"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cotizaciones
            </Link>
            {sale.quote && (
              <Link
                href={`/quotes/${sale.quote.id}`}
                className="rounded-md border border-ifedel-primary px-4 py-2 text-sm font-medium text-ifedel-brown hover:bg-ifedel-primary/10"
              >
                Ver cotización {sale.quote.quoteNumber}
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
            <h2 className="text-base font-semibold text-ifedel-black mb-1">
              Datos de la venta
            </h2>
            <div className="flex justify-between">
              <span className="text-gray-600">N° venta</span>
              <span className="font-mono text-xs text-gray-900">
                {sale.saleNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emitida</span>
              <span className="text-gray-900">{issuedAtLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda</span>
              <span className="text-gray-900">{sale.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tipo de cambio (ARS por {sale.currency})</span>
              <span className="text-gray-900">
                {sale.exchangeRateARS != null
                  ? fmtNumberAR(sale.exchangeRateARS)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento (%)</span>
              <span className="text-gray-900">
                {sale.discountPct.toFixed(2)}%
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
              {sale.customerEmail && (
                <p className="text-gray-700 text-xs">
                  Email: {sale.customerEmail}
                </p>
              )}
              {sale.customerPhone && (
                <p className="text-gray-700 text-xs">
                  Teléfono: {sale.customerPhone}
                </p>
              )}
            </div>
            {sale.notes && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Notas
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {sale.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {hasReceivable && receivable && (
          <>
          <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-3 text-base font-semibold text-ifedel-black">
              Estado de cobranza
            </h2>
            <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
              <div className="space-y-1">
                <p className="text-sm text-gray-700">
                  Cuenta por cobrar vinculada:{' '}
                  <span className="font-mono text-xs text-ifedel-primary">
                    #{receivable.id}
                  </span>
                </p>
                <p className="text-sm text-gray-700">
                  Estado:{' '}
                  <span className="font-semibold uppercase">
                    {receivableStatus}
                  </span>
                </p>
                {receivableBalance != null && (
                  <p className="text-sm text-gray-700">
                    Saldo pendiente:{' '}
                    <span className="font-semibold">
                      {fmtMoneyARS(receivableBalance)}
                    </span>
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/receivables/${receivable.id}`}
                  className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  Ir al detalle de cobranza
                </Link>
                <Link
                  href="/receivables"
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Ver todas las cuentas por cobrar
                </Link>
              </div>
            </div>
            <div className="mt-4">
                <h3 className="mb-2 text-sm font-semibold text-ifedel-black">
                  Cuotas / vencimientos
                </h3>
                {receivable.installments.length === 0 && (
                  <p className="mb-2 text-xs text-amber-700">
                    Venta legacy: se muestra una cuota única de referencia hasta completar el backfill.
                  </p>
                )}
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">
                          N°
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">
                          Fecha vencimiento
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                          Monto
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                          Pagado
                        </th>
                        <th className="px-3 py-2 text-right font-semibold text-gray-700">
                          Saldo
                        </th>
                        <th className="px-3 py-2 text-left font-semibold text-gray-700">
                          Estado
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayInstallments.map((inst, idx) => {
                        const due =
                          inst.dueDate instanceof Date
                            ? inst.dueDate
                            : new Date(inst.dueDate as any)
                        const dueLabel = due.toISOString().slice(0, 10)
                        const now = new Date()
                        const isOverdue =
                          due < now &&
                          (inst.status === 'PENDING' || inst.status === 'PARTIAL') &&
                          inst.balance > 0
                        return (
                          <tr key={inst.id} className="hover:bg-gray-50">
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {idx + 1}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              {dueLabel}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                              {fmtMoneyARS(inst.amount)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                              {fmtMoneyARS(inst.amountPaid)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-right text-gray-900">
                              {fmtMoneyARS(inst.balance)}
                            </td>
                            <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                              <span className="font-medium">{inst.status}</span>
                              {isOverdue && (
                                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                                  VENCIDA
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
            </div>
          </section>

          <RegisterPaymentForm
            receivableId={receivable.id}
            balance={receivable.balance}
            status={receivable.status}
          />
          </>
        )}

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Resumen de importes
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal (sin IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(sale.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA</span>
              <span className="font-medium">
                {fmtMoneyGeneric(sale.taxAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total (con IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(sale.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento</span>
              <span className="font-medium text-red-600">
                -{fmtMoneyGeneric(sale.discountAmount)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-800">Total final (ARS)</span>
              <span className="font-semibold">
                {sale.totalARS != null
                  ? fmtMoneyARS(sale.totalARS)
                  : fmtMoneyGeneric(sale.totalWithDiscount)}
              </span>
            </div>
            {sale.currency === 'USD' && (
              <div className="flex justify-between">
                <span className="text-gray-600">Referencia en USD</span>
                <span className="font-medium text-gray-700">
                  {fmtMoneyUSD(sale.totalWithDiscount)}
                </span>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Ítems de la venta
          </h2>
          {sale.items.length === 0 ? (
            <p className="text-gray-600 text-sm">
              Esta venta no tiene ítems.
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
                  {sale.items.map((item) => (
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
