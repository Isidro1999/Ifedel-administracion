import {
  getUsdArsRateSettings,
  type SettingsDbClient,
} from '@/lib/exchange-rate/get-usd-ars-rate'

export class InvalidQuoteExchangeRateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'InvalidQuoteExchangeRateError'
  }
}

/** Alias semántico: el error aplica a cualquier documento que herede TC. */
export const InvalidUsdArsExchangeRateError = InvalidQuoteExchangeRateError

const MAX_RATE = 1_000_000

export function isValidQuoteExchangeRate(rate: unknown): rate is number {
  return (
    typeof rate === 'number' &&
    Number.isFinite(rate) &&
    rate > 0 &&
    rate < MAX_RATE
  )
}

/** Alias: validación de TC USD/ARS (misma regla que cotizaciones). */
export const isValidUsdArsExchangeRate = isValidQuoteExchangeRate

export type GetInitialUsdArsExchangeRateOptions = {
  /** Prisma global o `tx` — evita leer Settings con cliente global dentro de `$transaction`. */
  db?: SettingsDbClient
  invalidMessage?: string
}

/**
 * TC global vigente (Settings.usdArsRate) para snapshot de un documento nuevo.
 * Solo lee Settings — no consulta BNA ni cron.
 * @throws InvalidQuoteExchangeRateError si no hay TC válido
 */
export async function getInitialUsdArsExchangeRate(
  options?: GetInitialUsdArsExchangeRateOptions,
): Promise<number> {
  const { usdArsRate } = await getUsdArsRateSettings(options?.db)
  if (!isValidQuoteExchangeRate(usdArsRate)) {
    throw new InvalidQuoteExchangeRateError(
      options?.invalidMessage ??
        'No hay un tipo de cambio USD/ARS configurado. Actualizalo en Configuración.',
    )
  }
  return usdArsRate
}

/**
 * TC global vigente para snapshot de una Quote nueva.
 * @throws InvalidQuoteExchangeRateError si no hay TC válido
 */
export async function getInitialQuoteExchangeRate(
  db?: SettingsDbClient,
): Promise<number> {
  return getInitialUsdArsExchangeRate({
    db,
    invalidMessage:
      'No se pudo crear la cotización porque el tipo de cambio vigente no es válido. Revisalo en Configuración.',
  })
}

/**
 * TC global vigente para snapshot de una Purchase nueva.
 * @throws InvalidQuoteExchangeRateError si no hay TC válido
 */
export async function getInitialPurchaseExchangeRate(
  db?: SettingsDbClient,
): Promise<number> {
  return getInitialUsdArsExchangeRate({
    db,
    invalidMessage:
      'No hay un tipo de cambio USD/ARS configurado. Actualizalo en Configuración antes de crear la compra.',
  })
}
