'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { CatalogBrand } from '@/lib/catalog-client'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import {
  buildCatalogProductosHref,
  countActiveCatalogProductosFilters,
  CATALOG_PRODUCTOS_DEFAULT_SORT,
  CATALOG_PRODUCTOS_SORT_LABELS,
  findCategoryNodeBySlug,
  parseCatalogProductosState,
  resolveEffectiveCategoryRoot,
} from '@/lib/catalog-productos-url'

type CatalogActiveFilterChipsProps = {
  tree: CatalogCategoryNode[]
  brands: CatalogBrand[]
  basePath: string
}

export function CatalogActiveFilterChips({
  tree,
  brands,
  basePath,
}: CatalogActiveFilterChipsProps) {
  const searchParams = useSearchParams()
  const state = parseCatalogProductosState(searchParams)
  const activeCount = countActiveCatalogProductosFilters(state)

  if (activeCount === 0) return null

  const effectiveRoot = resolveEffectiveCategoryRoot(state, tree)
  const rootNode = tree.find((r) => r.slug === effectiveRoot)
  const leafNode = state.category
    ? findCategoryNodeBySlug(tree, state.category)
    : null
  const brandNode = brands.find((b) => b.slug === state.brand)

  const chips: Array<{ key: string; label: string; href: string }> = []

  if (rootNode) {
    chips.push({
      key: 'categoryRoot',
      label: rootNode.name,
      href: buildCatalogProductosHref(basePath, state, {
        categoryRoot: null,
        category: null,
        page: null,
      }),
    })
  }

  if (leafNode && state.category) {
    chips.push({
      key: 'category',
      label: leafNode.name,
      href: buildCatalogProductosHref(basePath, state, {
        category: null,
        page: null,
      }),
    })
  }

  if (brandNode) {
    chips.push({
      key: 'brand',
      label: brandNode.name,
      href: buildCatalogProductosHref(basePath, state, {
        brand: null,
        page: null,
      }),
    })
  }

  if (state.q) {
    chips.push({
      key: 'q',
      label: `“${state.q}”`,
      href: buildCatalogProductosHref(basePath, state, {
        q: null,
        page: null,
      }),
    })
  }

  if (state.sort !== CATALOG_PRODUCTOS_DEFAULT_SORT) {
    chips.push({
      key: 'sort',
      label: CATALOG_PRODUCTOS_SORT_LABELS[state.sort],
      href: buildCatalogProductosHref(basePath, state, {
        sort: null,
        page: null,
      }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-medium text-slate-600">Filtros activos:</span>
      {chips.map((chip) => (
        <Link
          key={chip.key}
          href={chip.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
        >
          <span>{chip.label}</span>
          <span className="text-slate-400" aria-hidden>
            ×
          </span>
          <span className="sr-only">Quitar filtro</span>
        </Link>
      ))}
      <Link
        href={basePath}
        className="text-sm font-medium text-ifedel-brown underline-offset-2 hover:underline"
      >
        Limpiar filtros
      </Link>
    </div>
  )
}
