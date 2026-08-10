/**
 * Precio público del catálogo (ARS, IVA incluido, sin centavos).
 * Puro / testeable — no importa Prisma ni Next cache.
 */

export const DEFAULT_CATALOG_PRICE_LIST = 'minorista'
export const PUBLIC_PRICE_LABEL = 'Consultar precio'

export type CatalogPublicPrice = {
  currency: 'ARS'
  /** Monto final en ARS (IVA incluido, redondeado). */
  amount: number
  includesTax: true
  /**
   * Alias de `amount` para compatibilidad con consumidores previos.
   * Siempre es el precio FINAL público (no el neto original).
   */
  netPrice: number
  /** Siempre 0 en público: el IVA ya está incluido en amount. */
  taxRate: 0
}

type PriceRow = {
  priceList: string
  currency: string
  netPrice: number
  taxRate: number
  validFrom?: Date | string | null
  validTo?: Date | string | null
  createdAt?: Date | string
}

export type ResolvePublicCatalogPriceInput = {
  showPrice: boolean
  catalogPriceList?: string | null
  prices?: PriceRow[] | null
}

export type ResolvePublicCatalogPriceResult = {
  showPrice: boolean
  price: CatalogPublicPrice | null
  priceLabel: string
  /** Lista efectivamente usada (solo depuración interna; no serializar). */
  sourcePriceList?: string
  sourceCurrency?: string
}

function isDateInRange(
  now: Date,
  validFrom?: Date | string | null,
  validTo?: Date | string | null,
): boolean {
  if (validFrom) {
    const from = new Date(validFrom)
    if (!Number.isNaN(from.getTime()) && now < from) return false
  }
  if (validTo) {
    const to = new Date(validTo)
    if (!Number.isNaN(to.getTime()) && now > to) return false
  }
  return true
}

function isValidUsdArsRate(rate: number | null | undefined): rate is number {
  return typeof rate === 'number' && Number.isFinite(rate) && rate > 0
}

/** Formato público ARS sin centavos: "$ 183.920" (locale es-AR). */
export function formatPublicCatalogPriceLabel(amountArs: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amountArs)
}

function buildPublicPrice(amount: number): CatalogPublicPrice {
  const rounded = Math.round(amount)
  return {
    currency: 'ARS',
    amount: rounded,
    includesTax: true,
    netPrice: rounded,
    taxRate: 0,
  }
}

function consultar(showPrice: boolean): ResolvePublicCatalogPriceResult {
  return {
    showPrice: Boolean(showPrice),
    price: null,
    priceLabel: PUBLIC_PRICE_LABEL,
  }
}

/**
 * Lista pública efectiva (fallback en memoria; no escribe DB).
 */
export function effectiveCatalogPriceList(
  catalogPriceList?: string | null,
): string {
  const trimmed = catalogPriceList?.trim()
  return trimmed || DEFAULT_CATALOG_PRICE_LIST
}

/**
 * Resuelve el precio orientativo del catálogo en ARS con IVA incluido.
 */
export function resolvePublicCatalogPrice(
  product: ResolvePublicCatalogPriceInput,
  usdArsRate: number | null | undefined,
  now: Date = new Date(),
): ResolvePublicCatalogPriceResult {
  if (!product.showPrice) {
    return {
      showPrice: false,
      price: null,
      priceLabel: PUBLIC_PRICE_LABEL,
    }
  }

  const listName = effectiveCatalogPriceList(product.catalogPriceList)
  if (!product.prices?.length) {
    return consultar(true)
  }

  const candidates = product.prices
    .filter(
      (pr) =>
        pr &&
        pr.priceList === listName &&
        typeof pr.netPrice === 'number' &&
        Number.isFinite(pr.netPrice) &&
        pr.netPrice >= 0 &&
        isDateInRange(now, pr.validFrom, pr.validTo),
    )
    .sort((a, b) => {
      const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0
      const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0
      return tb - ta
    })

  const best = candidates[0]
  if (!best) {
    return consultar(true)
  }

  const currency = (best.currency || '').trim().toUpperCase()
  const taxRate =
    typeof best.taxRate === 'number' && Number.isFinite(best.taxRate)
      ? best.taxRate
      : 0
  const net = best.netPrice
  const gross = net * (1 + taxRate / 100)

  if (currency === 'USD') {
    if (!isValidUsdArsRate(usdArsRate)) {
      return consultar(true)
    }
    const amount = gross * usdArsRate
    const price = buildPublicPrice(amount)
    return {
      showPrice: true,
      price,
      priceLabel: formatPublicCatalogPriceLabel(price.amount),
      sourcePriceList: listName,
      sourceCurrency: 'USD',
    }
  }

  if (currency === 'ARS') {
    const price = buildPublicPrice(gross)
    return {
      showPrice: true,
      price,
      priceLabel: formatPublicCatalogPriceLabel(price.amount),
      sourcePriceList: listName,
      sourceCurrency: 'ARS',
    }
  }

  if (process.env.NODE_ENV === 'development') {
    console.warn('[catalog.price] moneda no soportada', {
      currency: best.currency,
      priceList: listName,
    })
  }

  return consultar(true)
}
