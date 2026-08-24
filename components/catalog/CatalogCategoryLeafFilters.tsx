'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { CatalogBrand } from '@/lib/catalog-client'
import {
  buildCatalogCategoriaLeafHref,
  parseCatalogCategoriaLeafState,
} from '@/lib/catalog-categoria-url'
import {
  CATALOG_PRODUCTOS_SORT_LABELS,
  CATALOG_PRODUCTOS_SORTS,
  sanitizeBrandForContext,
  type CatalogProductosSort,
} from '@/lib/catalog-productos-url'

type CatalogCategoryLeafFiltersProps = {
  basePath: string
  brands: CatalogBrand[]
}

const selectClass =
  'rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm outline-none ring-ifedel-primary/30 focus:ring-2'

export function CatalogCategoryLeafFilters({
  basePath,
  brands,
}: CatalogCategoryLeafFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const state = parseCatalogCategoriaLeafState(searchParams)
  const validBrand = sanitizeBrandForContext(state.brand, brands)

  function navigate(
    patch: Parameters<typeof buildCatalogCategoriaLeafHref>[2] = {},
  ) {
    const target = buildCatalogCategoriaLeafHref(basePath, state, {
      ...patch,
      page: patch.page ?? null,
    })
    startTransition(() => router.push(target))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    navigate({
      brand:
        sanitizeBrandForContext(String(fd.get('brand') || '').trim(), brands) ||
        null,
      sort: (String(fd.get('sort') || '') || null) as CatalogProductosSort | null,
    })
  }

  return (
    <form onSubmit={onSubmit} className="w-full">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-slate-500">Marca</span>
          <select name="brand" defaultValue={validBrand} className={selectClass}>
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name} ({b.count ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm">
          <span className="text-xs font-medium text-slate-500">Ordenar</span>
          <select name="sort" defaultValue={state.sort} className={selectClass}>
            {CATALOG_PRODUCTOS_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {CATALOG_PRODUCTOS_SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-ifedel-primary px-4 py-2 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
          >
            {pending ? 'Filtrando…' : 'Aplicar'}
          </button>
          <Link
            href={basePath}
            className="rounded-full border border-slate-200 px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Limpiar
          </Link>
        </div>
      </div>
    </form>
  )
}
