import { NextResponse } from 'next/server'
import { requireApprovedSession } from '@/lib/session-auth'
import { getUsdArsRateSettings } from '@/lib/exchange-rate'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * Tipo de cambio USD/ARS — configuración interna del backoffice.
 * Requiere sesión APPROVED. La edición es admin vía /api/admin/settings/exchange-rate.
 */
export async function GET() {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  try {
    const settings = await getUsdArsRateSettings()
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
