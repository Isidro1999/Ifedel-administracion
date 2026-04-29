import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { RegisterPaymentForm } from './RegisterPaymentForm'

interface ReceivableDetailPageProps {
  params: { id: string }
}

export default async function ReceivableDetailPage({
  params,
}: ReceivableDetailPageProps) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const receivable = await prisma.receivable.findUnique({
    where: { id },
    include: {
      sale: true,
      customer: true,
      payments: { orderBy: { paidAt: 'desc' } },
      installments: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!receivable) {
    notFound()
  }

  const clientLabel =
    receivable.customerCompany ||
    receivable.customerName ||
    receivable.customer?.company ||
    receivable.customer?.name ||
    'Sin datos de cliente'

  const fmtMoneyGeneric = (amount: number | null | undefined) => {
    if (amount == null || Number.isNaN(amount)) return '-'
    // Las cuentas por cobrar se expresan en ARS como moneda principal
    return fmtMoneyARS(amount)
  }

  const issuedAt =
    receivable.issuedAt instanceof Date
      ? receivable.issuedAt
      : new Date(receivable.issuedAt as any)
  const dueDate =
    receivable.dueDate instanceof Date
      ? receivable.dueDate
      : new Date(receivable.dueDate as any)

  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)
  const dueDateLabel = dueDate.toISOString().slice(0, 10)

  const today = new Date()
  const isOverdue =
    dueDate < today &&
    (receivable.status === 'PENDING' || receivable.status === 'PARTIAL') &&
    receivable.balance > 0

  const displayInstallments =
    receivable.installments.length > 0
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

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Cuenta por cobrar #{receivable.id}
            </h1>
            <p className="text-sm text-gray-600">
              Estado:{' '}
              <span className="font-medium uppercase">
                {receivable.status}
              </span>
            </p>
            {isOverdue && (
              <p className="mt-1 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                Vencida
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Link
              href="/receivables"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Volver al listado
            </Link>
            {receivable.sale && (
              <Link
                href={`/sales/${receivable.sale.id}`}
                className="rounded-md border border-ifedel-green px-4 py-2 text-sm text-ifedel-green hover:bg-ifedel-green/10"
              >
                Ver venta {receivable.sale.saleNumber}
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
            <h2 className="text-base font-semibold text-ifedel-black mb-1">
              Datos de la cuenta por cobrar
            </h2>
            <div className="flex justify-between">
              <span className="text-gray-600">ID</span>
              <span className="font-mono text-xs text-gray-900">
                #{receivable.id}
              </span>
            </div>
            {receivable.sale && (
              <div className="flex justify-between">
                <span className="text-gray-600">Venta asociada</span>
                <span className="font-mono text-xs text-ifedel-primary">
                  {receivable.sale.saleNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda</span>
              <span className="text-gray-900">{receivable.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Emitida</span>
              <span className="text-gray-900">{issuedAtLabel}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Vencimiento</span>
              <span className="text-gray-900">{dueDateLabel}</span>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm space-y-2">
            <h2 className="text-base font-semibold text-ifedel-black mb-1">
              Cliente
            </h2>
            <div className="space-y-1">
              <p className="text-gray-900">{clientLabel}</p>
              {receivable.customer?.email && (
                <p className="text-gray-700 text-xs">
                  Email: {receivable.customer.email}
                </p>
              )}
              {receivable.customer?.phone && (
                <p className="text-gray-700 text-xs">
                  Teléfono: {receivable.customer.phone}
                </p>
              )}
            </div>
            {receivable.notes && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  Notas
                </p>
                <p className="text-xs text-gray-700 whitespace-pre-line">
                  {receivable.notes}
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
              <span className="text-gray-600">Total a cobrar</span>
              <span className="font-medium">
                {fmtMoneyGeneric(receivable.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Cobrado</span>
              <span className="font-medium">
                {fmtMoneyGeneric(receivable.amountPaid)}
              </span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span className="text-gray-800">Saldo pendiente</span>
              <span className="font-semibold">
                {fmtMoneyGeneric(receivable.balance)}
              </span>
            </div>
          </div>
        </section>

        <RegisterPaymentForm
          receivableId={receivable.id}
          balance={receivable.balance}
          status={receivable.status}
        />

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Cuotas / vencimientos
          </h2>
          {receivable.installments.length === 0 && (
            <p className="mb-3 text-xs text-amber-700">
              Esta cuenta fue creada antes del módulo de cuotas. Se muestra una cuota única de referencia.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
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
                    const isInstallmentOverdue =
                      due < today &&
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
                          {isInstallmentOverdue && (
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
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
          <h2 className="text-base font-semibold text-ifedel-black mb-3">
            Cobros registrados
          </h2>
          {receivable.payments.length === 0 ? (
            <p className="text-gray-600 text-sm">
              Aún no hay cobros registrados para esta cuenta por cobrar.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Fecha
                    </th>
                    <th className="px-3 py-2 text-right font-semibold text-gray-700">
                      Monto
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Referencia
                    </th>
                    <th className="px-3 py-2 text-left font-semibold text-gray-700">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {receivable.payments.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-3 py-2 text-gray-900">
                        {new Date(p.paidAt).toISOString().slice(0, 10)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2 text-right font-medium text-gray-900">
                        {fmtMoneyARS(p.amount)}
                      </td>
                      <td className="px-3 py-2 text-gray-700">
                        {p.reference || '-'}
                      </td>
                      <td className="px-3 py-2 text-gray-600 text-xs">
                        {p.notes || '-'}
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

