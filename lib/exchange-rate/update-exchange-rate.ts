import { revalidateTag } from 'next/cache'
import type { ExchangeRateHistory } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  EXCHANGE_RATE_SOURCES,
  type ExchangeRateSource,
} from '@/lib/exchange-rate/sources'

const SETTINGS_ID = 1
/** Debe coincidir con FINANCIAL_SETTINGS_TAG en lib/financial-settings.ts */
const FINANCIAL_SETTINGS_TAG = 'financial-settings'

export type UpdateUsdArsRateInput = {
  rate: number
  source: ExchangeRateSource
  effectiveDate?: Date
  providerDate?: Date | null
  providerTime?: string | null
  createdByUserId?: string | null
}

export type UpdateUsdArsRateResult =
  | {
      changed: false
      rate: number
      previousRate: number | null
      updatedAt: Date | null
      history: null
    }
  | {
      changed: true
      rate: number
      previousRate: number | null
      updatedAt: Date
      history: ExchangeRateHistory
    }

function assertValidRate(rate: number): void {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
    throw new Error('rate debe ser un número finito y positivo')
  }
  if (rate >= 1_000_000) {
    throw new Error('rate supera el límite técnico permitido')
  }
}

/**
 * Actualiza el TC global (`Settings.usdArsRate`) y registra historial auditable.
 * Idempotente: si `rate` es exactamente igual al vigente, no escribe historial.
 */
export async function updateUsdArsRate(
  input: UpdateUsdArsRateInput,
): Promise<UpdateUsdArsRateResult> {
  assertValidRate(input.rate)

  if (
    input.source !== EXCHANGE_RATE_SOURCES.MANUAL &&
    input.source !== EXCHANGE_RATE_SOURCES.BNA
  ) {
    throw new Error(`source inválido: ${input.source}`)
  }

  const effectiveDate = input.effectiveDate ?? new Date()
  const providerDate =
    input.providerDate === undefined ? null : input.providerDate
  const providerTime =
    input.providerTime === undefined ? null : input.providerTime
  const createdByUserId =
    input.source === EXCHANGE_RATE_SOURCES.MANUAL
      ? input.createdByUserId ?? null
      : null

  const current = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } })
  const previousRate = current?.usdArsRate ?? null

  if (previousRate != null && previousRate === input.rate) {
    return {
      changed: false,
      rate: previousRate,
      previousRate,
      updatedAt: current?.updatedAt ?? null,
      history: null,
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const settings = await tx.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        usdArsRate: input.rate,
      },
      update: {
        usdArsRate: input.rate,
      },
    })

    const history = await tx.exchangeRateHistory.create({
      data: {
        rate: input.rate,
        currencyBase: 'USD',
        currencyQuote: 'ARS',
        source: input.source,
        effectiveDate,
        providerDate,
        providerTime,
        previousRate,
        createdByUserId,
      },
    })

    return { settings, history }
  })

  revalidateTag(FINANCIAL_SETTINGS_TAG)
  // Etapa C: precios públicos dependen del TC → invalidar catálogo solo si cambió.
  const { revalidateCatalogPublicCache } = await import(
    '@/lib/catalog-revalidate'
  )
  revalidateCatalogPublicCache()

  return {
    changed: true,
    rate: result.settings.usdArsRate,
    previousRate,
    updatedAt: result.settings.updatedAt,
    history: result.history,
  }
}
