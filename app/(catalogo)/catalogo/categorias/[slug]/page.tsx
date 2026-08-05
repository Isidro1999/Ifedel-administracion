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
import { ProductGrid } from '@/components/catalog/ProductGrid'
import { CatalogPagination } from '@/components/catalog/CatalogPagination'
import { CatalogBrandChips } from '@/components/catalog/CatalogBrandChips'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'

export const revalidate = 60

type PageProps = {
  params: { slug: string }
  searchParams: Record<string, string | string[] | undefined>
}

function first(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? ''
  return v ?? ''
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  try {
    const cats = await fetchCatalogCategories()
    const cat = cats.find((c) => c.slug === params.slug)
    return {
      title: cat ? cat.name : 'Categoría',
    }
  } catch {
    return { title: 'Categoría' }
  }
}

export default async function CatalogoCategoriaPage({
  params,
  searchParams,
}: PageProps) {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  const p = (segment = '') => catalogPath(segment, onCatalogHost)
  const page = first(searchParams.page) || '1'
  const brand = first(searchParams.brand)

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
