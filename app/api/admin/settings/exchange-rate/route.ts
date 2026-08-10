import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import {
  EXCHANGE_RATE_SOURCES,
  UpdateUsdArsRateBodySchema,
  updateUsdArsRate,
} from '@/lib/exchange-rate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  const { requireAdminSession } = await import('@/lib/admin-auth')
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const body = await request.json().catch(() => null)
    const parsed = UpdateUsdArsRateBodySchema.safeParse(body)
    if (!parsed.success) {
      const message =
        parsed.error.issues[0]?.message || 'usdArsRate inválido'
      return NextResponse.json({ error: message }, { status: 400 })
    }

    const result = await updateUsdArsRate({
      rate: parsed.data.usdArsRate,
      source: EXCHANGE_RATE_SOURCES.MANUAL,
      createdByUserId: gate.userId,
      effectiveDate: new Date(),
    })

    return NextResponse.json({
      usdArsRate: result.rate,
      updatedAt: result.updatedAt,
      changed: result.changed,
      previousRate: result.previousRate,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 },
      )
    }
    console.error('Error updating exchange rate:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tipo de cambio' },
      { status: 500 },
    )
  }
}
