import { NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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

  const quote = await prisma.quote.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      sale: { select: { id: true } },
    },
  })

  if (!quote) {
    return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
  }

  if (quote.sale) {
    return NextResponse.json(
      {
        error:
          'No se puede cancelar una cotización ya vinculada a una venta.',
      },
      { status: 409 },
    )
  }

  if (quote.status === 'CANCELLED') {
    return NextResponse.json({ success: true, id, status: 'CANCELLED' })
  }

  await prisma.quote.update({
    where: { id },
    data: { status: 'CANCELLED' },
  })

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)

  return NextResponse.json({ success: true, id, status: 'CANCELLED' })
}
