/** Fuentes conocidas del tipo de cambio USD → ARS. */
export const EXCHANGE_RATE_SOURCES = {
  MANUAL: 'MANUAL',
  BNA: 'BNA',
} as const

export type ExchangeRateSource =
  (typeof EXCHANGE_RATE_SOURCES)[keyof typeof EXCHANGE_RATE_SOURCES]

const SOURCE_LABELS: Record<ExchangeRateSource, string> = {
  MANUAL: 'Manual',
  BNA: 'Banco Nación',
}

export function exchangeRateSourceLabel(source: string): string {
  if (source in SOURCE_LABELS) {
    return SOURCE_LABELS[source as ExchangeRateSource]
  }
  return source
}
