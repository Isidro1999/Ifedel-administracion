import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { fetchCatalogCategories } from '@/lib/catalog-client'
import { CATALOG_PUBLIC_ORIGIN, catalogPath } from '@/lib/catalog-paths'
import { catalogSocialMetadata } from '@/lib/catalog-social-metadata'
import { HomeFinalCta } from '@/components/catalog/home/HomeFinalCta'
import { AboutHero } from '@/components/catalog/nosotros/AboutHero'
import { AboutWhoWeAre } from '@/components/catalog/nosotros/AboutWhoWeAre'
import { AboutWhatWeDo } from '@/components/catalog/nosotros/AboutWhatWeDo'
import { AboutNationalCoverage } from '@/components/catalog/nosotros/AboutNationalCoverage'
import { AboutBrandWall } from '@/components/catalog/nosotros/AboutBrandWall'
import {
  AboutRubros,
  selectAboutRubros,
} from '@/components/catalog/nosotros/AboutRubros'

export const revalidate = 60

const NOSOTROS_DESCRIPTION =
  'Conocé IFEDEL y nuestras soluciones para ganadería, electrificación rural, alambrados, pesaje y equipamiento para el campo.'

const NOSOTROS_TITLE = 'Nosotros | IFEDEL'

export const metadata: Metadata = {
  title: { absolute: NOSOTROS_TITLE },
  description: NOSOTROS_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: `${CATALOG_PUBLIC_ORIGIN}/nosotros`,
  },
  ...catalogSocialMetadata({
    title: NOSOTROS_TITLE,
    description: NOSOTROS_DESCRIPTION,
    path: 'nosotros',
  }),
}

export default async function CatalogoNosotrosPage() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)

  const productsHref = p('productos')
  const inquiryHref = p('consulta')

  const categoriesSettled = await fetchCatalogCategories()
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      if (process.env.NODE_ENV === 'development') {
        console.error('[catalogo/nosotros] categories error', err)
      }
      return {
        ok: false as const,
        data: [] as Awaited<ReturnType<typeof fetchCatalogCategories>>,
      }
    })

  const rubros = selectAboutRubros(categoriesSettled.data, (slug) =>
    p(`categorias/${slug}`),
  )

  return (
    <div className="min-w-0 overflow-x-clip">
      <AboutHero />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <AboutWhoWeAre />
      </div>

      <AboutWhatWeDo />
      <AboutNationalCoverage />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <AboutRubros rubros={rubros} productsHref={productsHref} />
      </div>

      <AboutBrandWall />

      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <HomeFinalCta
          productsHref={productsHref}
          inquiryHref={inquiryHref}
          headingId="nosotros-cta-heading"
          eyebrow="Consultanos"
          title="¿Necesitás ayuda para encontrar el producto adecuado?"
          description="Contanos qué buscás y te orientamos entre los productos del catálogo."
          productsLabel="Explorar catálogo"
          inquiryLabel="Enviar consulta"
        />
      </div>
    </div>
  )
}
