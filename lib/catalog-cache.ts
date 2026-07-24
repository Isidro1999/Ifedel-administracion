/**
 * Política de caché del catálogo público (v1).
 *
 * 60s: el catálogo no cambia segundo a segundo; un admin puede esperar
 * hasta ~1 min (CDN/ISR) + stale-while-revalidate sirve respuestas viejas
 * mientras revalida (hasta 5 min de gracia).
 */
export const CATALOG_REVALIDATE_SECONDS = 60
export const CATALOG_SWR_SECONDS = 300

/** Cache-Control para respuestas JSON públicas de `/api/catalog/*`. */
export const CATALOG_API_CACHE_CONTROL = `public, s-maxage=${CATALOG_REVALIDATE_SECONDS}, stale-while-revalidate=${CATALOG_SWR_SECONDS}`

export const CATALOG_CACHE_TAGS = {
  all: 'catalog',
  products: 'catalog-products',
  product: 'catalog-product',
  categories: 'catalog-categories',
  brands: 'catalog-brands',
} as const
