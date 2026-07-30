'use client'

import { btnPrimary, btnSecondarySm } from '@/lib/ui-classes'
import type { AdminCatalogAction } from '@/lib/admin-catalog-validate'
import type { AdminCatalogValidateResult } from '@/lib/admin-catalog-validate'
import type { AdminCatalogBulkResult } from '@/lib/admin-catalog-bulk'

const ACTION_APPLY_LABEL: Record<AdminCatalogAction, string> = {
  publish: 'Publicar seleccionados',
  unpublish: 'Despublicar seleccionados',
  feature: 'Destacar seleccionados',
  unfeature: 'Quitar destacado',
  ensureSlug: 'Regenerar slugs',
}

type CatalogValidatePreviewProps = {
  result: AdminCatalogValidateResult
  bulkResult?: AdminCatalogBulkResult | null
  applying?: boolean
  onClose: () => void
  onApply?: () => void
}

const STATUS_LABEL: Record<string, string> = {
  ready: 'Listo',
  failed: 'Error',
  warning: 'Warning',
  skipped: 'Omitido',
  updated: 'Actualizado',
}

const STATUS_TONE: Record<string, string> = {
  ready: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
  failed: 'bg-rose-50 text-rose-900 ring-rose-500/25',
  warning: 'bg-amber-50 text-amber-900 ring-amber-500/25',
  skipped: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  updated: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
}

