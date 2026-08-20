import type { MetadataRoute } from 'next'
import { CATALOG_REVALIDATE_SECONDS } from '@/lib/catalog-cache'
import { CATALOG_PUBLIC_ORIGIN } from '@/lib/catalog-paths'
import {
  getCatalogCategories,
  getCatalogSitemapProducts,
} from '@/lib/catalog-queries'

/** Misma ventana ISR que el resto del catálogo público. */
export const revalidate = CATALOG_REVALIDATE_SECONDS

/**
 * Sitemap del catálogo público (solo URLs indexables según P5.2).
 * Sin query params, `/consulta`, backoffice ni hosts no públicos.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = CATALOG_PUBLIC_ORIGIN

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${origin}/` },
    { url: `${origin}/productos` },
    { url: `${origin}/nosotros` },
  ]

  const [products, categories] = await Promise.all([
    getCatalogSitemapProducts(),
    getCatalogCategories(),
  ])

  const productEntries: MetadataRoute.Sitemap = products
    .filter((p) => p.slug.trim().length > 0)
    .map((p) => ({
      url: `${origin}/productos/${p.slug}`,
      lastModified: p.updatedAt,
    }))

  // Categorías solo con productos públicos (getCatalogCategories).
  // Sin lastModified: updatedAt de Category no refleja altas/bajas de productos.
  const categoryEntries: MetadataRoute.Sitemap = categories
    .filter((c) => c.slug.trim().length > 0)
    .map((c) => ({
      url: `${origin}/categorias/${c.slug}`,
    }))

  return [...staticEntries, ...productEntries, ...categoryEntries]
}
