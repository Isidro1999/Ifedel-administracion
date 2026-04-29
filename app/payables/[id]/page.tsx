import Link from 'next/link'
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { fmtMoneyARS } from '@/lib/format-money'
import { RegisterPayablePaymentForm } from './RegisterPayablePaymentForm'

interface PayableDetailPageProps {
  params: { id: string }
}

export default async function PayableDetailPage({
  params,
}: PayableDetailPageProps) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const payable = await prisma.payable.findUnique({
    where: { id },
    include: {
      supplier: true,
      purchase: true,
    },
  })

  if (!payable) {
    notFound()
  }

  const supplierLabel =
    payable.supplierCompany ||
    payable.supplierName ||
    payable.supplier?.company ||
    payable.supplier?.name ||
    'Sin datos de proveedor'

  const issuedAt =
    payable.issuedAt instanceof Date
      ? payable.issuedAt
      : new Date(payable.issuedAt as any)
  const dueDate =
    payable.dueDate instanceof Date
      ? payable.dueDate
      : new Date(payable.dueDate as any)

  const issuedAtLabel = issuedAt.toISOString().slice(0, 10)
  const dueDateLabel = dueDate.toISOString().slice(0, 10)

  const today = new Date()
  const isOverdue =
    dueDate < today &&
    (payable.status === 'PENDING' || payable.status === 'PARTIAL') &&
    payable.balance > 0

  return (
    <div className="min-h-screen p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-ifedel-black">
              Cuenta por pagar #{payable.id}
            </h1>
            <p className="text-sm text-gray-600">
              Estado:{' '}
              <span className="font-medium uppercase">
                {payable.status}
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
              href="/payables"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Volver al listado
            </Link>
            {payable.purchase && (
              <Link
                href={`/purchases/${payable.purchase.id}`}
                className="rounded-md border border-ifedel-green px-4 py-2 text-sm text-ifedel-green hover:bg-ifedel-green/10"
              >
                Ver compra {payable.purchase.purchaseNumber}
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-1 text-base font-semibold text-ifedel-black">
              Datos de la cuenta por pagar
            </h2>
            <div className="flex justify-between">
              <span className="text-gray-600">ID</span>
              <span className="font-mono text-xs text-gray-900">
                #{payable.id}
              </span>
            </div>
            {payable.purchase && (
              <div className="flex justify-between">
                <span className="text-gray-600">Compra asociada</span>
                <span className="font-mono text-xs text-ifedel-primary">
                  {payable.purchase.purchaseNumber}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Moneda</span>
              <span className="text-gray-900">{payable.currency}</span>
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

          <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-4 text-sm">
            <h2 className="mb-1 text-base font-semibold text-ifedel-black">
              Proveedor
            </h2>
            <p className="text-gray-900">{supplierLabel}</p>
            {payable.supplier?.email && (
              <p className="text-xs text-gray-700">
                Email: {payable.supplier.email}
              </p>
            )}
            {payable.supplier?.phone && (
              <p className="text-xs text-gray-700">
                Teléfono: {payable.supplier.phone}
              </p>
            )}
            {payable.notes && (
              <div className="mt-3 border-t border-gray-200 pt-2">
                <p className="mb-1 text-xs font-semibold text-gray-700">
                  Notas
                </p>
                <p className="whitespace-pre-line text-xs text-gray-700">
                  {payable.notes}
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
              <span className="text-gray-600">Total a pagar</span>
              <span className="font-medium">
                {fmtMoneyARS(payable.totalAmount)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pagado</span>
              <span className="font-medium">
                {fmtMoneyARS(payable.amountPaid)}
              </span>
            </div>
            <div className="mt-2 flex justify-between border-t border-gray-200 pt-2">
              <span className="text-gray-800">Saldo pendiente</span>
              <span className="font-semibold">
                {fmtMoneyARS(payable.balance)}
              </span>
            </div>
          </div>
        </section>

        <RegisterPayablePaymentForm
          payableId={payable.id}
          balance={payable.balance}
          status={payable.status}
        />
      </div>
    </div>
  )
}

