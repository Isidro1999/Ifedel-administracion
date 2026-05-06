import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PAID_EPS = 0.01

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const admin = await requireAdminSession()
  if (!admin.ok) return admin.response

  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const { prisma } = await import('@/lib/prisma')

  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      receivable: {
        include: {
          _count: { select: { payments: true } },
          installments: { select: { id: true, amountPaid: true } },
        },
      },
    },
  })

  if (!sale) {
    return NextResponse.json({ error: 'Venta no encontrada' }, { status: 404 })
  }

  if (sale.status === 'CANCELLED') {
    return NextResponse.json({ success: true, id, status: 'CANCELLED' })
  }

  const r = sale.receivable
  if (r) {
    if (r._count.payments > 0) {
      return NextResponse.json(
        {
          error:
            'No se puede anular: la venta tiene cobros registrados. Revertí o ajustá caja/cobranzas con un flujo manual antes de anular.',
        },
        { status: 409 },
      )
    }
    if (r.amountPaid > PAID_EPS) {
      return NextResponse.json(
        {
          error:
            'No se puede anular: la cuenta por cobrar tiene monto cobrado distinto de cero.',
        },
        { status: 409 },
      )
    }
    const orphanPaid = r.installments.some((i) => i.amountPaid > PAID_EPS)
    if (orphanPaid) {
      return NextResponse.json(
        {
          error:
            'No se puede anular: hay cuotas con cobro imputado sin consistencia con pagos.',
        },
        { status: 409 },
      )
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.sale.update({
      where: { id },
      data: { status: 'CANCELLED' },
    })

    if (!r) return

    await tx.receivableInstallment.updateMany({
      where: { receivableId: r.id },
      data: {
        status: 'CANCELLED',
        balance: 0,
      },
    })

    await tx.receivable.update({
      where: { id: r.id },
      data: {
        status: 'CANCELLED',
        balance: 0,
      },
    })
  })

  revalidatePath('/sales')
  revalidatePath(`/sales/${id}`)
  revalidatePath('/receivables')
  if (r) {
    revalidatePath(`/receivables/${r.id}`)
  }

  return NextResponse.json({ success: true, id, status: 'CANCELLED' })
}
