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
import { ProductFilters } from '@/components/catalog/ProductFilters'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'

export const revalidate = 60

export const metadata: Metadata = {
  title: 'Productos',
  description:
    'Consultá productos agropecuarios, identificación animal, pesaje, caravanas, lectores y soluciones rurales.',
}

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
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

  const q = first(searchParams.q)
  const category = first(searchParams.category)
  const brand = first(searchParams.brand)
  const page = first(searchParams.page) || '1'

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
