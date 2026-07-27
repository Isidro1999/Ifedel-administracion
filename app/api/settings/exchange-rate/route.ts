import { NextResponse } from 'next/server'
import { requireApprovedSession } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Tipo de cambio USD/ARS — configuración interna del backoffice.
 * Requiere sesión APPROVED. La edición es admin vía /api/admin/settings/exchange-rate.
 */
export async function GET() {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

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
      { status: 500 },
    )
  }
}
