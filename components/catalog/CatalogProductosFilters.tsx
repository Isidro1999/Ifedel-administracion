'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition } from 'react'
import type { CatalogBrand } from '@/lib/catalog-client'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import {
  buildCatalogProductosHref,
  CATALOG_PRODUCTOS_SORT_LABELS,
  CATALOG_PRODUCTOS_SORTS,
  parseCatalogProductosState,
  resolveEffectiveCategoryRoot,
  sanitizeBrandForContext,
  type CatalogProductosSort,
} from '@/lib/catalog-productos-url'

type CatalogProductosFiltersProps = {
  tree: CatalogCategoryNode[]
  brands: CatalogBrand[]
  basePath: string
  /** Ocultar barra desktop (mobile usa drawer). */
  className?: string
}

export function CatalogProductosFilters({
  tree,
  brands,
  basePath,
  className = '',
}: CatalogProductosFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const state = parseCatalogProductosState(searchParams)
  const effectiveRoot = resolveEffectiveCategoryRoot(state, tree)
  const selectedRoot = tree.find((r) => r.slug === effectiveRoot) ?? null
  const validBrand = sanitizeBrandForContext(state.brand, brands)

  function navigate(patch: Parameters<typeof buildCatalogProductosHref>[2] = {}) {
    const target = buildCatalogProductosHref(basePath, state, {
      ...patch,
      page: patch.page ?? null,
    })
    startTransition(() => router.push(target))
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const nextRoot = String(fd.get('categoryRoot') || '').trim()
    const nextCategory = String(fd.get('category') || '').trim()
    const nextBrand = String(fd.get('brand') || '').trim()
    const sanitizedBrand = sanitizeBrandForContext(nextBrand, brands)

    navigate({
      q: String(fd.get('q') || '').trim(),
      categoryRoot: nextRoot || null,
      category: nextCategory || null,
      brand: sanitizedBrand || null,
      sort: (String(fd.get('sort') || '') || null) as CatalogProductosSort | null,
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`hidden flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm lg:flex ${className}`}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label className="flex flex-col gap-1 text-sm xl:col-span-2">
          <span className="font-medium text-slate-700">Buscar</span>
          <input
            name="q"
            key={`q-${state.q}`}
            defaultValue={state.q}
            placeholder="Nombre o marca…"
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Categoría principal</span>
          <select
            name="categoryRoot"
            defaultValue={effectiveRoot}
            onChange={(e) => {
              const slug = e.target.value
              navigate({
                categoryRoot: slug || null,
                category: null,
                brand: null,
              })
            }}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
          >
            <option value="">Todas</option>
            {tree.map((root) => (
              <option key={root.id} value={root.slug}>
                {root.name} ({root.count})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Subcategoría</span>
          <select
            name="category"
            defaultValue={state.category}
            disabled={!selectedRoot}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Todas</option>
            {(selectedRoot?.children ?? []).map((leaf) => (
              <option key={leaf.id} value={leaf.slug}>
                {leaf.name} ({leaf.count})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Marca</span>
          <select
            name="brand"
            defaultValue={validBrand}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
          >
            <option value="">Todas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.slug}>
                {b.name} ({b.count ?? 0})
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Ordenar</span>
          <select
            name="sort"
            defaultValue={state.sort}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
          >
            {CATALOG_PRODUCTOS_SORTS.map((sort) => (
              <option key={sort} value={sort}>
                {CATALOG_PRODUCTOS_SORT_LABELS[sort]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? 'Filtrando…' : 'Aplicar'}
        </button>
        <Link
          href={basePath}
          className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Limpiar
        </Link>
      </div>
    </form>
  )
}
