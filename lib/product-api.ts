/**
 * Serialización segura de productos para APIs internas autenticadas.
 * Nunca incluye márgenes, proveedores ni notas internas.
 * `cost` / `costCurrency` solo si includeCost (rol ADMIN).
 */

type BrandLike = { id: number; name: string; slug: string }
type CategoryLike = { id: number; name: string; slug: string }

type ImageLike = {
  id: number
  url: string
  isPrimary: boolean
  sortOrder: number
  publicId?: string | null
  createdAt?: Date | string
}

type SpecLike = {
  id: number
  label: string
  value: string
  sortOrder: number
  createdAt?: Date | string
}

type PriceLike = {
  id: number
  priceList: string
  currency: string
  netPrice: number
  taxRate: number
  validFrom?: Date | string | null
  validTo?: Date | string | null
  createdAt?: Date | string
  updatedAt?: Date | string
}

type FileLike = {
  id: number
  type: string
  url: string
  createdAt?: Date | string
}

export type ProductApiSource = {
  id: number
  sku: string
  title: string
  short?: string | null
  description?: string | null
  cost?: number | null
  costCurrency?: string | null
  isActive: boolean
  isFeatured: boolean
  slug?: string
  catalogVisible?: boolean
  publicTitle?: string | null
  publicShortDescription?: string | null
  publicDescription?: string | null
  catalogSort?: number
  showPrice?: boolean
  catalogPriceList?: string | null
  brandId?: number
  categoryId?: number
  createdAt?: Date | string
  updatedAt?: Date | string
  brand?: BrandLike
  category?: CategoryLike
  images?: ImageLike[]
  specs?: SpecLike[]
  prices?: PriceLike[]
  files?: FileLike[]
}

export type SerializeProductOptions = {
  /** Solo ADMIN: incluye cost / costCurrency para edición. */
  includeCost?: boolean
}

/**
 * Proyección whitelist para respuestas JSON de /api/products*.
 * Omite cost salvo includeCost=true.
 */
export function serializeProductForApi(
  product: ProductApiSource,
  options: SerializeProductOptions = {},
) {
  const { includeCost = false } = options

  const base: Record<string, unknown> = {
    id: product.id,
    sku: product.sku,
    title: product.title,
    short: product.short ?? null,
    description: product.description ?? null,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
    slug: product.slug,
    catalogVisible: product.catalogVisible,
    publicTitle: product.publicTitle ?? null,
    publicShortDescription: product.publicShortDescription ?? null,
    publicDescription: product.publicDescription ?? null,
    catalogSort: product.catalogSort,
    showPrice: product.showPrice,
    catalogPriceList: product.catalogPriceList ?? null,
    brandId: product.brandId,
    categoryId: product.categoryId,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }

  if (includeCost) {
    base.cost = product.cost ?? null
    base.costCurrency = product.costCurrency ?? null
  }

  if (product.brand) {
    base.brand = {
      id: product.brand.id,
      name: product.brand.name,
      slug: product.brand.slug,
    }
  }

  if (product.category) {
    base.category = {
      id: product.category.id,
      name: product.category.name,
      slug: product.category.slug,
    }
  }

  if (product.images) {
    base.images = product.images.map((img) => ({
      id: img.id,
      url: img.url,
      isPrimary: img.isPrimary,
      sortOrder: img.sortOrder,
      publicId: img.publicId ?? null,
      createdAt: img.createdAt,
    }))
  }

  if (product.specs) {
    base.specs = product.specs.map((spec) => ({
      id: spec.id,
      label: spec.label,
      value: spec.value,
      sortOrder: spec.sortOrder,
      createdAt: spec.createdAt,
    }))
  }

  if (product.prices) {
    // Precios de lista: solo para usuarios autenticados del backoffice (cotizaciones).
    // El catálogo público usará /api/catalog/* y showPrice + catalogPriceList.
    base.prices = product.prices.map((price) => ({
      id: price.id,
      priceList: price.priceList,
      currency: price.currency,
      netPrice: price.netPrice,
      taxRate: price.taxRate,
      validFrom: price.validFrom ?? null,
      validTo: price.validTo ?? null,
      createdAt: price.createdAt,
      updatedAt: price.updatedAt,
    }))
  }

  if (product.files) {
    base.files = product.files.map((file) => ({
      id: file.id,
      type: file.type,
      url: file.url,
      createdAt: file.createdAt,
    }))
  }

  return base
}

export function serializeProductsForApi(
  products: ProductApiSource[],
  options: SerializeProductOptions = {},
) {
  return products.map((p) => serializeProductForApi(p, options))
}
