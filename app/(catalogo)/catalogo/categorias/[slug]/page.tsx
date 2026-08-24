import Link from 'next/link'
import { Suspense, type ReactNode } from 'react'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchCatalogBrands,
  fetchCatalogCategoryBySlug,
  fetchCatalogProducts,
  type CatalogBrand,
  type CatalogProductsResponse,
} from '@/lib/catalog-client'
import type { CatalogCategoryResolved } from '@/lib/catalog-category-public'
import { catalogPath } from '@/lib/catalog-paths'
import {
  catalogListingSeo,
  CATEGORIA_UTILITY_PARAM_KEYS,
  hasUtilitySearchParams,
} from '@/lib/catalog-seo'
import {
  catalogCategoryMetaDescription,
  catalogCategoriaLeafPaginationParams,
  catalogCategoriaRootPaginationParams,
  isPublicCategoryPageVisible,
  parseCatalogCategoriaLeafState,
  parseCatalogCategoriaRootState,
  sanitizeRootLeafFilter,
  visibleRootChildren,
} from '@/lib/catalog-categoria-url'
import { sanitizeBrandForContext } from '@/lib/catalog-productos-url'
import { buildCatalogContactWhatsAppUrl } from '@/lib/catalog-whatsapp'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import {
  catalogCategorySocialImagePath,
  catalogSocialMetadata,
} from '@/lib/catalog-social-metadata'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import {
  CatalogBreadcrumb,
  buildCategoryLeafBreadcrumbItems,
  buildCategoryRootBreadcrumbItems,
} from '@/components/catalog/CatalogBreadcrumb'
import { CatalogCategoryHero } from '@/components/catalog/CatalogCategoryHero'
import { CatalogSubcategoryCard } from '@/components/catalog/CatalogSubcategoryCard'
import { CatalogCategoryHubFilters } from '@/components/catalog/CatalogCategoryHubFilters'
import { CatalogCategoryLeafFilters } from '@/components/catalog/CatalogCategoryLeafFilters'
import { CatalogCategoryContactCta } from '@/components/catalog/CatalogCategoryContactCta'
import { JsonLd } from '@/components/catalog/JsonLd'
import { buildCategoryBreadcrumbJsonLd } from '@/lib/catalog-structured-data'

export const revalidate = 60

type PageProps = {
  params: { slug: string }
  searchParams: Record<string, string | string[] | undefined>
}

async function loadCategory(slug: string): Promise<{
  category: CatalogCategoryResolved | null
  error: boolean
}> {
  try {
    const category = await fetchCatalogCategoryBySlug(slug)
    return { category, error: false }
  } catch (err) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalogo/categorias] loadCategory error', err)
    }
    return { category: null, error: true }
  }
}

export async function generateMetadata({
  params,
  searchParams,
}: PageProps): Promise<Metadata> {
  const hasUtility = hasUtilitySearchParams(
    searchParams,
    CATEGORIA_UTILITY_PARAM_KEYS,
  )
  const canonicalPath = `/categorias/${params.slug}`

  const { category, error } = await loadCategory(params.slug)
  if (error || !category || !isPublicCategoryPageVisible(category)) {
    return {
      title: 'Categoría',
      ...catalogListingSeo({
        hasUtilityParams: hasUtility,
        canonicalPath,
      }),
      ...catalogSocialMetadata({
        title: 'Categoría | Catálogo IFEDEL',
        description: 'Productos de IFEDEL.',
        path: `categorias/${params.slug}`,
      }),
    }
  }

  const description = catalogCategoryMetaDescription(category)
  const title = `${category.name} | Catálogo IFEDEL`

  return {
    title: category.name,
    description,
    ...catalogListingSeo({
      hasUtilityParams: hasUtility,
      canonicalPath,
    }),
    ...catalogSocialMetadata({
      title,
      description,
      path: `categorias/${category.slug}`,
      image: catalogCategorySocialImagePath(category.slug),
      imageAlt: category.name,
    }),
  }
}

function devError(label: string, err: unknown) {
  if (process.env.NODE_ENV === 'development') {
    console.error(label, err)
  }
}

type SharedLayoutProps = {
  children: ReactNode
  breadcrumb: ReactNode
  jsonLd: Record<string, unknown>
}

function CategoryPageShell({ children, breadcrumb, jsonLd }: SharedLayoutProps) {
  return (
    <div className="mx-auto max-w-[1400px] space-y-5 px-4 py-8 sm:space-y-6 sm:px-6 sm:py-10">
      <JsonLd data={jsonLd} />
      {breadcrumb}
      {children}
    </div>
  )
}

