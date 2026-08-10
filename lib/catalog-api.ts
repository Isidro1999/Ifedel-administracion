/**
 * Serialización PÚBLICA del catálogo IFEDEL.
 *
 * Endpoints `/api/catalog/*` — sin auth.
 * Whitelist estricta: NUNCA incluir cost, costCurrency, márgenes,
 * proveedores, notas internas, ni listas de precios internas completas.
 * NUNCA exponer USD/netPrice original ni usdArsRate.
 *
 * Tolera brand/category/images/files/specs/prices nulos o vacíos.
 */

import {
  resolvePublicCatalogPrice,
  type CatalogPublicPrice,
} from '@/lib/catalog-public-price'

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

/**
 * Precio público final en ARS (IVA incluido).
 * `netPrice` es alias de `amount` (compat); no es el neto original.
 */
export type CatalogPrice = CatalogPublicPrice | null

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
  catalogVisible?: boolean
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

export type CatalogSerializeOptions = {
  /** TC global USD→ARS (una vez por request). */
  usdArsRate?: number | null
}

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

/**
 * @deprecated Usar resolvePublicCatalogPrice. Se mantiene como wrapper.
 */
export function resolveCatalogPrice(
  product: {
    showPrice: boolean
    catalogPriceList?: string | null
    prices?: PriceRow[] | null
  },
  usdArsRate?: number | null,
) {
  return resolvePublicCatalogPrice(product, usdArsRate ?? null)
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

function publicPricing(
  product: CatalogProductSource,
  opts?: CatalogSerializeOptions,
) {
  const resolved = resolvePublicCatalogPrice(
    product,
    opts?.usdArsRate ?? null,
  )
  return {
    showPrice: resolved.showPrice,
    price: resolved.price,
    priceLabel: resolved.priceLabel,
  }
}

/** Card / listado del catálogo. */
export function serializeCatalogProductListItem(
  product: CatalogProductSource,
  opts?: CatalogSerializeOptions,
) {
  const pricing = publicPricing(product, opts)

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
export function serializeCatalogProductDetail(
  product: CatalogProductSource,
  opts?: CatalogSerializeOptions,
) {
  const pricing = publicPricing(product, opts)

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