export function CatalogValidatePreview({
  result,
  bulkResult,
  applying = false,
  onClose,
  onApply,
}: CatalogValidatePreviewProps) {
  const { summary, items, action } = result
  const applicableCount = items.filter(
    (i) => i.status === 'ready' || i.status === 'warning',
  ).length
  const done = Boolean(bulkResult)

  const problemItems = items.filter(
    (i) =>
      i.status === 'failed' ||
      i.status === 'warning' ||
      i.errors.length > 0 ||
      i.warnings.length > 0,
  )

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-slate-900/40 p-3 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="catalog-validate-title"
      onClick={applying ? undefined : onClose}
    >
      <div
        className="my-auto flex max-h-[min(85vh,720px)] w-full min-w-0 max-w-[min(48rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2
              id="catalog-validate-title"
              className="text-base font-bold text-slate-900"
            >
              {done ? 'Resultado de la acción' : 'Preview de validación'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Acción: <span className="font-medium text-slate-700">{action}</span>
              {done
                ? ' · Cambios aplicados'
                : ' · Todavía sin cambios en la base'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-5">
          {done && bulkResult ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <SummaryCard label="Total" value={bulkResult.summary.total} />
              <SummaryCard
                label="Actualizados"
                value={bulkResult.summary.updated}
                tone="ok"
              />
              <SummaryCard
                label="Errores"
                value={bulkResult.summary.failed}
                tone="err"
              />
              <SummaryCard
                label="Con warnings"
                value={bulkResult.summary.warnings}
                tone="warn"
              />
              <SummaryCard
                label="Omitidos"
                value={bulkResult.summary.skipped}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              <SummaryCard label="Total" value={summary.total} />
              <SummaryCard label="Listos" value={summary.ready} tone="ok" />
              <SummaryCard label="Errores" value={summary.failed} tone="err" />
              <SummaryCard
                label="Warnings"
                value={summary.warnings}
                tone="warn"
              />
              <SummaryCard label="Omitidos" value={summary.skipped} />
            </div>
          )}

          {done && bulkResult ? (
            <BulkResultTable result={bulkResult} />
          ) : problemItems.length === 0 ? (
            <p className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-sm text-emerald-900">
              {applicableCount > 0
                ? `${applicableCount} producto${applicableCount === 1 ? '' : 's'} listo${applicableCount === 1 ? '' : 's'} para aplicar.`
                : 'No hay productos aplicables en esta selección.'}
            </p>
          ) : (
            <div className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      SKU
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Título
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Estado
                    </th>
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Detalle
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {problemItems.map((item) => (
                    <tr
                      key={item.id}
                      className="border-t border-slate-100 align-top"
                    >
                      <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">
                        {item.sku}
                      </td>
                      <td className="max-w-[10rem] px-3 py-2 sm:max-w-[14rem]">
                        <div
                          className="truncate font-medium text-slate-900"
                          title={item.title}
                        >
                          {item.title}
                        </div>
                        {item.proposed.slug &&
                          item.proposed.slug !== item.current.slug && (
                            <div
                              className="truncate font-mono text-[11px] text-slate-400"
                              title={item.proposed.slug}
                            >
                              slug → {item.proposed.slug}
                            </div>
                          )}
                      </td>
                      <td className="px-3 py-2">
                        <StatusPill status={item.status} />
                      </td>
                      <td className="min-w-0 max-w-[16rem] px-3 py-2 text-xs break-words">
                        {item.errors.length > 0 && (
                          <ul className="mb-1 list-disc space-y-0.5 pl-4 text-rose-700">
                            {item.errors.map((e) => (
                              <li key={e}>{e}</li>
                            ))}
                          </ul>
                        )}
                        {item.warnings.length > 0 && (
                          <ul className="list-disc space-y-0.5 pl-4 text-amber-800">
                            {item.warnings.map((w) => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-4 py-3 sm:px-5">
          {!done && onApply && (
            <button
              type="button"
              disabled={applying || applicableCount === 0}
              onClick={onApply}
              className={`${btnPrimary} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {applying
                ? 'Aplicando…'
                : ACTION_APPLY_LABEL[action] || 'Aplicar cambios'}
              {!applying && applicableCount > 0
                ? ` (${applicableCount})`
                : ''}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={applying}
            className={`${btnSecondarySm} disabled:opacity-50`}
          >
            {done ? 'Cerrar' : 'Cancelar'}
          </button>
        </div>
      </div>
    </div>
  )
}

function BulkResultTable({ result }: { result: AdminCatalogBulkResult }) {
  const rows = result.items.filter(
    (i) =>
      i.status === 'updated' ||
      i.status === 'failed' ||
      i.warnings.length > 0 ||
      i.errors.length > 0,
  )
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        No hubo cambios aplicables (todos omitidos).
      </p>
    )
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              SKU
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Título
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Estado
            </th>
            <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              Cambios / detalle
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item) => (
            <tr key={item.id} className="border-t border-slate-100 align-top">
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-slate-700">
                {item.sku}
              </td>
              <td className="max-w-[180px] truncate px-3 py-2 font-medium text-slate-900">
                {item.title}
              </td>
              <td className="px-3 py-2">
                <StatusPill status={item.status} />
              </td>
              <td className="px-3 py-2 text-xs text-slate-600">
                {item.changes.catalogVisible && (
                  <div>
                    publicado: {String(item.changes.catalogVisible.from)} →{' '}
                    {String(item.changes.catalogVisible.to)}
                  </div>
                )}
                {item.changes.isFeatured && (
                  <div>
                    destacado: {String(item.changes.isFeatured.from)} →{' '}
                    {String(item.changes.isFeatured.to)}
                  </div>
                )}
                {item.changes.slug && (
                  <div className="font-mono text-[11px]">
                    slug: {item.changes.slug.from || '—'} →{' '}
                    {item.changes.slug.to}
                  </div>
                )}
                {item.errors.map((e) => (
                  <div key={e} className="text-rose-700">
                    {e}
                  </div>
                ))}
                {item.warnings.map((w) => (
                  <div key={w} className="text-amber-800">
                    {w}
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        STATUS_TONE[status] ?? STATUS_TONE.skipped,
      ].join(' ')}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'ok' | 'err' | 'warn'
}) {
  const toneClass =
    tone === 'ok'
      ? 'border-emerald-100 bg-emerald-50/70 text-emerald-900'
      : tone === 'err'
        ? 'border-rose-100 bg-rose-50/70 text-rose-900'
        : tone === 'warn'
          ? 'border-amber-100 bg-amber-50/70 text-amber-900'
          : 'border-slate-100 bg-slate-50 text-slate-800'

  return (
    <div className={`rounded-lg border px-3 py-2 ${toneClass}`}>
      <div className="text-[11px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  )
}