async function CategoryRootView({
  category,
  searchParams,
  p,
  contactHref,
}: {
  category: CatalogCategoryResolved & { kind: 'root' }
  searchParams: PageProps['searchParams']
  p: (segment?: string) => string
  contactHref: string
}) {
  const state = parseCatalogCategoriaRootState(searchParams)
  const children = visibleRootChildren(category)
  const effectiveLeaf = sanitizeRootLeafFilter(state.category, category)
  const categoryBase = p(`categorias/${category.slug}`)
  const productosRootHref = `${p('productos')}?categoryRoot=${encodeURIComponent(category.slug)}`

  let brands: CatalogBrand[] = []
  let products: CatalogProductsResponse | null = null
  let productsError = false
  let facetsError = false

  const brandsResult = await fetchCatalogBrands({
    categoryRoot: category.slug,
    category: effectiveLeaf || undefined,
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/categorias/root] brands error', err)
      return { ok: false as const, data: [] as CatalogBrand[] }
    })

  brands = brandsResult.data
  if (!brandsResult.ok) facetsError = true

  const effectiveBrand = sanitizeBrandForContext(state.brand, brands)

  const productsResult = await fetchCatalogProducts({
    categoryRoot: effectiveLeaf ? undefined : category.slug,
    category: effectiveLeaf || undefined,
    brand: effectiveBrand || undefined,
    sort: state.sort,
    page: String(state.page),
    pageSize: '12',
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/categorias/root] products error', err)
      return { ok: false as const, data: null }
    })

  if (productsResult.ok) {
    products = productsResult.data
  } else {
    productsError = true
  }

  const paginationParams = catalogCategoriaRootPaginationParams({
    ...state,
    category: effectiveLeaf,
    brand: effectiveBrand,
  })

  const breadcrumb = (
    <CatalogBreadcrumb
      items={buildCategoryRootBreadcrumbItems({
        homeHref: p(),
        categoriasHref: p('productos'),
        rootName: category.name,
      })}
    />
  )

  const jsonLd = buildCategoryBreadcrumbJsonLd({
    kind: 'root',
    root: { name: category.name, slug: category.slug },
  })

  const description = catalogCategoryMetaDescription(category)

  return (
    <CategoryPageShell breadcrumb={breadcrumb} jsonLd={jsonLd}>
      <CatalogCategoryHero
        category={category}
        description={description}
        variant="root"
      />

      {children.length > 0 ? (
        <section className="space-y-4 pt-1">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              Explorá por subcategoría
            </h2>
            <Link
              href={productosRootHref}
              className="text-sm font-medium text-ifedel-brown hover:underline"
            >
              Ver en todos los productos
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {children.map((leaf) => (
              <CatalogSubcategoryCard
                key={leaf.id}
                category={leaf}
                href={p(`categorias/${leaf.slug}`)}
              />
            ))}
          </div>
        </section>
      ) : (
        <EmptyCatalogState
          title="Sin subcategorías publicadas"
          description="Todavía no hay subcategorías con productos visibles en esta categoría."
          showCta={false}
        />
      )}

      <section className="space-y-4 border-t border-slate-200/80 pt-8 sm:pt-10">
        <div className="space-y-3">
          <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            Todos los productos de {category.name}
          </h2>

          <Suspense
            fallback={
              <div className="h-12 animate-pulse rounded-xl bg-white/60" />
            }
          >
            <CatalogCategoryHubFilters
              basePath={categoryBase}
              children={children}
              brands={brands}
            />
          </Suspense>
        </div>

        {facetsError ? (
          <p className="text-xs text-amber-800">
            Algunos filtros no se pudieron cargar; el listado sigue disponible.
          </p>
        ) : null}

        {productsError ? (
          <EmptyCatalogState
            title="No pudimos cargar los productos"
            description="Reintentá en unos minutos."
            showCta={false}
          />
        ) : products ? (
          <>
            <p className="text-sm font-medium text-slate-700">
              {products.pagination.total} resultado
              {products.pagination.total === 1 ? '' : 's'}
            </p>
            <Suspense fallback={null}>
              <ProductGrid
                products={products.items}
                emptyTitle="No encontramos productos con estos filtros"
                emptyDescription="Probá limpiar los filtros o elegir otra subcategoría o marca."
                gridClassName="grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
              />
            </Suspense>
            <CatalogPagination
              basePath={categoryBase}
              page={products.pagination.page}
              totalPages={products.pagination.totalPages}
              params={paginationParams}
            />
          </>
        ) : null}
      </section>

      <CatalogCategoryContactCta
        contactHref={contactHref}
        className="mt-2"
      />
    </CategoryPageShell>
  )
}

