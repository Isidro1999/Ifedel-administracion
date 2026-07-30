import Link from 'next/link'
import type { CatalogProductListItem } from '@/lib/catalog-client'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { IFEDelBrand } from '@/lib/ifedel-brand'

type HomeV2FeaturedProductsProps = {
  products: CatalogProductListItem[]
  productsHref: string
  loadError?: boolean
}

export function HomeV2FeaturedProducts({
  products,
  productsHref,
  loadError = false,
}: HomeV2FeaturedProductsProps) {
  return (
    <section aria-labelledby="home-v2-destacados-heading">
      <div className="mb-6">
        <h2
          id="home-v2-destacados-heading"
          className="text-2xl font-bold tracking-tight text-slate-900"
        >
          Productos destacados
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Selección comercial de {IFEDelBrand.companyName}.
        </p>
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
        <ProductGrid products={products} priorityCount={3} />
      )}

      <div className="mt-8 text-center">
        <Link
          href={productsHref}
          className="inline-flex rounded-full bg-ifedel-brown px-6 py-3 text-sm font-semibold text-white transition hover:brightness-110"
        >
          Ver todos los productos
        </Link>
      </div>
    </section>
  )
}
