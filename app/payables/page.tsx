import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'

export default async function PayablesListPage() {
  const payables = await prisma.payable.findMany({
    orderBy: { dueDate: 'asc' },
    include: {
      supplier: true,
      purchase: true,
    },
  })

  const today = new Date()

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Cuentas por pagar
            </h1>
            <p className="text-sm text-gray-600">
              Deudas con proveedores originadas en compras registradas.
            </p>
          </div>
        </div>

        {payables.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600">
            Todavía no hay cuentas por pagar registradas.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Compra
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Proveedor
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Emitida
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Vence
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Total (ARS)
                  </th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-700">
                    Saldo (ARS)
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Estado
                  </th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-700">
                    Overdue
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
                    <tr key={p.id} className="hover:bg-gray-50">
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
                      <td className="whitespace-nowrap px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-700">
                        {p.status}
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

