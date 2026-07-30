import Link from 'next/link'
import { btnSecondarySm } from '@/lib/ui-classes'
import type {
  AdminCatalogFacetOption,
  AdminCatalogFilters,
  TriFilter,
} from '@/lib/admin-catalog'

type CatalogFiltersFormProps = {
  filters: AdminCatalogFilters
  brands: AdminCatalogFacetOption[]
  categories: AdminCatalogFacetOption[]
  pageSize: number
}

const TRI_OPTIONS: { value: TriFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'true', label: 'Sí' },
  { value: 'false', label: 'No' },
]

const selectClass =
  'w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary'

const labelClass = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500'

export function CatalogFiltersForm({
  filters,
  brands,
  categories,
  pageSize,
}: CatalogFiltersFormProps) {
  return (
    <form
      method="get"
      action="/admin/catalog"
      className="w-full min-w-0 max-w-full space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <input type="hidden" name="pageSize" value={String(pageSize)} />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="flex min-w-0 flex-col gap-1 sm:col-span-2">
          <span className={labelClass}>Buscar</span>
          <input
            type="search"
            name="q"
            defaultValue={filters.q}
            placeholder="SKU, título o título público"
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Marca</span>
          <select
            name="brand"
            defaultValue={filters.brand}
            className={selectClass}
          >
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Categoría</span>
          <select
            name="category"
            defaultValue={filters.category}
            className={selectClass}
          >
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Publicado</span>
          <select
            name="published"
            defaultValue={filters.published}
            className={selectClass}
          >
            {TRI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Tiene imagen</span>
          <select
            name="hasImage"
            defaultValue={filters.hasImage}
            className={selectClass}
          >
            {TRI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Activo</span>
          <select
            name="isActive"
            defaultValue={filters.isActive}
            className={selectClass}
          >
            {TRI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Destacado</span>
          <select
            name="featured"
            defaultValue={filters.featured}
            className={selectClass}
          >
            {TRI_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <button type="submit" className={btnSecondarySm}>
          Aplicar filtros
        </button>
        <Link
          href="/admin/catalog?published=false&hasImage=true&isActive=true&featured=all"
          className={btnSecondarySm}
          prefetch={false}
        >
          Restablecer
        </Link>
        <span className="max-w-full text-[11px] text-slate-400">
          Default: no publicados · con imagen · activos
        </span>
      </div>
    </form>
  )
}
