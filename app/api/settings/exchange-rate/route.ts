import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
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

