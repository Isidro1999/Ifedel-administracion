import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogCategories,
  fetchCatalogProducts,
} from '@/lib/catalog-client'
import { CATALOG_PUBLIC_ORIGIN, catalogPath } from '@/lib/catalog-paths'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { HOME_BRANDS } from '@/components/catalog/home/home-brands'
import { toHomeCategoryItems } from '@/components/catalog/home/home-categories'
import { HomeHero } from '@/components/catalog/home/HomeHero'
import { HomeBrands } from '@/components/catalog/home/HomeBrands'
import { HomeCategories } from '@/components/catalog/home/HomeCategories'
import { HomeFeaturedProducts } from '@/components/catalog/home/HomeFeaturedProducts'
import { HomeHowItWorks } from '@/components/catalog/home/HomeHowItWorks'
import { HomeTrust } from '@/components/catalog/home/HomeTrust'
import { HomeFinalCta } from '@/components/catalog/home/HomeFinalCta'

/** ISR 60s: demora de publicación 1–5 min aceptable en v1. */
export const revalidate = 60

const HOME_DESCRIPTION =
  'Explorá productos para electrificación rural, alambrados, pesaje, ganadería y más. Armá tu consulta y recibí asesoramiento por WhatsApp.'

export const metadata: Metadata = {
  title: { absolute: 'Catálogo de soluciones agropecuarias | IFEDEL' },
  description: HOME_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${CATALOG_PUBLIC_ORIGIN}/`,
  },
  openGraph: {
    title: 'Catálogo de soluciones agropecuarias | IFEDEL',
    description: HOME_DESCRIPTION,
    url: `${CATALOG_PUBLIC_ORIGIN}/`,
    siteName: IFEDelBrand.companyName,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Catálogo de soluciones agropecuarias | IFEDEL',
    description: HOME_DESCRIPTION,
  },
}

export default async function CatalogoHomePage() {
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
          console.error('[catalogo/home] featured error', err)
        }
        return { ok: false as const, data: null }
      }),
    fetchCatalogCategories()
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        if (process.env.NODE_ENV === 'development') {
          console.error('[catalogo/home] categories error', err)
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
  const homeCategories = toHomeCategoryItems(
    categoriesSettled.data,
    (slug) => p(`categorias/${slug}`),
  )

  return (
    <div className="min-w-0 overflow-x-clip">
      <HomeHero productsHref={productsHref} inquiryHref={inquiryHref} />
      <HomeBrands brands={HOME_BRANDS} />

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:space-y-14 sm:px-6 sm:py-12">
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
