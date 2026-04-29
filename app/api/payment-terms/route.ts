import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const terms = await prisma.paymentTerm.findMany({
      where: { isActive: true },
      orderBy: [{ isDefault: 'desc' }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        label: true,
      },
    })

    return NextResponse.json({ terms })
  } catch (error: any) {
    console.error('Error fetching payment terms', error)
    return NextResponse.json(
      { error: 'No se pudieron obtener las condiciones de pago' },
      { status: 500 }
    )
  }
}

