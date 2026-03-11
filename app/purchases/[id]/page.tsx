import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtMoneyUSD, fmtMoneyARS, fmtNumberAR } from '@/lib/format-money'

interface PurchaseDetailPageProps {
  params: { id: string }
}

export default async function PurchaseDetailPage({
  params,
}: PurchaseDetailPageProps) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const purchase = await prisma.purchase.findUnique({
    where: { id },
    include: {
      supplier: true,
      createdBy: true,
      items: { orderBy: { sortOrder: 'asc' } },
      payable: true,
    },
  })

  if (!purchase) {
    notFound()
  }

  const supplierLabel =
    purchase.supplierCompany ||
    purchase.supplierName ||
    purchase.supplier?.company ||
    purchase.supplier?.name ||
    'Sin datos de proveedor'

  const createdByLabel =
    purchase.createdBy?.email || purchase.createdBy?.name || 'Desconocido'

  const issuedAt =
    purchase.issuedAt instanceof Date
      ? purchase.issuedAt
      : new Date(purchase.issuedAt as any)
  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)

  const currencyLabel = purchase.currency

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
              Compra {purchase.purchaseNumber}
            </h1>
            <p className="text-sm text-gray-600">
              Estado:{' '}
              <span className="font-medium uppercase">
                {purchase.status}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/purchases"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Volver al listado
            </Link>
            {purchase.payable && (
              <Link
                href={`/payables/${purchase.payable.id}`}
                className="rounded-md border border-ifedel-green px-4 py-2 text-sm text-ifedel-green hover:bg-ifedel-green/10"
              >
                Ver cuenta por pagar #{purchase.payable.id}
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-1 text-base font-semibold text-ifedel-black">
              Datos de la compra
            </h2>
            <div className="flex justify-between">
              <span className="text-gray-600">N° compra</span>
              <span className="font-mono text-xs text-gray-900">
                {purchase.purchaseNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emitida</span>
              <span className="text-gray-900">{issuedAtLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda</span>
              <span className="text-gray-900">{purchase.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">
                Tipo de cambio (ARS por {purchase.currency})
              </span>
              <span className="text-gray-900">
                {purchase.exchangeRateARS != null
                  ? fmtNumberAR(purchase.exchangeRateARS)
                  : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento (%)</span>
              <span className="text-gray-900">
                {purchase.discountPct.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-600">Registrada por</span>
              <span className="text-gray-900">{createdByLabel}</span>
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-1 text-base font-semibold text-ifedel-black">
              Proveedor
            </h2>
            <p className="text-gray-900">{supplierLabel}</p>
            {purchase.supplierEmail && (
              <p className="text-xs text-gray-700">
                Email: {purchase.supplierEmail}
              </p>
            )}
            {purchase.supplierPhone && (
              <p className="text-xs text-gray-700">
                Teléfono: {purchase.supplierPhone}
              </p>
            )}
            {purchase.notes && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Notas
                </p>
                <p className="whitespace-pre-line text-xs text-gray-700">
                  {purchase.notes}
                </p>
              </div>
            )}
          </div>
        </div>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-base font-semibold text-ifedel-black">
            Resumen de importes
          </h2>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal (sin IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(purchase.subtotal)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">IVA</span>
              <span className="font-medium">
                {fmtMoneyGeneric(purchase.taxAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total (con IVA)</span>
              <span className="font-medium">
                {fmtMoneyGeneric(purchase.total)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Descuento</span>
              <span className="font-medium text-red-600">
                -{fmtMoneyGeneric(purchase.discountAmount)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-800">Total final</span>
              <span className="font-semibold">
                {fmtMoneyGeneric(purchase.totalWithDiscount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total en ARS</span>
              <span className="font-semibold">
                {purchase.totalARS != null
                  ? fmtMoneyARS(purchase.totalARS)
                  : '-'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="mb-3 text-base font-semibold text-ifedel-black">
            Ítems de la compra
          </h2>
          {purchase.items.length === 0 ? (
            <p className="text-sm text-gray-600">
              Esta compra no tiene ítems registrados.
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
                      Descripción
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Cant.
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Costo unitario
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
                  {purchase.items.map((item) => (
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
                        {fmtMoneyGeneric(item.unitCost)}
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

