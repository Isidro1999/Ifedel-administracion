import { NextRequest, NextResponse } from 'next/server'
import { syncUsdArsRateFromBna } from '@/lib/exchange-rate/sync-from-bna'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function authorizeCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const header = request.headers.get('authorization')
  if (!header) return false
  return header === `Bearer ${secret}`
}

/**
 * Cron diario: sincroniza TC desde Banco Nación (Billetes USD Venta).
 * Auth: Authorization: Bearer ${CRON_SECRET}
 * No usa sesión de usuario. No acepta rate por query/body.
 */
export async function GET(request: NextRequest) {
  if (!authorizeCron(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await syncUsdArsRateFromBna()
    return NextResponse.json({
      status: result.status,
      rate: result.rate,
      previousRate: result.previousRate ?? undefined,
      providerDate: result.providerDate,
      providerTime: result.providerTime,
      ...(result.variation != null ? { variation: result.variation } : {}),
    })
  } catch (error) {
    console.error('BNA exchange rate cron failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json(
      { status: 'provider_unavailable', error: 'Sync failed' },
      { status: 500 },
    )
  }
}
