'use client'

import Link from 'next/link'
import { catalogAbsoluteUrl } from '@/lib/catalog-paths'
import {
  isValidProductSlug,
  normalizeProductSlug,
} from '@/lib/product-slug'
import type { ImportProduct } from '@/lib/import-schemas'

type CatalogOnlineSectionProps = {
  form: ImportProduct
  update: (patch: Partial<ImportProduct>) => void
  /** Listas de precio disponibles (desde precios del producto). */
  priceListOptions: string[]
}

function catalogPreviewHref(slug: string): string {
  return catalogAbsoluteUrl(`productos/${slug}`)
}

export function CatalogOnlineSection({
  form,
  update,
  priceListOptions,
}: CatalogOnlineSectionProps) {
  const slug = (form.slug || '').trim()
  const slugNormalized = slug ? normalizeProductSlug(slug) : ''
  const slugOk = !slug || isValidProductSlug(slugNormalized)
  const visible = Boolean(form.catalogVisible)
  const showPrice = Boolean(form.showPrice)
  const lists = Array.from(
    new Set([
      ...priceListOptions,
      ...(form.catalogPriceList ? [form.catalogPriceList] : []),
    ]),
  ).filter(Boolean)

  function suggestSlug() {
    const suggested =
      normalizeProductSlug(form.title) ||
      normalizeProductSlug(form.sku) ||
      ''
    if (suggested) update({ slug: suggested })
  }

  return (
    <div className="space-y-4 rounded-lg border border-ifedel-primary/30 bg-emerald-50/40 p-4">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Catálogo online</h2>
        <p className="mt-1 text-xs text-slate-600">
          Estos campos controlan cómo se ve el producto en{' '}
          <code className="text-[11px]">ifedel.com</code>. Son datos
          públicos: no incluyas costos, márgenes ni información interna.
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={visible}
          onChange={(e) => update({ catalogVisible: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">
            Visible en catálogo
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Si está activo, este producto podrá verse en el catálogo público.
          </span>
        </span>
      </label>

      <div>
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <label className="text-sm font-medium text-slate-800">
            Slug público {visible ? <span className="text-red-600">*</span> : null}
          </label>
          <button
            type="button"
            onClick={suggestSlug}
            className="text-xs font-medium text-ifedel-brown hover:underline"
          >
            Generar desde título
          </button>
        </div>
        <input
          type="text"
          value={form.slug ?? ''}
          onChange={(e) => update({ slug: e.target.value.toLowerCase() })}
          onBlur={() => {
            if (!form.slug?.trim()) {
              suggestSlug()
              return
            }
            const n = normalizeProductSlug(form.slug)
            if (n && n !== form.slug) update({ slug: n })
          }}
          className="w-full rounded-md border px-3 py-2 font-mono text-sm"
          placeholder="gallagher-balanza-twr5"
        />
        <p className="mt-1 text-xs text-slate-500">
          Se usará en la URL pública del producto. Ejemplo:{' '}
          <code className="text-[11px]">
            /catalogo/productos/{slugNormalized || 'tu-slug'}
          </code>
        </p>
        {!slugOk ? (
          <p className="mt-1 text-xs text-red-600">
            Formato inválido. Solo minúsculas, números y guiones.
          </p>
        ) : null}
        {visible && !slugNormalized ? (
          <p className="mt-1 text-xs text-amber-700">
            Con el producto visible, el slug es obligatorio.
          </p>
        ) : null}
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Nombre público
        </label>
        <input
          type="text"
          value={form.publicTitle ?? ''}
          onChange={(e) =>
            update({ publicTitle: e.target.value || null })
          }
          className="w-full rounded-md border px-3 py-2"
          placeholder={form.title || 'Nombre comercial'}
        />
        <p className="mt-1 text-xs text-slate-500">
          Opcional. Usalo si querés mostrar un nombre más comercial que el
          interno. Si queda vacío, el catálogo usa el título interno.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Descripción corta pública
        </label>
        <input
          type="text"
          value={form.publicShortDescription ?? ''}
          onChange={(e) =>
            update({ publicShortDescription: e.target.value || null })
          }
          className="w-full rounded-md border px-3 py-2"
          placeholder={form.short || 'Resumen para la card'}
        />
        <p className="mt-1 text-xs text-slate-500">
          Se muestra en las cards del catálogo. Si queda vacío, se usa la
          descripción corta interna.
        </p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Descripción larga pública
        </label>
        <textarea
          value={form.publicDescription ?? ''}
          onChange={(e) =>
            update({ publicDescription: e.target.value || null })
          }
          className="min-h-[100px] w-full rounded-md border px-3 py-2"
          rows={4}
          placeholder="Texto comercial para la ficha…"
        />
        <p className="mt-1 text-xs text-slate-500">
          Se muestra en la ficha del producto. Si queda vacío, se usa la
          descripción interna.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-800">
            Orden en catálogo
          </label>
          <input
            type="number"
            value={form.catalogSort ?? 0}
            onChange={(e) =>
              update({
                catalogSort:
                  e.target.value === '' ? 0 : Number.parseInt(e.target.value, 10) || 0,
              })
            }
            className="w-full rounded-md border px-3 py-2"
          />
          <p className="mt-1 text-xs text-slate-500">
            Menor número aparece antes (junto con destacados y título).
          </p>
        </div>
        <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3 sm:mt-6">
          <input
            type="checkbox"
            className="mt-1"
            checked={Boolean(form.isFeatured)}
            onChange={(e) => update({ isFeatured: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">
              Destacado
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Los productos destacados pueden aparecer en la home del catálogo.
            </span>
          </span>
        </label>
      </div>

      <label className="flex items-start gap-3 rounded-md border border-slate-200 bg-white p-3">
        <input
          type="checkbox"
          className="mt-1"
          checked={showPrice}
          onChange={(e) => update({ showPrice: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-medium text-slate-900">
            Mostrar precio
          </span>
          <span className="mt-0.5 block text-xs text-slate-500">
            Si está desactivado, el catálogo muestra “Consultar precio”.
            Si está activo y no elegís lista, se usa “minorista” por defecto.
          </span>
        </span>
      </label>

      <div className={showPrice ? '' : 'opacity-60'}>
        <label className="mb-1 block text-sm font-medium text-slate-800">
          Lista de precio pública
        </label>
        {lists.length > 0 ? (
          <select
            value={form.catalogPriceList ?? ''}
            disabled={!showPrice}
            onChange={(e) =>
              update({ catalogPriceList: e.target.value || null })
            }
            className="w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed"
          >
            <option value="">Seleccionar lista…</option>
            {lists.map((list) => (
              <option key={list} value={list}>
                {list}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            disabled={!showPrice}
            value={form.catalogPriceList ?? ''}
            onChange={(e) =>
              update({ catalogPriceList: e.target.value || null })
            }
            className="w-full rounded-md border px-3 py-2 disabled:cursor-not-allowed"
            placeholder="Ej: PUBLICO, LISTA_1…"
          />
        )}
        <p className="mt-1 text-xs text-slate-500">
          Solo aplica si “Mostrar precio” está activo. Debe coincidir con el
          nombre de una lista de precios del producto. Si no hay precio válido,
          el catálogo muestra “Consultar precio”.
        </p>
        {showPrice && !(form.catalogPriceList || '').trim() ? (
          <p className="mt-1 text-xs text-amber-700">
            Precio público activo sin lista: se usará “minorista” como fallback.
            Podés elegir una lista explícita si corresponde.
          </p>
        ) : null}
      </div>

      <div className="rounded-md border border-slate-200 bg-white p-3">
        <p className="text-sm font-medium text-slate-800">Preview</p>
        {slugNormalized && isValidProductSlug(slugNormalized) ? (
          <div className="mt-2 space-y-2">
            <Link
              href={catalogPreviewHref(slugNormalized)}
              target="_blank"
              className="inline-flex text-sm font-semibold text-ifedel-brown hover:underline"
            >
              Ver en catálogo →
            </Link>
            {!visible ? (
              <p className="text-xs text-amber-700">
                El producto tiene URL pero no está publicado (Visible en
                catálogo desactivado).
              </p>
            ) : null}
          </div>
        ) : (
          <p className="mt-1 text-xs text-slate-500">
            Definí un slug válido para previsualizar la ficha pública.
          </p>
        )}
      </div>
    </div>
  )
}
