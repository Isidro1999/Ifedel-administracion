/**
 * Serialización segura de productos para APIs internas autenticadas.
 * Nunca incluye márgenes, proveedores ni notas internas.
 * `cost` / `costCurrency` solo si includeCost (rol ADMIN).
 */

type BrandLike = { id: number; name: string; slug: string }
type CategoryLike = {
  id: number
  name: string
  slug: string
  parentId?: number | null
  parent?: { id: number; name: string; slug: string } | null
}

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
  /**
   * `detail` = consulta (/products/[id]): sin campos de catálogo/costo ni metadatos pesados.
   * `edit` = edición admin: incluye catálogo + relaciones completas necesarias para el form.
   * Por defecto `edit` para no romper consumidores existentes.
   */
  view?: 'detail' | 'edit'
}

/**
 * Proyección whitelist para respuestas JSON de /api/products*.
 * Omite cost salvo includeCost=true.
 */
export function serializeProductForApi(
  product: ProductApiSource,
  options: SerializeProductOptions = {},
) {
  const { includeCost = false, view = 'edit' } = options
  const isDetail = view === 'detail'

  const base: Record<string, unknown> = {
    id: product.id,
    sku: product.sku,
    title: product.title,
    short: product.short ?? null,
    description: product.description ?? null,
    isActive: product.isActive,
    isFeatured: product.isFeatured,
  }

  if (!isDetail) {
    base.slug = product.slug
    base.catalogVisible = product.catalogVisible
    base.publicTitle = product.publicTitle ?? null
    base.publicShortDescription = product.publicShortDescription ?? null
    base.publicDescription = product.publicDescription ?? null
    base.catalogSort = product.catalogSort
    base.showPrice = product.showPrice
    base.catalogPriceList = product.catalogPriceList ?? null
    base.brandId = product.brandId
    base.categoryId = product.categoryId
    base.createdAt = product.createdAt
    base.updatedAt = product.updatedAt
  }

  if (includeCost && !isDetail) {
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
      parentId: product.category.parentId ?? null,
      parent: product.category.parent
        ? {
            id: product.category.parent.id,
            name: product.category.parent.name,
            slug: product.category.parent.slug,
          }
        : null,
    }
  }

  if (product.images) {
    base.images = product.images.map((img) => {
      const row: Record<string, unknown> = {
        id: img.id,
        url: img.url,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
      }
      if (!isDetail) {
        row.publicId = img.publicId ?? null
        row.createdAt = img.createdAt
      }
      return row
    })
  }

  if (product.specs) {
    base.specs = product.specs.map((spec) => {
      const row: Record<string, unknown> = {
        id: spec.id,
        label: spec.label,
        value: spec.value,
        sortOrder: spec.sortOrder,
      }
      if (!isDetail) row.createdAt = spec.createdAt
      return row
    })
  }

  if (product.prices) {
    // Precios de lista: solo para usuarios autenticados del backoffice.
    base.prices = product.prices.map((price) => {
      const row: Record<string, unknown> = {
        id: price.id,
        priceList: price.priceList,
        currency: price.currency,
        netPrice: price.netPrice,
        taxRate: price.taxRate,
        validFrom: price.validFrom ?? null,
        validTo: price.validTo ?? null,
      }
      if (!isDetail) {
        row.createdAt = price.createdAt
        row.updatedAt = price.updatedAt
      }
      return row
    })
  }

  if (product.files) {
    base.files = product.files.map((file) => {
      const row: Record<string, unknown> = {
        id: file.id,
        type: file.type,
        url: file.url,
      }
      if (!isDetail) row.createdAt = file.createdAt
      return row
    })
  }

  return base
}

export function serializeProductsForApi(
  products: ProductApiSource[],
  options: SerializeProductOptions = {},
) {
  return products.map((p) => serializeProductForApi(p, options))
}
