/**
 * Totales de compra.
 * totalARS = moneda ARS → totalWithDiscount;
 *           moneda USD → totalWithDiscount * exchangeRateARS (snapshot).
 * Sin fallback mágico a 1000.
 */

export type PurchaseTotalsItem = {
  unitCost: number
  taxRate: number
  qty: number
}

export type PurchaseTotalsInput = {
  items: PurchaseTotalsItem[]
  currency: 'USD' | 'ARS'
  discountPct?: number
  /** Snapshot TC ARS por 1 unidad de moneda de documento (obligatorio; sin default). */
  exchangeRateARS: number
}

export type PurchaseTotals = {
  currency: 'USD' | 'ARS'
  subtotal: number
  total: number
  discountPct: number
  discountAmount: number
  totalWithDiscount: number
  totalARS: number
  exchangeRateARS: number
}

export function assertValidPurchaseExchangeRate(
  exchangeRateARS: unknown,
): asserts exchangeRateARS is number {
  if (
    typeof exchangeRateARS !== 'number' ||
    !Number.isFinite(exchangeRateARS) ||
    exchangeRateARS <= 0
  ) {
    throw new Error('exchangeRateARS inválido para calcular totales de compra')
  }
}

export function computePurchaseTotals(
  input: PurchaseTotalsInput,
): PurchaseTotals {
  const { items, currency, exchangeRateARS } = input
  assertValidPurchaseExchangeRate(exchangeRateARS)

  const subtotal = items.reduce(
    (acc, item) => acc + item.unitCost * item.qty,
    0,
  )

  const total = items.reduce((acc, item) => {
    const lineBase = item.unitCost * item.qty
    return acc + lineBase * (1 + item.taxRate / 100)
  }, 0)

  const rawDiscount =
    typeof input.discountPct === 'number' && Number.isFinite(input.discountPct)
      ? input.discountPct
      : 0
  const discountPct = Math.min(100, Math.max(0, rawDiscount))
  const discountAmount = total * (discountPct / 100)
  const totalWithDiscount = total - discountAmount
  const totalARS =
    currency === 'ARS' ? totalWithDiscount : totalWithDiscount * exchangeRateARS

  return {
    currency,
    subtotal,
    total,
    discountPct,
    discountAmount,
    totalWithDiscount,
    totalARS,
    exchangeRateARS,
  }
}

export function computePurchaseLineTotals(item: PurchaseTotalsItem) {
  const subtotal = item.unitCost * item.qty
  const taxAmount = subtotal * (item.taxRate / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

/**
 * Resuelve el TC a persistir al crear una compra.
 * - Override manual del cliente si es válido.
 * - Si no, el caller debe inyectar el TC global ya resuelto.
 */
export function resolvePurchaseExchangeRateForCreate(input: {
  clientRate: number | undefined
  globalRate: number
}): number {
  const { clientRate, globalRate } = input
  if (
    typeof clientRate === 'number' &&
    Number.isFinite(clientRate) &&
    clientRate > 0
  ) {
    return clientRate
  }
  assertValidPurchaseExchangeRate(globalRate)
  return globalRate
}
