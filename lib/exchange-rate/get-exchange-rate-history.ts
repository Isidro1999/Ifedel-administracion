import { prisma } from '@/lib/prisma'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100

export type ExchangeRateHistoryItem = {
  id: number
  rate: number
  currencyBase: string
  currencyQuote: string
  source: string
  effectiveDate: Date
  providerDate: Date | null
  providerTime: string | null
  previousRate: number | null
  createdAt: Date
  createdByUserId: string | null
  createdBy: {
    id: string
    name: string | null
    email: string | null
  } | null
}

/**
 * Historial de TC ordenado por createdAt desc.
 * Solo para backoffice (no exponer en APIs públicas).
 */
export async function getExchangeRateHistory(opts?: {
  limit?: number
}): Promise<ExchangeRateHistoryItem[]> {
  const raw = opts?.limit ?? DEFAULT_LIMIT
  const limit = Math.min(
    Math.max(1, Number.isFinite(raw) ? Math.floor(raw) : DEFAULT_LIMIT),
    MAX_LIMIT,
  )

  return prisma.exchangeRateHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: {
      id: true,
      rate: true,
      currencyBase: true,
      currencyQuote: true,
      source: true,
      effectiveDate: true,
      providerDate: true,
      providerTime: true,
      previousRate: true,
      createdAt: true,
      createdByUserId: true,
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  })
}
