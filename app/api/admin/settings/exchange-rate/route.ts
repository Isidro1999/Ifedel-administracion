import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(request: NextRequest) {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const body = await request.json()
    const { usdArsRate } = body as { usdArsRate?: number }

    if (typeof usdArsRate !== 'number' || !isFinite(usdArsRate) || usdArsRate <= 0) {
      return NextResponse.json(
        { error: 'usdArsRate debe ser un número positivo' },
        { status: 400 }
      )
    }

    const settings = await prisma.settings.upsert({
      where: { id: 1 },
      create: {
        id: 1,
        usdArsRate,
      },
      update: {
        usdArsRate,
      },
    })

    return NextResponse.json({
      usdArsRate: settings.usdArsRate,
      updatedAt: settings.updatedAt,
    })
  } catch (error) {
    console.error('Error updating exchange rate:', error)
    return NextResponse.json(
      { error: 'Error al actualizar tipo de cambio' },
      { status: 500 }
    )
  }
}

