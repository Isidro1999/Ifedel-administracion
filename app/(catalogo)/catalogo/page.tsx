import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogCategoryTree,
  fetchCatalogProducts,
} from '@/lib/catalog-client'
import { CATALOG_PUBLIC_ORIGIN, catalogPath } from '@/lib/catalog-paths'
import { catalogSocialMetadata } from '@/lib/catalog-social-metadata'
import { HOME_BRANDS } from '@/components/catalog/home/home-brands'
import { toHomeCategoryItemsFromTree } from '@/components/catalog/home/home-categories'
import { HomeHero } from '@/components/catalog/home/HomeHero'
import { HomeBrands } from '@/components/catalog/home/HomeBrands'
import { HomeCategories } from '@/components/catalog/home/HomeCategories'
import { HomeFeaturedProducts } from '@/components/catalog/home/HomeFeaturedProducts'
import { HomeHowItWorks } from '@/components/catalog/home/HomeHowItWorks'
import { HomeTrust } from '@/components/catalog/home/HomeTrust'
import { HomeFinalCta } from '@/components/catalog/home/HomeFinalCta'
import { JsonLd } from '@/components/catalog/JsonLd'
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from '@/lib/catalog-structured-data'

/** ISR 60s: demora de publicación 1–5 min aceptable en v1. */
export const revalidate = 60

const HOME_DESCRIPTION =
  'Explorá productos para electrificación rural, alambrados, pesaje, ganadería y más. Armá tu consulta y recibí asesoramiento por WhatsApp.'

const HOME_TITLE = 'Catálogo de soluciones agropecuarias | IFEDEL'

export const metadata: Metadata = {
  title: { absolute: HOME_TITLE },
  description: HOME_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${CATALOG_PUBLIC_ORIGIN}/`,
  },
  ...catalogSocialMetadata({
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    path: '',
  }),
}

export default async function CatalogoHomePage() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)

  const productsHref = p('productos')
  const inquiryHref = p('consulta')

  const [featuredSettled, categoriesSettled] = await Promise.all([
    fetchCatalogProducts({
      featured: 'true',
      pageSize: '4',
    })
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[catalogo/home] featured error', err)
        }
        return { ok: false as const, data: null }
      }),
    fetchCatalogCategoryTree()
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[catalogo/home] category tree error', err)
        }
        return {
          ok: false as const,
          data: [] as Awaited<ReturnType<typeof fetchCatalogCategoryTree>>,
        }
      }),
  ])

  const featured = featuredSettled.ok
    ? featuredSettled.data.items.slice(0, 4)
    : []
  const featuredError = !featuredSettled.ok
  const homeCategories = toHomeCategoryItemsFromTree(
    categoriesSettled.data,
    (slug) => p(`categorias/${slug}`),
  )

  return (
    <div className="min-w-0 overflow-x-clip">
      <JsonLd data={buildOrganizationJsonLd()} />
      <JsonLd data={buildWebSiteJsonLd()} />
      <HomeHero productsHref={productsHref} inquiryHref={inquiryHref} />
      <HomeBrands brands={HOME_BRANDS} />

      <div className="mx-auto max-w-[1400px] space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-12 lg:px-8">
        <HomeCategories
          categories={homeCategories}
          productsHref={productsHref}
        />
        <HomeFeaturedProducts
          products={featured}
          productsHref={productsHref}
          loadError={featuredError}
        />

        <div className="space-y-8 sm:space-y-10">
          <HomeHowItWorks />
          <HomeTrust />
          <HomeFinalCta
            productsHref={productsHref}
            inquiryHref={inquiryHref}
          />
        </div>
      </div>
    </div>
  )
}
