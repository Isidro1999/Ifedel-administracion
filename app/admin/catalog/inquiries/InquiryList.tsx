import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTableShell } from '@/components/ui/DataTableShell'
import {
  displayOptional,
  formatInquiryDate,
  formatInquiryDateTime,
  type AdminInquiryListItem,
} from '@/lib/admin-catalog-inquiries'
import {
  COMMERCIAL_INQUIRY_SOURCE_LABELS,
  type CommercialInquirySource,
} from '@/lib/catalog-inquiry-schemas'
import { linkAccentXs } from '@/lib/ui-classes'

type InquiryListProps = {
  items: AdminInquiryListItem[]
}

function sourceLabel(source: string): string {
  return (
    COMMERCIAL_INQUIRY_SOURCE_LABELS[source as CommercialInquirySource] ??
    source
  )
}

export function InquiryList({ items }: InquiryListProps) {
  return (
    <>
      {/* Mobile: cards */}
      <ul className="space-y-3 md:hidden">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={`/admin/catalog/inquiries/${item.id}`}
              className={[
                'block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-ifedel-primary/40',
                item.status === 'NEW' ? 'border-l-4 border-l-amber-400' : '',
              ].join(' ')}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs font-semibold text-slate-900">
                    {item.referenceNumber}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {item.customerName}
                  </p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>{formatInquiryDate(item.createdAt)}</span>
                <span>
                  {item.itemCount} producto
                  {item.itemCount === 1 ? '' : 's'}
                </span>
                {item.companyName ? <span>{item.companyName}</span> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: tabla */}
      <div className="hidden md:block">
        <DataTableShell>
          <table className="dashboard-table w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr>
                <th className="px-4 py-3">Referencia</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Empresa</th>
                <th className="px-4 py-3">Teléfono</th>
                <th className="px-4 py-3">Productos</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Origen</th>
                <th className="px-4 py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={
                    item.status === 'NEW'
                      ? 'bg-amber-50/50 hover:bg-amber-50/80'
                      : undefined
                  }
                >
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                    {item.referenceNumber}
                  </td>
                  <td
                    className="px-4 py-3 text-slate-600"
                    title={formatInquiryDateTime(item.createdAt)}
                  >
                    {formatInquiryDateTime(item.createdAt)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {item.customerName}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {displayOptional(item.companyName)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{item.phone}</td>
                  <td className="px-4 py-3 text-slate-700">{item.itemCount}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {sourceLabel(item.source)}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/catalog/inquiries/${item.id}`}
                      className={linkAccentXs}
                    >
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTableShell>
      </div>
    </>
  )
}
