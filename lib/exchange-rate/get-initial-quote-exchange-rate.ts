import { getUsdArsRateSettings } from '@/lib/exchange-rate/get-usd-ars-rate'

export class InvalidQuoteExchangeRateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidQuoteExchangeRateError'
  }
}

const MAX_RATE = 1_000_000

export function isValidQuoteExchangeRate(rate: unknown): rate is number {
  return (
    typeof rate === 'number' &&
    Number.isFinite(rate) &&
    rate > 0 &&
    rate < MAX_RATE
  )
}

/**
 * TC global vigente para snapshot de una Quote nueva.
 * Solo lee Settings — no consulta BNA ni cron.
 * @throws InvalidQuoteExchangeRateError si no hay TC válido
 */
export async function getInitialQuoteExchangeRate(): Promise<number> {
  const { usdArsRate } = await getUsdArsRateSettings()
  if (!isValidQuoteExchangeRate(usdArsRate)) {
    throw new InvalidQuoteExchangeRateError(
      'No se pudo crear la cotización porque el tipo de cambio vigente no es válido. Revisalo en Configuración.',
    )
  }
  return usdArsRate
}
