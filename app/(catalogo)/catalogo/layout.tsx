import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CatalogHeader } from '@/components/catalog/CatalogHeader'
import { CatalogFooter } from '@/components/catalog/CatalogFooter'
import { CatalogPathProvider } from '@/components/catalog/CatalogPathProvider'
import { CatalogPromotionBar } from '@/components/catalog/CatalogPromotionBar'
import { CatalogGoogleAnalytics } from '@/components/catalog/CatalogGoogleAnalytics'
import { getCatalogGaMeasurementId } from '@/lib/catalog-analytics'
import { CATALOG_PUBLIC_ORIGIN } from '@/lib/catalog-paths'
import {
  CATALOG_DEFAULT_OG_DESCRIPTION,
  catalogSocialMetadata,
} from '@/lib/catalog-social-metadata'

const LAYOUT_TITLE = 'Catálogo IFEDEL'

export const metadata: Metadata = {
  metadataBase: new URL(CATALOG_PUBLIC_ORIGIN),
  title: {
    default: LAYOUT_TITLE,
    template: '%s | Catálogo IFEDEL',
  },
  description: CATALOG_DEFAULT_OG_DESCRIPTION,
  robots: {
    index: true,
    follow: true,
  },
  ...catalogSocialMetadata({
    title: LAYOUT_TITLE,
    description: CATALOG_DEFAULT_OG_DESCRIPTION,
    path: '',
  }),
}

/**
 * Layout público del catálogo.
 * Sin AuthGuard / AppShell (RootShell los omite en host catálogo o /catalogo/*).
 * GA4 solo aquí (no en app/layout ni backoffice).
 */
export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const gaMeasurementId = getCatalogGaMeasurementId()

  return (
    <CatalogPathProvider onCatalogHost={onCatalogHost}>
      {gaMeasurementId ? (
        <CatalogGoogleAnalytics measurementId={gaMeasurementId} />
      ) : null}
      <div className="flex min-h-screen flex-col bg-[#f4f7f0] text-slate-900">
        <CatalogPromotionBar />
        <CatalogHeader />
        <main className="flex-1">{children}</main>
        <CatalogFooter />
      </div>
    </CatalogPathProvider>
  )
}
