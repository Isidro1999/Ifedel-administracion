import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { MetricCard } from '@/components/layout/MetricCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { PaginationNav } from '@/components/ui/PaginationNav'
import { requireAdminPage } from '@/lib/admin-auth'
import { listAdminCommercialInquiries } from '@/lib/admin-catalog-inquiries'
import type { PaginationSearchParams } from '@/lib/pagination'
import { InquiryFiltersForm } from './InquiryFiltersForm'
import { InquiryList } from './InquiryList'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = {
  searchParams?: PaginationSearchParams
}

export default async function AdminCatalogInquiriesPage({
  searchParams,
}: PageProps) {
  await requireAdminPage()

  const result = await listAdminCommercialInquiries(searchParams)
  const { items, pagination, filters, newCount } = result

  const hasActiveFilters =
    Boolean(filters.q) ||
    filters.status !== 'all' ||
    filters.source !== 'all'

  const navParams: Record<string, string> = {
    pageSize: String(pagination.pageSize),
    status: filters.status,
    source: filters.source,
  }
  if (filters.q) navParams.q = filters.q

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <PageHeader
        title="Consultas comerciales"
        description="Consultas recibidas desde el catálogo público. No son cotizaciones: son pedidos de contacto comercial."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard
          label="Nuevas"
          value={newCount}
          helper="Pendientes de primer contacto"
          tone={newCount > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label="En esta vista"
          value={pagination.total}
          helper={
            hasActiveFilters
              ? 'Resultados con filtros aplicados'
              : 'Total de consultas'
          }
        />
      </div>

      <InquiryFiltersForm
        filters={filters}
        pageSize={pagination.pageSize}
      />

      {pagination.total === 0 ? (
        <EmptyState
          title={
            hasActiveFilters
              ? 'No encontramos consultas que coincidan con los filtros aplicados.'
              : 'Todavía no se recibieron consultas comerciales desde el catálogo.'
          }
          description={
            hasActiveFilters
              ? 'Probá ampliar la búsqueda o limpiar los filtros.'
              : 'Cuando un visitante use “Solicitar contacto” en el catálogo, aparecerán acá.'
          }
          actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
          actionHref={
            hasActiveFilters ? '/admin/catalog/inquiries' : undefined
          }
        />
      ) : (
        <SectionCard
          title="Consultas"
          description={`${pagination.total} resultado${pagination.total === 1 ? '' : 's'} · página ${pagination.page} de ${pagination.totalPages}`}
        >
          <InquiryList items={items} />
          <PaginationNav
            pathname="/admin/catalog/inquiries"
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            searchParams={navParams}
          />
        </SectionCard>
      )}
    </div>
  )
}
