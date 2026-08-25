import Link from 'next/link'
import type { CatalogProductListItem } from '@/lib/catalog-client'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { HomeSectionHeading } from '@/components/catalog/home/HomeSectionHeading'
import { HomeFeaturedProductCard } from '@/components/catalog/home/HomeFeaturedProductCard'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'

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
      <div className="mb-5 -mt-2">
        <CatalogPriceDisclaimer />
      </div>

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
        <div className="grid grid-cols-1 gap-4 min-[400px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 lg:gap-5">
          {products.map((product, index) => (
            <HomeFeaturedProductCard
              key={product.id}
              product={product}
              priority={index === 0}
            />
          ))}
        </div>
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
