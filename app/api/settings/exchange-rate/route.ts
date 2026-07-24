import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const { prisma } = await import('@/lib/prisma')
  try {
    const settings = await prisma.settings.findFirst()

    if (!settings) {
      return NextResponse.json({
        usdArsRate: null,
        updatedAt: null,
      })
    }

    return NextResponse.json({
      usdArsRate: settings.usdArsRate,
      updatedAt: settings.updatedAt,
    })
  } catch (error) {
    console.error('Error fetching exchange rate:', error)
    return NextResponse.json(
      { error: 'Error al obtener tipo de cambio' },
      { status: 500 }
    )
  }
}

