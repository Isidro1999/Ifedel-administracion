/**
 * Serialización PÚBLICA del catálogo IFEDEL.
 *
 * Endpoints `/api/catalog/*` — sin auth.
 * Whitelist estricta: NUNCA incluir cost, costCurrency, márgenes,
 * proveedores, notas internas, ni listas de precios internas completas.
 *
 * Tolera brand/category/images/files/specs/prices nulos o vacíos.
 */

const PUBLIC_PRICE_LABEL = 'Consultar precio'

/** Tipos de archivo aptos para cliente final. */
const PUBLIC_FILE_TYPES = new Set([
  'manual',
  'ficha',
  'ficha_tecnica',
  'fichatecnica',
  'catalogo',
  'catálogo',
  'brochure',
  'datasheet',
  'pdf',
])

export type CatalogBrand = { id: number; name: string; slug: string }
export type CatalogCategory = { id: number; name: string; slug: string }

export type CatalogImage = {
  id: number
  url: string
  isPrimary: boolean
  sortOrder: number
}

export type CatalogSpec = {
  id: number
  label: string
  value: string
  sortOrder: number
}

export type CatalogFile = {
  id: number
  type: string
  url: string
}

/** Precio público permitido (sin IDs de lista interna ni historial). */
export type CatalogPrice = {
  currency: string
  netPrice: number
  taxRate: number
} | null

type PriceRow = {
  priceList: string
  currency: string
  netPrice: number
  taxRate: number
  validFrom?: Date | string | null
  validTo?: Date | string | null
  createdAt?: Date | string
}

export type CatalogProductSource = {
  id: number
  sku: string
  title: string
  short?: string | null
  description?: string | null
  slug: string
  catalogVisible: boolean
  publicTitle?: string | null
  publicShortDescription?: string | null
  publicDescription?: string | null
  catalogSort: number
  showPrice: boolean
  catalogPriceList?: string | null
  isFeatured: boolean
  brand?: CatalogBrand | null
  category?: CatalogCategory | null
  images?: Array<{
    id: number
    url: string
    isPrimary: boolean
    sortOrder: number
  }> | null
  specs?: Array<{
    id: number
    label: string
    value: string
    sortOrder: number
  }> | null
  files?: Array<{
    id: number
    type: string
    url: string
  }> | null
  /** Solo para resolver precio público; nunca se serializa tal cual. */
  prices?: PriceRow[] | null
}

function publicTitle(p: CatalogProductSource): string {
  const t = p.publicTitle?.trim()
  return t || p.title
}

function publicShort(p: CatalogProductSource): string | null {
  const t = p.publicShortDescription?.trim()
  if (t) return t
  return p.short?.trim() || null
}

function publicDescription(p: CatalogProductSource): string | null {
  const t = p.publicDescription?.trim()
  if (t) return t
  return p.description?.trim() || null
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

/**
 * Resuelve precio público según showPrice + catalogPriceList.
 * Nunca expone otras listas ni el array prices completo.
 */
export function resolveCatalogPrice(product: {
  showPrice: boolean
  catalogPriceList?: string | null
  prices?: PriceRow[] | null
}): { showPrice: boolean; price: CatalogPrice; priceLabel: string } {
  const consultar = (): {
    showPrice: boolean
    price: CatalogPrice
    priceLabel: string
  } => ({
    showPrice: Boolean(product.showPrice),
    price: null,
    priceLabel: PUBLIC_PRICE_LABEL,
  })

  if (!product.showPrice) {
    return {
      showPrice: false,
      price: null,
      priceLabel: PUBLIC_PRICE_LABEL,
    }
  }

  const listName = product.catalogPriceList?.trim()
  if (!listName || !product.prices?.length) {
    return consultar()
  }

  const now = new Date()
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
    return consultar()
  }

  const price = {
    currency: best.currency || 'ARS',
    netPrice: best.netPrice,
    taxRate: best.taxRate ?? 0,
  }

  return {
    showPrice: true,
    price,
    priceLabel: `${price.currency} ${price.netPrice}`,
  }
}

export function isPublicCatalogFileType(type: string): boolean {
  const normalized = String(type || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
  return PUBLIC_FILE_TYPES.has(normalized)
}

function pickPrimaryImage(
  images: CatalogProductSource['images'],
): CatalogImage | null {
  if (!images?.length) return null
  const sorted = [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
    return a.sortOrder - b.sortOrder
  })
  const img = sorted[0]
  if (!img?.url) return null
  return {
    id: img.id,
    url: img.url,
    isPrimary: img.isPrimary,
    sortOrder: img.sortOrder,
  }
}

function serializeBrand(
  brand: CatalogProductSource['brand'],
): CatalogBrand | null {
  if (!brand || brand.id == null) return null
  return {
    id: brand.id,
    name: brand.name || 'Sin marca',
    slug: brand.slug || 'sin-marca',
  }
}

function serializeCategory(
  category: CatalogProductSource['category'],
): CatalogCategory | null {
  if (!category || category.id == null) return null
  return {
    id: category.id,
    name: category.name || 'Sin categoría',
    slug: category.slug || 'sin-categoria',
  }
}

/** Card / listado del catálogo. */
export function serializeCatalogProductListItem(product: CatalogProductSource) {
  const pricing = resolveCatalogPrice(product)

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    title: publicTitle(product),
    shortDescription: publicShort(product),
    brand: serializeBrand(product.brand),
    category: serializeCategory(product.category),
    primaryImage: pickPrimaryImage(product.images),
    isFeatured: Boolean(product.isFeatured),
    catalogSort: product.catalogSort ?? 0,
    showPrice: pricing.showPrice,
    price: pricing.price,
    priceLabel: pricing.priceLabel,
  }
}

/** Ficha de detalle pública. */
export function serializeCatalogProductDetail(product: CatalogProductSource) {
  const pricing = resolveCatalogPrice(product)

  const images = [...(product.images ?? [])]
    .filter((img) => img?.url)
    .sort((a, b) => {
      if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1
      return a.sortOrder - b.sortOrder
    })
    .map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
    }))

  const specs = [...(product.specs ?? [])]
    .filter((s) => s && s.label != null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => ({
      id: s.id,
      label: s.label,
      value: s.value,
      sortOrder: s.sortOrder,
    }))

  const files = (product.files ?? [])
    .filter((f) => f && isPublicCatalogFileType(f.type) && f.url)
    .map((f) => ({
      id: f.id,
      type: f.type,
      url: f.url,
    }))

  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    title: publicTitle(product),
    shortDescription: publicShort(product),
    description: publicDescription(product),
    brand: serializeBrand(product.brand),
    category: serializeCategory(product.category),
    images,
    specs,
    files,
    isFeatured: Boolean(product.isFeatured),
    catalogSort: product.catalogSort ?? 0,
    showPrice: pricing.showPrice,
    price: pricing.price,
    priceLabel: pricing.priceLabel,
  }
}

/** Alias pedido en el plan. */
export const serializeCatalogProduct = serializeCatalogProductDetail
