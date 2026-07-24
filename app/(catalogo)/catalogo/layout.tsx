import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { CatalogHeader } from '@/components/catalog/CatalogHeader'
import { CatalogFooter } from '@/components/catalog/CatalogFooter'
import { CatalogPathProvider } from '@/components/catalog/CatalogPathProvider'
import { IFEDelBrand } from '@/lib/ifedel-brand'

export const metadata: Metadata = {
  title: {
    default: 'Catálogo IFEDEL',
    template: '%s | Catálogo IFEDEL',
  },
  description:
    'Catálogo online de productos y soluciones agropecuarias de IFEDEL.',
  openGraph: {
    title: 'Catálogo IFEDEL',
    description:
      'Catálogo online de productos y soluciones agropecuarias de IFEDEL.',
    siteName: IFEDelBrand.companyName,
  },
}

/**
 * Layout público del catálogo.
 * Sin AuthGuard / AppShell (RootShell los omite en host catálogo o /catalogo/*).
 */
export default function CatalogoLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'

  return (
    <CatalogPathProvider onCatalogHost={onCatalogHost}>
      <div className="flex min-h-screen flex-col bg-[#f4f7f0] text-slate-900">
        <CatalogHeader />
        <main className="flex-1">{children}</main>
        <CatalogFooter />
      </div>
    </CatalogPathProvider>
  )
}
