/**
 * Totales de cotización (moneda de documento = USD).
 * totalARS = totalWithDiscount * exchangeRateARS (snapshot).
 */

export type QuoteTotalsItem = {
  unitPriceUSD: number
  taxRate: number
  qty: number
}

export type QuoteTotalsInput = {
  items: QuoteTotalsItem[]
  discountPct?: number
  /** Snapshot TC ARS por 1 USD (obligatorio; sin default mágico). */
  exchangeRateARS: number
}

export type QuoteTotals = {
  currency: 'USD'
  subtotal: number
  total: number
  discountPct: number
  discountAmount: number
  totalWithDiscount: number
  totalARS: number
  exchangeRateARS: number
}

export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const { items, exchangeRateARS } = input
  if (
    typeof exchangeRateARS !== 'number' ||
    !Number.isFinite(exchangeRateARS) ||
    exchangeRateARS <= 0
  ) {
    throw new Error('exchangeRateARS inválido para calcular totales')
  }

  const subtotal = items.reduce(
    (acc, item) => acc + item.unitPriceUSD * item.qty,
    0,
  )

  const total = items.reduce((acc, item) => {
    const lineBase = item.unitPriceUSD * item.qty
    return acc + lineBase * (1 + item.taxRate / 100)
  }, 0)

  const rawDiscount =
    typeof input.discountPct === 'number' && Number.isFinite(input.discountPct)
      ? input.discountPct
      : 0
  const discountPct = Math.min(100, Math.max(0, rawDiscount))
  const discountAmount = total * (discountPct / 100)
  const totalWithDiscount = total - discountAmount
  const totalARS = totalWithDiscount * exchangeRateARS

  return {
    currency: 'USD',
    subtotal,
    total,
    discountPct,
    discountAmount,
    totalWithDiscount,
    totalARS,
    exchangeRateARS,
  }
}

export function computeQuoteLineTotals(item: QuoteTotalsItem) {
  const subtotal = item.unitPriceUSD * item.qty
  const taxAmount = subtotal * (item.taxRate / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

/** Recalcula totalARS persistido al cambiar el TC del documento. */
export function recomputeQuoteTotalARS(
  totalWithDiscount: number,
  exchangeRateARS: number,
): number {
  if (
    !Number.isFinite(totalWithDiscount) ||
    !Number.isFinite(exchangeRateARS) ||
    exchangeRateARS <= 0
  ) {
    throw new Error('No se puede recalcular totalARS con valores inválidos')
  }
  return totalWithDiscount * exchangeRateARS
}
