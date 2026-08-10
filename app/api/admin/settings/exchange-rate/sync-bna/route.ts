import { NextResponse } from 'next/server'
import { syncUsdArsRateFromBna } from '@/lib/exchange-rate/sync-from-bna'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * ADMIN: consulta BNA manualmente (misma lógica que el cron).
 * No usa CRON_SECRET. No acepta rate del cliente.
 */
export async function POST() {
  const { requireAdminSession } = await import('@/lib/admin-auth')
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const result = await syncUsdArsRateFromBna()
    return NextResponse.json({
      status: result.status,
      rate: result.rate,
      previousRate: result.previousRate,
      providerDate: result.providerDate,
      providerTime: result.providerTime,
      ...(result.variation != null ? { variation: result.variation } : {}),
    })
  } catch (error) {
    console.error('BNA admin sync failed', {
      message: error instanceof Error ? error.message : 'unknown',
    })
    return NextResponse.json(
      {
        status: 'provider_unavailable',
        error: 'No pudimos consultar Banco Nación',
      },
      { status: 500 },
    )
  }
}
