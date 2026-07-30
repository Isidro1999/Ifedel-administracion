'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { btnSecondarySm, linkAccentXs } from '@/lib/ui-classes'
import type { AdminCatalogListItem } from '@/lib/admin-catalog'
import type {
  AdminCatalogAction,
  AdminCatalogValidateResult,
} from '@/lib/admin-catalog-validate'
import type { AdminCatalogBulkResult } from '@/lib/admin-catalog-bulk'
import { CatalogValidatePreview } from './CatalogValidatePreview'

type CatalogTableProps = {
  items: AdminCatalogListItem[]
}

function BoolPill({
  value,
  yesLabel = 'Sí',
  noLabel = 'No',
}: {
  value: boolean
  yesLabel?: string
  noLabel?: string
}) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        value
          ? 'bg-emerald-50 text-emerald-900 ring-emerald-500/25'
          : 'bg-slate-100 text-slate-600 ring-slate-500/20',
      ].join(' ')}
    >
      {value ? yesLabel : noLabel}
    </span>
  )
}

export function CatalogTable({ items }: CatalogTableProps) {
  const router = useRouter()
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [preview, setPreview] = useState<AdminCatalogValidateResult | null>(
    null,
  )
  const [bulkResult, setBulkResult] = useState<AdminCatalogBulkResult | null>(
    null,
  )
  const [applying, setApplying] = useState(false)

  const allIds = useMemo(() => items.map((i) => i.id), [items])
  const allSelected =
    items.length > 0 && items.every((i) => selected.has(i.id))
  const someSelected = selected.size > 0
  const selectedIds = useMemo(() => Array.from(selected), [selected])

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(allIds))
  }

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const runValidate = async (action: AdminCatalogAction, ids: number[]) => {
    if (ids.length === 0 || busy || applying) return
    setBusy(true)
    setActionError(null)
    setBulkResult(null)
    try {
      const res = await fetch('/api/admin/catalog/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          productIds: ids,
          options: { generateMissingSlug: true },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(
          typeof data.error === 'string'
            ? data.error
            : `Error ${res.status} al validar`,
        )
        return
      }
      setPreview(data as AdminCatalogValidateResult)
    } catch {
      setActionError('No se pudo conectar con el servidor')
    } finally {
      setBusy(false)
    }
  }

  const handleApply = async () => {
    if (!preview || applying) return
    setApplying(true)
    setActionError(null)
    try {
      const res = await fetch('/api/admin/catalog/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: preview.action,
          productIds: preview.items.map((i) => i.id),
          options: { generateMissingSlug: true },
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setActionError(
          typeof data.error === 'string'
            ? data.error
            : `Error ${res.status} al aplicar`,
        )
        return
      }
      setBulkResult(data as AdminCatalogBulkResult)
      setSelected(new Set())
      router.refresh()
    } catch {
      setActionError('No se pudo conectar con el servidor al aplicar')
    } finally {
      setApplying(false)
    }
  }

  const closePreview = () => {
    if (applying) return
    setPreview(null)
    setBulkResult(null)
  }

  const actionDisabled = !someSelected || busy || applying

  return (
    <div className="w-full min-w-0 max-w-full space-y-3">
      <div className="flex min-w-0 max-w-full flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2">
        <span className="shrink-0 text-xs text-slate-600">
          {someSelected
            ? `${selected.size} seleccionado${selected.size === 1 ? '' : 's'}`
            : 'Sin selección'}
        </span>
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => runValidate('publish', selectedIds)}
          className={`${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {busy ? 'Validando…' : 'Publicar'}
        </button>
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => runValidate('unpublish', selectedIds)}
          className={`${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Despublicar
        </button>
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => runValidate('feature', selectedIds)}
          className={`${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Destacar
        </button>
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => runValidate('unfeature', selectedIds)}
          className={`${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Quitar destacado
        </button>
        <button
          type="button"
          disabled={actionDisabled}
          onClick={() => runValidate('ensureSlug', selectedIds)}
          className={`${btnSecondarySm} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          Regenerar slug
        </button>
      </div>

      {actionError && (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
          {actionError}
        </p>
      )}

      <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-900/[0.04]">
        <table className="dashboard-table w-full min-w-[960px] text-sm">
          <thead>
            <tr>
              <th className="w-10 px-2 py-3 text-left sm:px-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Seleccionar todos en esta página"
                  className="h-4 w-4 rounded border-slate-300 text-ifedel-primary focus:ring-ifedel-primary"
                />
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Img
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                SKU
              </th>
              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Título
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Marca
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Categoría
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Activo
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Imagen
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Publicado
              </th>
              <th className="px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Slug
              </th>
              <th
                className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3"
                title="Mostrar precio"
              >
                Precio
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Destacado
              </th>
              <th className="whitespace-nowrap px-2 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500 sm:px-3">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const displayTitle = item.publicTitle?.trim() || item.title
              return (
                <tr
                  key={item.id}
                  className="border-t border-slate-100 hover:bg-slate-50/80"
                >
                  <td className="px-2 py-2 sm:px-3">
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleOne(item.id)}
                      aria-label={`Seleccionar ${item.sku}`}
                      className="h-4 w-4 rounded border-slate-300 text-ifedel-primary focus:ring-ifedel-primary"
                    />
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    {item.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.thumbnailUrl}
                        alt=""
                        width={40}
                        height={40}
                        className="h-9 w-9 rounded object-cover ring-1 ring-slate-200 sm:h-10 sm:w-10"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-100 text-[10px] text-slate-400 ring-1 ring-slate-200 sm:h-10 sm:w-10">
                        —
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 font-mono text-xs text-slate-700 sm:px-3">
                    {item.sku}
                  </td>
                  <td className="max-w-[10rem] px-2 py-2 sm:max-w-[14rem] sm:px-3 lg:max-w-[18rem]">
                    <div
                      className="truncate font-medium text-slate-900"
                      title={displayTitle}
                    >
                      {displayTitle}
                    </div>
                    {item.publicTitle?.trim() &&
                      item.publicTitle.trim() !== item.title && (
                        <div
                          className="truncate text-[11px] text-slate-400"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                      )}
                  </td>
                  <td className="max-w-[6rem] px-2 py-2 sm:px-3">
                    <span
                      className="block truncate text-slate-600"
                      title={item.brand.name}
                    >
                      {item.brand.name}
                    </span>
                  </td>
                  <td className="max-w-[6rem] px-2 py-2 sm:px-3">
                    <span
                      className="block truncate text-slate-600"
                      title={item.category.name}
                    >
                      {item.category.name}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <BoolPill value={item.isActive} />
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <BoolPill value={item.hasImage} />
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <BoolPill
                      value={item.catalogVisible}
                      yesLabel="Sí"
                      noLabel="No"
                    />
                  </td>
                  <td className="max-w-[7rem] px-2 py-2 sm:max-w-[10rem] sm:px-3">
                    <span
                      className="block truncate font-mono text-[11px] text-slate-500"
                      title={item.slug || undefined}
                    >
                      {item.slug || '—'}
                    </span>
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <BoolPill value={item.showPrice} />
                  </td>
                  <td className="px-2 py-2 sm:px-3">
                    <BoolPill value={item.isFeatured} />
                  </td>
                  <td className="whitespace-nowrap px-2 py-2 text-right sm:px-3">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Link
                        href={`/admin/products/${item.id}/edit`}
                        className={linkAccentXs}
                        prefetch={false}
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        disabled={busy || applying}
                        onClick={() =>
                          runValidate(
                            item.catalogVisible ? 'unpublish' : 'publish',
                            [item.id],
                          )
                        }
                        className={`${linkAccentXs} disabled:cursor-not-allowed disabled:opacity-50`}
                      >
                        {item.catalogVisible ? 'Despublicar' : 'Publicar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {preview && (
        <CatalogValidatePreview
          result={preview}
          bulkResult={bulkResult}
          applying={applying}
          onClose={closePreview}
          onApply={handleApply}
        />
      )}
    </div>
  )
}