async function CategoryLeafView({
  category,
  searchParams,
  p,
  contactHref,
}: {
  category: CatalogCategoryResolved & { kind: 'leaf' }
  searchParams: PageProps['searchParams']
  p: (segment?: string) => string
  contactHref: string
}) {
  if (!category.parent) notFound()

  const state = parseCatalogCategoriaLeafState(searchParams)
  const categoryBase = p(`categorias/${category.slug}`)
  const rootHref = p(`categorias/${category.parent.slug}`)

  let brands: CatalogBrand[] = []
  let products: CatalogProductsResponse | null = null
  let productsError = false
  let facetsError = false

  const brandsResult = await fetchCatalogBrands({ category: category.slug })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/categorias/leaf] brands error', err)
      return { ok: false as const, data: [] as CatalogBrand[] }
    })

  brands = brandsResult.data
  if (!brandsResult.ok) facetsError = true

  const effectiveBrand = sanitizeBrandForContext(state.brand, brands)

  const productsResult = await fetchCatalogProducts({
    category: category.slug,
    brand: effectiveBrand || undefined,
    sort: state.sort,
    page: String(state.page),
    pageSize: '12',
  })
    .then((data) => ({ ok: true as const, data }))
    .catch((err) => {
      devError('[catalogo/categorias/leaf] products error', err)
      return { ok: false as const, data: null }
    })

  if (productsResult.ok) {
    products = productsResult.data
  } else {
    productsError = true
  }

  const paginationParams = catalogCategoriaLeafPaginationParams({
    ...state,
    brand: effectiveBrand,
  })

  const breadcrumb = (
    <CatalogBreadcrumb
      items={buildCategoryLeafBreadcrumbItems({
        homeHref: p(),
        categoriasHref: p('productos'),
        rootName: category.parent.name,
        rootHref,
        leafName: category.name,
      })}
    />
  )

  const jsonLd = buildCategoryBreadcrumbJsonLd({
    kind: 'leaf',
    root: { name: category.parent.name, slug: category.parent.slug },
    leaf: { name: category.name, slug: category.slug },
  })

  const description = catalogCategoryMetaDescription(category)

  return (
    <CategoryPageShell breadcrumb={breadcrumb} jsonLd={jsonLd}>
      <CatalogCategoryHero
        category={category}
        description={description}
        variant="leaf"
      />

      <Link
        href={rootHref}
        className="inline-flex text-sm font-medium text-ifedel-brown hover:underline"
      >
        ← Volver a {category.parent.name}
      </Link>

      <section className="space-y-4">
        <Suspense
          fallback={
            <div className="h-20 animate-pulse rounded-2xl bg-white/60" />
          }
        >
          <CatalogCategoryLeafFilters basePath={categoryBase} brands={brands} />
        </Suspense>

        {facetsError ? (
          <p className="text-xs text-amber-800">
            Algunos filtros no se pudieron cargar; el listado sigue disponible.
          </p>
        ) : null}

        {productsError ? (
          <EmptyCatalogState
            title="No pudimos cargar los productos"
            description="Reintentá en unos minutos."
            showCta={false}
          />
        ) : products ? (
          <>
            <p className="text-sm font-medium text-slate-700">
              {products.pagination.total} resultado
              {products.pagination.total === 1 ? '' : 's'}
            </p>
            <Suspense fallback={null}>
              <ProductGrid
                products={products.items}
                emptyTitle="No encontramos productos con estos filtros"
                emptyDescription="Probá limpiar los filtros o elegir otra marca."
                gridClassName="grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
              />
            </Suspense>
            <CatalogPagination
              basePath={categoryBase}
              page={products.pagination.page}
              totalPages={products.pagination.totalPages}
              params={paginationParams}
            />
          </>
        ) : null}
      </section>

      <CatalogCategoryContactCta contactHref={contactHref} />
    </CategoryPageShell>
  )
}

export default async function CatalogoCategoriaPage({
  params,
  searchParams,
}: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)
  const contactHref =
    buildCatalogContactWhatsAppUrl() ??
    `tel:${IFEDelBrand.phone.replace(/\s/g, '')}`

  const { category, error: loadError } = await loadCategory(params.slug)

  if (loadError) {
    return (
      <div className="mx-auto max-w-[1400px] space-y-6 px-4 py-10 sm:px-6">
        <EmptyCatalogState
          title="No pudimos cargar esta categoría"
          description="Reintentá en unos minutos. Si el problema continúa, escribinos por WhatsApp."
          showCta={false}
        />
      </div>
    )
  }

  if (!category || !isPublicCategoryPageVisible(category)) {
    notFound()
  }

  if (category.kind === 'root') {
    return (
      <CategoryRootView
        category={category as CatalogCategoryResolved & { kind: 'root' }}
        searchParams={searchParams}
        p={p}
        contactHref={contactHref}
      />
    )
  }

  return (
    <CategoryLeafView
      category={category as CatalogCategoryResolved & { kind: 'leaf' }}
      searchParams={searchParams}
      p={p}
      contactHref={contactHref}
    />
  )
}
