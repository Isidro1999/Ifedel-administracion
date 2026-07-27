import { NextResponse } from 'next/server'
import { requireApprovedSession } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Condiciones de pago — uso interno (cotizaciones / compras).
 * Requiere sesión APPROVED.
 */
export async function GET() {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  const { prisma } = await import('@/lib/prisma')
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
  } catch (error: unknown) {
    console.error('Error fetching payment terms', error)
    return NextResponse.json(
      { error: 'No se pudieron obtener las condiciones de pago' },
      { status: 500 },
    )
  }
}
