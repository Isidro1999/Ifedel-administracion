import { Suspense } from 'react'
import Link from 'next/link'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  fetchCatalogBrands,
  fetchCatalogCategories,
  fetchCatalogProducts,
  type CatalogBrand,
} from '@/lib/catalog-client'
import { catalogPath } from '@/lib/catalog-paths'
import {
  catalogListingSeo,
  CATEGORIA_UTILITY_PARAM_KEYS,
  firstSearchParam,
  hasUtilitySearchParams,
} from '@/lib/catalog-seo'
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { CatalogBrandChips } from '@/components/catalog/CatalogBrandChips'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'
import { JsonLd } from '@/components/catalog/JsonLd'
import { buildCategoryBreadcrumbJsonLd } from '@/lib/catalog-structured-data'

export const revalidate = 60

type PageProps = {
  params: { slug: string }
  searchParams: Record<string, string | string[] | undefined>
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

  try {
    const cats = await fetchCatalogCategories()
    const cat = cats.find((c) => c.slug === params.slug)
    return {
      title: cat ? cat.name : 'Categoría',
      ...catalogListingSeo({
        hasUtilityParams: hasUtility,
        canonicalPath: cat ? `/categorias/${cat.slug}` : canonicalPath,
      }),
    }
  } catch {
    return {
      title: 'Categoría',
      ...catalogListingSeo({
        hasUtilityParams: hasUtility,
        canonicalPath,
      }),
    }
  }
}

export default async function CatalogoCategoriaPage({
  params,
  searchParams,
}: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)
  const page = firstSearchParam(searchParams.page) || '1'
  const brand = firstSearchParam(searchParams.brand)

  let categoryName = params.slug
  let products: Awaited<ReturnType<typeof fetchCatalogProducts>> | null = null
  let brands: CatalogBrand[] = []
  let error = false
  let missing = false

  try {
    const cats = await fetchCatalogCategories()
    const cat = cats.find((c) => c.slug === params.slug)
    if (!cat) {
      missing = true
    } else {
      categoryName = cat.name
      const [productsResult, brandsResult] = await Promise.all([
        fetchCatalogProducts({
          category: params.slug,
          brand: brand || undefined,
          page,
          pageSize: '12',
        })
          .then((data) => ({ ok: true as const, data }))
          .catch(() => ({ ok: false as const, data: null })),
        fetchCatalogBrands({ category: params.slug })
          .then((data) => ({ ok: true as const, data }))
          .catch(() => ({
            ok: false as const,
            data: [] as CatalogBrand[],
          })),
      ])
      if (productsResult.ok) {
        products = productsResult.data
      } else {
        error = true
      }
      brands = brandsResult.data
    }
  } catch {
    error = true
  }

  if (missing) notFound()

  const categoryBase = p(`categorias/${params.slug}`)
  const paginationParams = {
    ...(brand ? { brand } : {}),
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6">
      <JsonLd
        data={buildCategoryBreadcrumbJsonLd({
          name: categoryName,
          slug: params.slug,
        })}
      />
      <nav className="text-sm text-slate-500">
        <Link href={p()} className="hover:text-ifedel-brown">
          Inicio
        </Link>
        <span className="mx-2">/</span>
        <Link href={p('productos')} className="hover:text-ifedel-brown">
          Productos
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{categoryName}</span>
      </nav>

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          {categoryName}
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Productos publicados en esta categoría.
        </p>
        <div className="mt-3">
          <CatalogPriceDisclaimer />
        </div>
      </div>

      <CatalogBrandChips
        brands={brands}
        basePath={categoryBase}
        activeBrandSlug={brand}
      />

      <Suspense fallback={null}>
        {error ? (
          <EmptyCatalogState
            title="No pudimos cargar esta categoría"
            description="Reintentá en unos minutos."
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
              emptyTitle="No hay productos en esta categoría"
              emptyDescription="Pronto vamos a publicar más artículos aquí."
            />
            <CatalogPagination
              basePath={categoryBase}
              page={products.pagination.page}
              totalPages={products.pagination.totalPages}
              params={paginationParams}
            />
          </>
        ) : null}
      </Suspense>
    </div>
  )
}
