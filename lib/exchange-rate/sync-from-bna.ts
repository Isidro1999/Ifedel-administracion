import { getUsdArsRateSettings } from '@/lib/exchange-rate/get-usd-ars-rate'
import {
  fetchBnaUsdBilleteVenta,
  BnaFetchError,
} from '@/lib/exchange-rate/bna-client'
import { BnaParseError } from '@/lib/exchange-rate/parse-bna-exchange-rate'
import {
  dateKeyFromUtcDate,
  todayDateKeyInArgentina,
} from '@/lib/exchange-rate/normalize'
import { EXCHANGE_RATE_SOURCES } from '@/lib/exchange-rate/sources'
import { updateUsdArsRate } from '@/lib/exchange-rate/update-exchange-rate'

export const BNA_VARIATION_MAX = 0.2

export type BnaSyncStatus =
  | 'updated'
  | 'unchanged'
  | 'stale_provider_data'
  | 'variation_blocked'
  | 'invalid_provider_data'
  | 'provider_unavailable'

export type BnaSyncResult = {
  status: BnaSyncStatus
  rate: number | null
  previousRate: number | null
  providerDate: string | null
  providerTime: string | null
  variation?: number
  message?: string
}

function formatProviderDateKey(d: Date): string {
  return dateKeyFromUtcDate(d)
}

function logSync(
  event:
    | 'updated'
    | 'unchanged'
    | 'stale'
    | 'variation_blocked'
    | 'provider_unavailable'
    | 'invalid_provider_data',
  payload: Record<string, unknown>,
) {
  const labels: Record<typeof event, string> = {
    updated: 'BNA exchange rate sync updated',
    unchanged: 'BNA exchange rate sync unchanged',
    stale: 'BNA exchange rate sync stale provider data',
    variation_blocked: 'BNA exchange rate sync blocked by variation safeguard',
    provider_unavailable: 'BNA exchange rate provider unavailable',
    invalid_provider_data: 'BNA exchange rate invalid provider data',
  }
  console.info(labels[event], payload)
}

/**
 * Sincroniza Settings.usdArsRate desde BNA (Billetes → USD → Venta).
 * Reutiliza updateUsdArsRate; no duplica persistencia.
 */
export async function syncUsdArsRateFromBna(opts?: {
  now?: Date
}): Promise<BnaSyncResult> {
  const now = opts?.now ?? new Date()
  const settings = await getUsdArsRateSettings()
  const previousRate = settings.usdArsRate

  let parsed
  try {
    parsed = await fetchBnaUsdBilleteVenta()
  } catch (err) {
    if (err instanceof BnaFetchError) {
      logSync('provider_unavailable', {
        reason: err.message,
        status: err.status ?? null,
      })
      return {
        status: 'provider_unavailable',
        rate: previousRate,
        previousRate,
        providerDate: null,
        providerTime: null,
        message: err.message,
      }
    }
    if (err instanceof BnaParseError) {
      logSync('invalid_provider_data', { code: err.code })
      return {
        status: 'invalid_provider_data',
        rate: previousRate,
        previousRate,
        providerDate: null,
        providerTime: null,
        message: err.message,
      }
    }
    logSync('provider_unavailable', {
      reason: err instanceof Error ? err.message : 'unknown',
    })
    return {
      status: 'provider_unavailable',
      rate: previousRate,
      previousRate,
      providerDate: null,
      providerTime: null,
    }
  }

  const providerDateKey = formatProviderDateKey(parsed.providerDate)
  const todayKey = todayDateKeyInArgentina(now)

  if (providerDateKey < todayKey) {
    logSync('stale', {
      providerDate: providerDateKey,
      providerTime: parsed.providerTime,
      today: todayKey,
      rate: parsed.rate,
    })
    return {
      status: 'stale_provider_data',
      rate: previousRate,
      previousRate,
      providerDate: providerDateKey,
      providerTime: parsed.providerTime,
    }
  }

  if (providerDateKey > todayKey) {
    logSync('invalid_provider_data', {
      providerDate: providerDateKey,
      today: todayKey,
    })
    return {
      status: 'invalid_provider_data',
      rate: previousRate,
      previousRate,
      providerDate: providerDateKey,
      providerTime: parsed.providerTime,
      message: 'Fecha BNA posterior al día actual',
    }
  }

  if (
    previousRate != null &&
    previousRate > 0 &&
    Number.isFinite(previousRate)
  ) {
    const variation = Math.abs(parsed.rate - previousRate) / previousRate
    if (variation > BNA_VARIATION_MAX) {
      logSync('variation_blocked', {
        previousRate,
        candidateRate: parsed.rate,
        variation,
      })
      return {
        status: 'variation_blocked',
        rate: previousRate,
        previousRate,
        providerDate: providerDateKey,
        providerTime: parsed.providerTime,
        variation,
      }
    }
  }

  const result = await updateUsdArsRate({
    rate: parsed.rate,
    source: EXCHANGE_RATE_SOURCES.BNA,
    effectiveDate: parsed.providerDate,
    providerDate: parsed.providerDate,
    providerTime: parsed.providerTime,
    createdByUserId: null,
  })

  if (!result.changed) {
    logSync('unchanged', {
      rate: result.rate,
      providerDate: providerDateKey,
      providerTime: parsed.providerTime,
    })
    return {
      status: 'unchanged',
      rate: result.rate,
      previousRate: result.previousRate,
      providerDate: providerDateKey,
      providerTime: parsed.providerTime,
    }
  }

  logSync('updated', {
    rate: result.rate,
    providerDate: providerDateKey,
    providerTime: parsed.providerTime,
  })

  return {
    status: 'updated',
    rate: result.rate,
    previousRate: result.previousRate,
    providerDate: providerDateKey,
    providerTime: parsed.providerTime,
  }
}
