import Link from 'next/link'
import type { CatalogProductListItem } from '@/lib/catalog-client'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { HomeSectionHeading } from '@/components/catalog/home/HomeSectionHeading'

type HomeFeaturedProductsProps = {
  products: CatalogProductListItem[]
  productsHref: string
  loadError?: boolean
}

export function HomeFeaturedProducts({
  products,
  productsHref,
  loadError = false,
}: HomeFeaturedProductsProps) {
  return (
    <section aria-labelledby="home-destacados-heading">
      <HomeSectionHeading
        id="home-destacados-heading"
        title="Productos destacados"
        description={`Selección comercial de ${IFEDelBrand.companyName}.`}
      />

      {loadError ? (
        <EmptyCatalogState
          title="No pudimos cargar los destacados"
          description="Hubo un problema al obtener los datos. Probá de nuevo en unos minutos."
          showCta={false}
        />
      ) : products.length === 0 ? (
        <EmptyCatalogState
          title="Sin destacados por ahora"
          description="Cuando publiquemos productos destacados van a aparecer acá. Mientras tanto podés explorar el catálogo completo."
        />
      ) : (
        <ProductGrid products={products} priorityCount={1} />
      )}

      <div className="mt-8 text-center">
        <Link
          href={productsHref}
          className="inline-flex rounded-full bg-ifedel-brown px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-brown"
        >
          Ver todos los productos
        </Link>
      </div>
    </section>
  )
}
