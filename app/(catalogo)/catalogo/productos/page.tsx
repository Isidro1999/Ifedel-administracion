import Link from 'next/link'
import { Suspense } from 'react'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import {
  fetchCatalogBrands,
  fetchCatalogCategoryTree,
  fetchCatalogProducts,
  type CatalogBrand,
  type CatalogProductsResponse,
} from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import {
  catalogListingSeo,
  firstSearchParam,
  PRODUCTOS_UTILITY_PARAM_KEYS,
  hasUtilitySearchParams,
} from '@/lib/catalog-seo'
import { catalogSocialMetadata } from '@/lib/catalog-social-metadata'
import {
  catalogProductosPaginationParams,
  parseCatalogProductosState,
  sanitizeBrandForContext,
} from '@/lib/catalog-productos-url'
import { buildCatalogContactWhatsAppUrl } from '@/lib/catalog-whatsapp'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'
import { CatalogCategorySidebar } from '@/components/catalog/CatalogCategorySidebar'
import { CatalogProductosFilters } from '@/components/catalog/CatalogProductosFilters'
import { CatalogActiveFilterChips } from '@/components/catalog/CatalogActiveFilterChips'
import { CatalogFilterDrawer } from '@/components/catalog/CatalogFilterDrawer'

export const revalidate = 60

const PRODUCTOS_DESCRIPTION =
  'Explorá nuestro catálogo de insumos y equipamiento para el campo.'

type PageProps = {
  searchParams: Record<string, string | string[] | undefined>
}

/**
 * `/productos` indexable; cualquier query utilitaria → noindex,follow.
 * Si el único filtro es `category` (= slug hoja) sin `categoryRoot` y es categoría pública,
 * canonical → `/categorias/[slug]`; si no → `/productos`.
 */
export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const q = firstSearchParam(searchParams.q)
  const brand = firstSearchParam(searchParams.brand)
  const category = firstSearchParam(searchParams.category)
  const categoryRoot = firstSearchParam(searchParams.categoryRoot)
  const page = firstSearchParam(searchParams.page)
  const sort = firstSearchParam(searchParams.sort)

  const hasUtility = hasUtilitySearchParams(
    searchParams,
    PRODUCTOS_UTILITY_PARAM_KEYS,
  )

  let canonicalPath = '/productos'

  if (hasUtility) {
    const onlyLeafCategory =
      Boolean(category) &&
      !categoryRoot &&
      !q &&
      !brand &&
      !sort &&
      (!page || page === '1')

    if (onlyLeafCategory) {
      try {
        const tree = await fetchCatalogCategoryTree()
        const isLeaf = tree.some((root) =>
          (root.children ?? []).some((c) => c.slug === category),
        )
        if (isLeaf) {
          canonicalPath = `/categorias/${category}`
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
    ...catalogSocialMetadata({
      title: 'Productos | Catálogo IFEDEL',
      description: PRODUCTOS_DESCRIPTION,
      path: 'productos',
    }),
  }
}

function devError(label: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(label, err)
  }
}

function FiltersFallback() {
  return (
    <div className="h-24 animate-pulse rounded-2xl bg-white/60 lg:h-32" />
  )
}

export default async function CatalogoProductosPage({ searchParams }: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)
  const productosBase = p('productos')
  const contactHref =
    buildCatalogContactWhatsAppUrl() ??
    `tel:${IFEDelBrand.phone.replace(/\s/g, '')}`

  const state = parseCatalogProductosState(searchParams)

  let tree: CatalogCategoryNode[] = []
  let brands: CatalogBrand[] = []
  let products: CatalogProductsResponse | null = null
  let productsError = false
  let facetsError = false

  const treeResult = await fetchCatalogCategoryTree()
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/productos] category tree error', err)
      return { ok: false as const, data: [] as CatalogCategoryNode[] }
    })

  tree = treeResult.data
  facetsError = !treeResult.ok

  const brandsResult = await fetchCatalogBrands({
    categoryRoot: state.categoryRoot || undefined,
    category: state.category || undefined,
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/productos] brands error', err)
      return { ok: false as const, data: [] as CatalogBrand[] }
    })

  brands = brandsResult.data
  if (!brandsResult.ok) facetsError = true

  const effectiveBrand = sanitizeBrandForContext(state.brand, brands)

  const productsResult = await fetchCatalogProducts({
    q: state.q || undefined,
    categoryRoot: state.categoryRoot || undefined,
    category: state.category || undefined,
    brand: effectiveBrand || undefined,
    sort: state.sort,
    page: String(state.page),
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

  const paginationParams = catalogProductosPaginationParams({
    ...state,
    brand: effectiveBrand,
  })

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-3">
        <nav className="text-sm text-slate-500" aria-label="Breadcrumb">
          <Link href={p()} className="hover:text-ifedel-brown">
            Inicio
          </Link>
          <span className="mx-2 text-slate-400" aria-hidden>
            →
          </span>
          <span className="text-slate-700">Productos</span>
        </nav>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Productos
          </h1>
          <p className="mt-2 text-sm text-slate-600">{PRODUCTOS_DESCRIPTION}</p>
          <div className="mt-3">
            <CatalogPriceDisclaimer />
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8 lg:space-y-0">
        <div className="hidden lg:block">
          <CatalogCategorySidebar
            tree={tree}
            state={{ ...state, brand: effectiveBrand }}
            basePath={productosBase}
            contactHref={contactHref}
          />
        </div>

        <div className="min-w-0 space-y-4">
          <Suspense fallback={<FiltersFallback />}>
            <CatalogFilterDrawer
              tree={tree}
              brands={brands}
              basePath={productosBase}
            />
          </Suspense>

          <Suspense fallback={<FiltersFallback />}>
            <CatalogProductosFilters
              tree={tree}
              brands={brands}
              basePath={productosBase}
            />
          </Suspense>

          {facetsError ? (
            <p className="text-xs text-amber-800">
              Algunos filtros no se pudieron cargar; el listado sigue disponible.
            </p>
          ) : null}

          <Suspense fallback={null}>
            <CatalogActiveFilterChips
              tree={tree}
              brands={brands}
              basePath={productosBase}
            />
          </Suspense>

          {productsError ? (
            <EmptyCatalogState
              title="No pudimos cargar los productos"
              description="Reintentá en unos minutos. Si el problema continúa, escribinos por WhatsApp."
              showCta={false}
            />
          ) : products ? (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-700">
                  {products.pagination.total} resultado
                  {products.pagination.total === 1 ? '' : 's'}
                </p>
              </div>
              <Suspense fallback={null}>
                <ProductGrid
                  products={products.items}
                  emptyTitle="No hay productos con estos filtros"
                  emptyDescription="Probá limpiar la búsqueda o elegir otra categoría/marca."
                  gridClassName="grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
                />
              </Suspense>
              <CatalogPagination
                basePath={productosBase}
                page={products.pagination.page}
                totalPages={products.pagination.totalPages}
                params={paginationParams}
              />
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}
