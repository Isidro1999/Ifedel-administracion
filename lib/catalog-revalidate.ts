/**
 * Invalidación de caché del catálogo público tras mutaciones admin.
 */
import { revalidatePath, revalidateTag } from 'next/cache'
import { CATALOG_CACHE_TAGS } from '@/lib/catalog-cache'
import { catalogPath } from '@/lib/catalog-paths'

export function revalidateCatalogPublicCache(opts?: {
  slugs?: Array<string | null | undefined>
}): void {
  revalidateTag(CATALOG_CACHE_TAGS.all)
  revalidateTag(CATALOG_CACHE_TAGS.products)
  revalidateTag(CATALOG_CACHE_TAGS.product)
  revalidateTag(CATALOG_CACHE_TAGS.categories)
  revalidateTag(CATALOG_CACHE_TAGS.brands)

  revalidatePath('/catalogo')
  revalidatePath('/catalogo/productos')
  revalidatePath('/sitemap.xml')
  revalidatePath(catalogPath(''))
  revalidatePath(catalogPath('productos'))

  const seen = new Set<string>()
  for (const raw of opts?.slugs ?? []) {
    const slug = (raw || '').trim()
    if (!slug || seen.has(slug)) continue
    seen.add(slug)
    revalidatePath(`/catalogo/productos/${slug}`)
    revalidatePath(catalogPath(`productos/${slug}`))
  }
}
