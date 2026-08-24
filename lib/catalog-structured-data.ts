/**
 * Structured data (JSON-LD) del catálogo público.
 * Whitelist explícita — sin costos, stock, reviews ni Offer de ecommerce.
 */

import type { CatalogProductDetail } from '@/lib/catalog-client'
import { CATALOG_PUBLIC_ORIGIN } from '@/lib/catalog-paths'
import { IFEDelBrand } from '@/lib/ifedel-brand'

export const CATALOG_ORG_ID = `${CATALOG_PUBLIC_ORIGIN}/#organization`
export const CATALOG_WEBSITE_ID = `${CATALOG_PUBLIC_ORIGIN}/#website`

/** URL absoluta canónica del catálogo (paths limpios). */
export function catalogPublicUrl(path: string = ''): string {
  const segment = (path || '').replace(/^\/+/, '')
  if (!segment) return `${CATALOG_PUBLIC_ORIGIN}/`
  return `${CATALOG_PUBLIC_ORIGIN}/${segment}`
}

export type JsonLdObject = Record<string, unknown>

export function buildOrganizationJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': CATALOG_ORG_ID,
    name: IFEDelBrand.companyName,
    description: IFEDelBrand.tagline,
    url: catalogPublicUrl(),
    logo: catalogPublicUrl(IFEDelBrand.logo.src),
    email: IFEDelBrand.email,
    telephone: IFEDelBrand.phone,
    // address omitido: solo tenemos calle, sin localidad/CP/país confiables.
  }
}

export function buildWebSiteJsonLd(): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': CATALOG_WEBSITE_ID,
    name: IFEDelBrand.companyName,
    url: catalogPublicUrl(),
    publisher: { '@id': CATALOG_ORG_ID },
    // Sin SearchAction: búsqueda pública usa query params noindex (P5.2).
  }
}

type BreadcrumbItem = {
  name: string
  /** Path limpio sin origen, ej. `productos` o `` para home. */
  path?: string
}

/**
 * BreadcrumbList alineado a la navegación visible del catálogo.
 * Convención: Inicio → Productos → (Categoría | Producto)
 */
export function buildBreadcrumbListJsonLd(
  items: BreadcrumbItem[],
): JsonLdObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => {
      const position = index + 1
      const entry: JsonLdObject = {
        '@type': 'ListItem',
        position,
        name: item.name,
      }
      if (item.path !== undefined) {
        entry.item = catalogPublicUrl(item.path)
      }
      return entry
    }),
  }
}

export function buildProductBreadcrumbJsonLd(product: {
  title: string
  slug: string
}): JsonLdObject {
  return buildBreadcrumbListJsonLd([
    { name: 'Inicio', path: '' },
    { name: 'Productos', path: 'productos' },
    { name: product.title, path: `productos/${product.slug}` },
  ])
}

export type CategoryBreadcrumbJsonLdInput =
  | {
      kind: 'root'
      root: { name: string; slug: string }
    }
  | {
      kind: 'leaf'
      root: { name: string; slug: string }
      leaf: { name: string; slug: string }
    }

export function buildCategoryBreadcrumbJsonLd(
  input: CategoryBreadcrumbJsonLdInput,
): JsonLdObject {
  const items: BreadcrumbItem[] = [
    { name: 'Inicio', path: '' },
    { name: 'Categorías', path: 'productos' },
    {
      name: input.root.name,
      path: `categorias/${input.root.slug}`,
    },
  ]

  if (input.kind === 'leaf') {
    items.push({
      name: input.leaf.name,
      path: `categorias/${input.leaf.slug}`,
    })
  }

  return buildBreadcrumbListJsonLd(items)
}

/**
 * Product schema sin Offer.
 * Motivo: no hay checkout; precio público es orientativo y sujeto a confirmación.
 */
export function buildProductJsonLd(
  product: CatalogProductDetail,
): JsonLdObject {
  const url = catalogPublicUrl(`productos/${product.slug}`)
  const description =
    product.shortDescription?.trim() ||
    product.description?.trim() ||
    undefined

  const images = product.images
    .map((img) => img.url?.trim())
    .filter((u): u is string => Boolean(u))

  const data: JsonLdObject = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${url}#product`,
    name: product.title,
    url,
    sku: product.sku,
  }

  if (description) {
    data.description = description
  }

  if (images.length === 1) {
    data.image = images[0]
  } else if (images.length > 1) {
    data.image = images
  }

  if (product.brand?.name?.trim()) {
    data.brand = {
      '@type': 'Brand',
      name: product.brand.name.trim(),
    }
  }

  return data
}
