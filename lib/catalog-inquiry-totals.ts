/**
 * Totales de la lista de consulta (precios públicos ARS ya resueltos).
 * Puro / testeable. No convierte USD ni lee Settings.
 */

export function computeInquiryLineSubtotal(
  unitPriceARS: number,
  quantity: number,
): number {
  const qty = Math.max(0, Math.floor(quantity))
  return Math.round(unitPriceARS) * qty
}

export type InquiryPricedLine = {
  unitPriceARS: number | null
  quantity: number
}

export type InquiryEstimatedTotals = {
  estimatedProductsTotalARS: number
  pricedItemsCount: number
  unpricedItemsCount: number
}

export function snapshotInquiryLinePrice(
  quantity: number,
  serverUnitPriceARS: number | null,
): { unitPriceARS: number | null; subtotalARS: number | null } {
  if (
    typeof serverUnitPriceARS !== 'number' ||
    !Number.isFinite(serverUnitPriceARS) ||
    serverUnitPriceARS < 0
  ) {
    return { unitPriceARS: null, subtotalARS: null }
  }

  return {
    unitPriceARS: Math.round(serverUnitPriceARS),
    subtotalARS: computeInquiryLineSubtotal(serverUnitPriceARS, quantity),
  }
}

/** Consultas históricas sin snapshot económico no deben romper la UI. */
export function hasInquiryEconomicSnapshot(input: {
  estimatedProductsTotalARS?: number | null
  pricedItemsCount?: number | null
  unpricedItemsCount?: number | null
}): boolean {
  return (
    input.estimatedProductsTotalARS != null ||
    input.pricedItemsCount != null ||
    input.unpricedItemsCount != null
  )
}

export function computeInquiryEstimatedTotals(
  lines: InquiryPricedLine[],
): InquiryEstimatedTotals {
  let estimatedProductsTotalARS = 0
  let pricedItemsCount = 0
  let unpricedItemsCount = 0

  for (const line of lines) {
    if (
      typeof line.unitPriceARS === 'number' &&
      Number.isFinite(line.unitPriceARS) &&
      line.unitPriceARS >= 0
    ) {
      pricedItemsCount += 1
      estimatedProductsTotalARS += computeInquiryLineSubtotal(
        line.unitPriceARS,
        line.quantity,
      )
    } else {
      unpricedItemsCount += 1
    }
  }

  return {
    estimatedProductsTotalARS,
    pricedItemsCount,
    unpricedItemsCount,
  }
}
