import { Suspense } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogBrands,
  fetchCatalogCategories,
  fetchCatalogProducts,
  type CatalogBrand,
  type CatalogCategory,
  type CatalogProductsResponse,
} from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import {
  catalogListingSeo,
  firstSearchParam,
  PRODUCTOS_UTILITY_PARAM_KEYS,
  hasUtilitySearchParams,
} from '@/lib/catalog-seo'
import { ProductFilters } from '@/components/catalog/ProductFilters'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'

export const revalidate = 60

const PRODUCTOS_DESCRIPTION =
  'Consultá productos agropecuarios, identificación animal, pesaje, caravanas, lectores y soluciones rurales.'

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * `/productos` indexable; cualquier query utilitaria → noindex,follow.
 * Si el único filtro es `category` (= slug) y es categoría pública,
 * canonical → `/categorias/[slug]`; si no → `/productos`.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const q = firstSearchParam(searchParams.q)
  const brand = firstSearchParam(searchParams.brand)
  const category = firstSearchParam(searchParams.category)
  const page = firstSearchParam(searchParams.page)
  const sort = firstSearchParam(searchParams.sort)

  const hasUtility = hasUtilitySearchParams(
    searchParams,
    PRODUCTOS_UTILITY_PARAM_KEYS,
  )

  let canonicalPath = '/productos'

  if (hasUtility) {
    const onlyCategory =
      Boolean(category) &&
      !q &&
      !brand &&
      !sort &&
      (!page || page === '1')

    if (onlyCategory) {
      try {
        const cats = await fetchCatalogCategories()
        const cat = cats.find((c) => c.slug === category)
        if (cat) {
          canonicalPath = `/categorias/${cat.slug}`
        }
      } catch {
        // fallback: /productos
      }
    }
  }

  return {
    title: 'Productos',
    description: PRODUCTOS_DESCRIPTION,
    ...catalogListingSeo({
      hasUtilityParams: hasUtility,
      canonicalPath,
    }),
  }
}

function devError(label: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(label, err)
  }
}

export default async function CatalogoProductosPage({ searchParams }: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)
  const productosBase = p('productos')

  const q = firstSearchParam(searchParams.q)
  const category = firstSearchParam(searchParams.category)
  const brand = firstSearchParam(searchParams.brand)
  const page = firstSearchParam(searchParams.page) || '1'

  let products: CatalogProductsResponse | null = null
  let categories: CatalogCategory[] = []
  let brands: CatalogBrand[] = []
  let productsError = false
  let facetsError = false

  const productsResult = await fetchCatalogProducts({
    q: q || undefined,
    category: category || undefined,
    brand: brand || undefined,
    page,
    pageSize: '12',
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/productos] products error', err)
      return { ok: false as const, data: null }
    })

  if (productsResult.ok) {
    products = productsResult.data
  } else {
    productsError = true
  }

  const [catsResult, brandsResult] = await Promise.all([
    fetchCatalogCategories()
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        devError('[catalogo/productos] categories error', err)
        return { ok: false as const, data: [] as CatalogCategory[] }
      }),
    fetchCatalogBrands()
      .then((data) => ({ ok: true as const, data }))
      .catch((err) => {
        devError('[catalogo/productos] brands error', err)
        return { ok: false as const, data: [] as CatalogBrand[] }
      }),
  ])

  categories = catsResult.data
  brands = brandsResult.data
  facetsError = !catsResult.ok || !brandsResult.ok

  const paginationParams = {
    ...(q ? { q } : {}),
    ...(category ? { category } : {}),
    ...(brand ? { brand } : {}),
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-ifedel-brown">
          Catálogo
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Productos
        </h1>
          <p className="mt-2 text-sm text-slate-600">
            Filtrá por categoría o marca y abrí la ficha de cada producto.
          </p>
          <div className="mt-3">
            <CatalogPriceDisclaimer />
          </div>
        </div>

      <div id="categorias">
        <Suspense
          fallback={
            <div className="h-24 animate-pulse rounded-2xl bg-white/60" />
          }
        >
          <ProductFilters
            categories={categories}
            brands={brands}
            basePath={productosBase}
          />
        </Suspense>
        {facetsError ? (
          <p className="mt-2 text-xs text-amber-800">
            Algunos filtros no se pudieron cargar; el listado sigue disponible.
          </p>
        ) : null}
      </div>

      {productsError ? (
        <EmptyCatalogState
          title="No pudimos cargar los productos"
          description="Reintentá en unos minutos. Si el problema continúa, escribinos por WhatsApp."
          showCta={false}
        />
      ) : products ? (
        <>
          <p className="text-sm text-slate-500">
            {products.pagination.total} resultado
            {products.pagination.total === 1 ? '' : 's'}
          </p>
          <ProductGrid
            products={products.items}
            emptyTitle="No hay productos con estos filtros"
            emptyDescription="Probá limpiar la búsqueda o elegir otra categoría/marca."
          />
          <CatalogPagination
            basePath={productosBase}
            page={products.pagination.page}
            totalPages={products.pagination.totalPages}
            params={paginationParams}
          />
        </>
      ) : null}
    </div>
  )
}
