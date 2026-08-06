import Link from 'next/link'
import {
  COMMERCIAL_INQUIRY_SOURCES,
  COMMERCIAL_INQUIRY_SOURCE_LABELS,
  COMMERCIAL_INQUIRY_STATUSES,
  COMMERCIAL_INQUIRY_STATUS_LABELS,
} from '@/lib/catalog-inquiry-schemas'
import type { AdminInquiryFilters } from '@/lib/admin-catalog-inquiries'
import { btnSecondarySm } from '@/lib/ui-classes'

type InquiryFiltersFormProps = {
  filters: AdminInquiryFilters
  pageSize: number
}

const selectClass =
  'w-full min-w-0 max-w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary'

const labelClass =
  'text-[11px] font-semibold uppercase tracking-wide text-slate-500'

export function InquiryFiltersForm({
  filters,
  pageSize,
}: InquiryFiltersFormProps) {
  return (
    <form
      method="get"
      action="/admin/catalog/inquiries"
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
            placeholder="Referencia, cliente, empresa, teléfono o email"
            className="w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary"
          />
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Estado</span>
          <select
            name="status"
            defaultValue={filters.status}
            className={selectClass}
          >
            <option value="all">Todos los estados</option>
            {COMMERCIAL_INQUIRY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {COMMERCIAL_INQUIRY_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-0 flex-col gap-1">
          <span className={labelClass}>Origen</span>
          <select
            name="source"
            defaultValue={filters.source}
            className={selectClass}
          >
            <option value="all">Todos los orígenes</option>
            {COMMERCIAL_INQUIRY_SOURCES.map((s) => (
              <option key={s} value={s}>
                {COMMERCIAL_INQUIRY_SOURCE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          className="rounded-lg bg-ifedel-primary px-3.5 py-1.5 text-sm font-semibold text-black shadow-sm hover:brightness-105"
        >
          Aplicar filtros
        </button>
        <Link
          href="/admin/catalog/inquiries"
          className={btnSecondarySm}
        >
          Limpiar
        </Link>
      </div>
    </form>
  )
}
