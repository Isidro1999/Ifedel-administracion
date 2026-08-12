import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { requireApprovedSession } from '@/lib/session-auth'
import { isValidQuoteExchangeRate } from '@/lib/exchange-rate/get-initial-quote-exchange-rate'
import { recomputeQuoteTotalARS } from '@/lib/quotes/quote-totals'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const PatchQuoteExchangeRateSchema = z.object({
  exchangeRateARS: z
    .number({
      required_error: 'exchangeRateARS es obligatorio',
      invalid_type_error: 'exchangeRateARS debe ser un número',
    })
    .finite({ message: 'exchangeRateARS debe ser finito' })
    .positive({ message: 'exchangeRateARS debe ser positivo' })
    .lt(1_000_000, { message: 'exchangeRateARS supera el límite permitido' }),
})

/**
 * Actualiza el snapshot TC de una cotización existente y recalcula totalARS.
 * No toca Settings. No aplica safeguard BNA.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const parsed = PatchQuoteExchangeRateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message || 'Datos inválidos',
      },
      { status: 400 },
    )
  }

  const exchangeRateARS = parsed.data.exchangeRateARS
  if (!isValidQuoteExchangeRate(exchangeRateARS)) {
    return NextResponse.json(
      { error: 'exchangeRateARS inválido' },
      { status: 400 },
    )
  }

  const { prisma } = await import('@/lib/prisma')

  const quote = await prisma.quote.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalWithDiscount: true,
      sale: { select: { id: true } },
    },
  })

  if (!quote) {
    return NextResponse.json(
      { error: 'Cotización no encontrada' },
      { status: 404 },
    )
  }

  if (quote.status === 'CANCELLED') {
    return NextResponse.json(
      { error: 'No se puede editar una cotización cancelada' },
      { status: 409 },
    )
  }

  if (quote.sale) {
    return NextResponse.json(
      {
        error:
          'No se puede editar el tipo de cambio de una cotización ya convertida en venta',
      },
      { status: 409 },
    )
  }

  let totalARS: number
  try {
    totalARS = recomputeQuoteTotalARS(
      quote.totalWithDiscount,
      exchangeRateARS,
    )
  } catch {
    return NextResponse.json(
      { error: 'No se pudieron recalcular los totales' },
      { status: 400 },
    )
  }

  const updated = await prisma.quote.update({
    where: { id },
    data: {
      exchangeRateARS,
      totalARS,
    },
    select: {
      id: true,
      exchangeRateARS: true,
      totalARS: true,
      totalWithDiscount: true,
    },
  })

  revalidatePath('/quotes')
  revalidatePath(`/quotes/${id}`)

  return NextResponse.json({
    success: true,
    id: updated.id,
    exchangeRateARS: updated.exchangeRateARS,
    totalARS: updated.totalARS,
    totalWithDiscount: updated.totalWithDiscount,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const { requireAdminSession } = await import('@/lib/admin-auth')
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
