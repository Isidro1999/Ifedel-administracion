import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationNav } from '@/components/ui/PaginationNav'
import { requireAdminPage } from '@/lib/admin-auth'
import { listAdminCatalogProducts } from '@/lib/admin-catalog'
import type { PaginationSearchParams } from '@/lib/pagination'
import { CatalogFiltersForm } from './CatalogFiltersForm'
import { CatalogTable } from './CatalogTable'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = {
  searchParams?: PaginationSearchParams
}

export default async function AdminCatalogPage({ searchParams }: PageProps) {
  await requireAdminPage()

  const result = await listAdminCatalogProducts(searchParams)
  const { items, pagination, filters, facets } = result
  const empty = pagination.total === 0

  const navParams: Record<string, string> = {
    pageSize: String(pagination.pageSize),
    published: filters.published,
    hasImage: filters.hasImage,
    isActive: filters.isActive,
    featured: filters.featured,
  }
  if (filters.q) navParams.q = filters.q
  if (filters.brand) navParams.brand = filters.brand
  if (filters.categoryRoot) navParams.categoryRoot = filters.categoryRoot
  if (filters.category) navParams.category = filters.category

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <PageHeader
        title="Catálogo online"
        description="Publicar y despublicar productos"
      />

      <CatalogFiltersForm
        filters={filters}
        brands={facets.brands}
        categoryRoots={facets.categoryRoots}
        categories={facets.categories}
        pageSize={pagination.pageSize}
      />

      {empty ? (
        <EmptyState
          title="No hay productos con estos filtros"
          description="Probá ampliar la búsqueda o restablecer los filtros. El default muestra productos activos, con imagen y aún no publicados."
          actionLabel="Restablecer filtros"
          actionHref="/admin/catalog?published=false&hasImage=true&isActive=true&featured=all"
        />
      ) : (
        <div className="min-w-0 max-w-full">
          <SectionCard
            title="Productos"
            description={`${pagination.total} resultado${pagination.total === 1 ? '' : 's'} · página ${pagination.page} de ${pagination.totalPages}`}
          >
            <div className="min-w-0 max-w-full">
              <CatalogTable items={items} />
            </div>
            <PaginationNav
              pathname="/admin/catalog"
              page={pagination.page}
              totalPages={pagination.totalPages}
              total={pagination.total}
              searchParams={navParams}
            />
          </SectionCard>
        </div>
      )}
    </div>
  )
}
