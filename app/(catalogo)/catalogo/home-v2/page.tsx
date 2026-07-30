import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
} from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import { HomeV2Hero } from '@/components/catalog/home-v2/HomeV2Hero'
import { HomeV2Brands } from '@/components/catalog/home-v2/HomeV2Brands'
import { HomeV2Categories } from '@/components/catalog/home-v2/HomeV2Categories'
import { HomeV2FeaturedProducts } from '@/components/catalog/home-v2/HomeV2FeaturedProducts'
import { HomeV2HowItWorks } from '@/components/catalog/home-v2/HomeV2HowItWorks'
import { HomeV2Trust } from '@/components/catalog/home-v2/HomeV2Trust'
import { HomeV2FinalCta } from '@/components/catalog/home-v2/HomeV2FinalCta'

/** ISR 60s: misma política que la home vigente. */
export const revalidate = 60

export const metadata: Metadata = {
  title: 'Home V2 (experimental)',
  description:
    'Versión experimental de la home del catálogo IFEDEL. Ruta temporal para comparación.',
  robots: {
    index: false,
    follow: false,
  },
}

export default async function CatalogoHomeV2Page() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)

  const productsHref = p('productos')
  const inquiryHref = p('consulta')

  const [featuredSettled, categoriesSettled] = await Promise.all([
    fetchCatalogProducts({
      featured: 'true',
      pageSize: '6',
    })
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[catalogo/home-v2] featured error', err)
        }
        return { ok: false as const, data: null }
      }),
    fetchCatalogCategories()
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[catalogo/home-v2] categories error', err)
        }
        return {
          ok: false as const,
          data: [] as Awaited<ReturnType<typeof fetchCatalogCategories>>,
        }
      }),
  ])

  const featured = featuredSettled.ok
    ? featuredSettled.data.items.slice(0, 6)
    : []
  const featuredError = !featuredSettled.ok
  const categories = categoriesSettled.data

  return (
    <div>
      <HomeV2Hero productsHref={productsHref} inquiryHref={inquiryHref} />
      <HomeV2Brands />
      <div className="mx-auto max-w-6xl space-y-16 px-4 py-14 sm:px-6">
        <HomeV2Categories
          categories={categories}
          categoryHref={(slug) => p(`categorias/${slug}`)}
          productsHref={productsHref}
        />
        <HomeV2FeaturedProducts
          products={featured}
          productsHref={productsHref}
          loadError={featuredError}
        />
        <HomeV2HowItWorks />
        <HomeV2Trust />
        <HomeV2FinalCta
          productsHref={productsHref}
          inquiryHref={inquiryHref}
        />
      </div>
    </div>
  )
}
