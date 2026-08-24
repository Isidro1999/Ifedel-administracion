'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useId, useRef, useState, useTransition } from 'react'
import type { CatalogBrand } from '@/lib/catalog-client'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import {
  buildCatalogProductosHref,
  CATALOG_PRODUCTOS_SORT_LABELS,
  CATALOG_PRODUCTOS_SORTS,
  countActiveCatalogProductosFilters,
  parseCatalogProductosState,
  resolveEffectiveCategoryRoot,
  sanitizeBrandForContext,
  type CatalogProductosSort,
} from '@/lib/catalog-productos-url'

type CatalogFilterDrawerProps = {
  tree: CatalogCategoryNode[]
  brands: CatalogBrand[]
  basePath: string
}

export function CatalogFilterDrawer({
  tree,
  brands,
  basePath,
}: CatalogFilterDrawerProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const panelId = useId()
  const closeBtnRef = useRef<HTMLButtonElement>(null)

  const state = parseCatalogProductosState(searchParams)
  const activeCount = countActiveCatalogProductosFilters(state)
  const effectiveRoot = resolveEffectiveCategoryRoot(state, tree)
  const selectedRoot = tree.find((r) => r.slug === effectiveRoot) ?? null
  const validBrand = sanitizeBrandForContext(state.brand, brands)

  useEffect(() => {
    if (!open) return
    closeBtnRef.current?.focus()

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }

    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open])

  function navigate(patch: Parameters<typeof buildCatalogProductosHref>[2] = {}) {
    const target = buildCatalogProductosHref(basePath, state, {
      ...patch,
      page: patch.page ?? null,
    })
    startTransition(() => {
      router.push(target)
      setOpen(false)
    })
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    navigate({
      q: String(fd.get('q') || '').trim(),
      categoryRoot: String(fd.get('categoryRoot') || '').trim() || null,
      category: String(fd.get('category') || '').trim() || null,
      brand:
        sanitizeBrandForContext(String(fd.get('brand') || '').trim(), brands) ||
        null,
      sort: (String(fd.get('sort') || '') || null) as CatalogProductosSort | null,
    })
  }

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-slate-800 shadow-sm"
      >
        Filtros
        {activeCount > 0 ? (
          <span className="rounded-full bg-ifedel-primary/20 px-2 py-0.5 text-xs font-bold text-ifedel-brown">
            {activeCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex">
          <button
            type="button"
            aria-label="Cerrar filtros"
            className="absolute inset-0 bg-black/40"
            onClick={() => setOpen(false)}
          />
          <div
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-[#faf8f4] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3">
              <h2
                id={`${panelId}-title`}
                className="text-base font-semibold text-slate-900"
              >
                Filtros
              </h2>
              <button
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm font-medium text-slate-600 hover:bg-slate-100"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-y-auto p-4">
              <div className="space-y-4">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">Buscar</span>
                  <input
                    name="q"
                    key={`drawer-q-${state.q}`}
                    defaultValue={state.q}
                    placeholder="Nombre o marca…"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
                  />
                </label>

                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium text-slate-700">
                    Categoría principal
                  </span>
                  <select
                    name="categoryRoot"
                    defaultValue={effectiveRoot}
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

              <div className="mt-auto flex flex-col gap-2 border-t border-slate-200/80 pt-4">
                <button
                  type="submit"
                  disabled={pending}
                  className="rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
                >
                  {pending ? 'Aplicando…' : 'Aplicar'}
                </button>
                <Link
                  href={basePath}
                  onClick={() => setOpen(false)}
                  className="rounded-full border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  Limpiar
                </Link>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  )
}
