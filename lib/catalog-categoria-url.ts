/**
 * Query params y helpers de `/categorias/[slug]` (P4C).
 */

import type {
  CatalogCategoryNode,
  CatalogCategoryResolved,
} from '@/lib/catalog-category-public'
import {
  CATALOG_PRODUCTOS_DEFAULT_SORT,
  CATALOG_PRODUCTOS_SORTS,
  parseCatalogProductosSort,
  type CatalogProductosSort,
} from '@/lib/catalog-productos-url'

export type CatalogCategoriaRootState = {
  category: string
  brand: string
  sort: CatalogProductosSort
  page: number
}

export type CatalogCategoriaLeafState = {
  brand: string
  sort: CatalogProductosSort
  page: number
}

export const CATALOG_CATEGORIA_ROOT_DEFAULTS: CatalogCategoriaRootState = {
  category: '',
  brand: '',
  sort: CATALOG_PRODUCTOS_DEFAULT_SORT,
  page: 1,
}

export const CATALOG_CATEGORIA_LEAF_DEFAULTS: CatalogCategoriaLeafState = {
  brand: '',
  sort: CATALOG_PRODUCTOS_DEFAULT_SORT,
  page: 1,
}

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function parsePage(raw: string | undefined): number {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n) || n < 1) return 1
  return n
}

export function parseCatalogCategoriaRootState(
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null,
): CatalogCategoriaRootState {
  if (searchParams instanceof URLSearchParams) {
    return {
      category: (searchParams.get('category') ?? '').trim(),
      brand: (searchParams.get('brand') ?? '').trim(),
      sort: parseCatalogProductosSort(searchParams.get('sort') ?? undefined),
      page: parsePage(searchParams.get('page') ?? undefined),
    }
  }

  if (searchParams) {
    return {
      category: (firstParam(searchParams.category) ?? '').trim(),
      brand: (firstParam(searchParams.brand) ?? '').trim(),
      sort: parseCatalogProductosSort(firstParam(searchParams.sort)),
      page: parsePage(firstParam(searchParams.page)),
    }
  }

  return { ...CATALOG_CATEGORIA_ROOT_DEFAULTS }
}

export function parseCatalogCategoriaLeafState(
  searchParams?:
    | URLSearchParams
    | Record<string, string | string[] | undefined>
    | null,
): CatalogCategoriaLeafState {
  if (searchParams instanceof URLSearchParams) {
    return {
      brand: (searchParams.get('brand') ?? '').trim(),
      sort: parseCatalogProductosSort(searchParams.get('sort') ?? undefined),
      page: parsePage(searchParams.get('page') ?? undefined),
    }
  }

  if (searchParams) {
    return {
      brand: (firstParam(searchParams.brand) ?? '').trim(),
      sort: parseCatalogProductosSort(firstParam(searchParams.sort)),
      page: parsePage(firstParam(searchParams.page)),
    }
  }

  return { ...CATALOG_CATEGORIA_LEAF_DEFAULTS }
}

export type CatalogCategoriaRootPatch = Partial<{
  category: string | null
  brand: string | null
  sort: CatalogProductosSort | null
  page: number | null
}>

export type CatalogCategoriaLeafPatch = Partial<{
  brand: string | null
  sort: CatalogProductosSort | null
  page: number | null
}>

export function applyCatalogCategoriaRootPatch(
  current: CatalogCategoriaRootState,
  patch: CatalogCategoriaRootPatch = {},
): CatalogCategoriaRootState {
  return {
    category:
      patch.category === null
        ? ''
        : patch.category !== undefined
          ? patch.category.trim()
          : current.category,
    brand:
      patch.brand === null
        ? ''
        : patch.brand !== undefined
          ? patch.brand.trim()
          : current.brand,
    sort:
      patch.sort === null
        ? CATALOG_PRODUCTOS_DEFAULT_SORT
        : patch.sort !== undefined
          ? patch.sort
          : current.sort,
    page:
      patch.page === null
        ? 1
        : patch.page !== undefined
          ? Math.max(1, Math.floor(patch.page) || 1)
          : current.page,
  }
}

export function applyCatalogCategoriaLeafPatch(
  current: CatalogCategoriaLeafState,
  patch: CatalogCategoriaLeafPatch = {},
): CatalogCategoriaLeafState {
  return {
    brand:
      patch.brand === null
        ? ''
        : patch.brand !== undefined
          ? patch.brand.trim()
          : current.brand,
    sort:
      patch.sort === null
        ? CATALOG_PRODUCTOS_DEFAULT_SORT
        : patch.sort !== undefined
          ? patch.sort
          : current.sort,
    page:
      patch.page === null
        ? 1
        : patch.page !== undefined
          ? Math.max(1, Math.floor(patch.page) || 1)
          : current.page,
  }
}

export function buildCatalogCategoriaRootSearchParams(
  state: CatalogCategoriaRootState,
): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.category) sp.set('category', state.category)
  if (state.brand) sp.set('brand', state.brand)
  if (state.sort !== CATALOG_PRODUCTOS_DEFAULT_SORT) sp.set('sort', state.sort)
  if (state.page > 1) sp.set('page', String(state.page))
  return sp
}

export function buildCatalogCategoriaLeafSearchParams(
  state: CatalogCategoriaLeafState,
): URLSearchParams {
  const sp = new URLSearchParams()
  if (state.brand) sp.set('brand', state.brand)
  if (state.sort !== CATALOG_PRODUCTOS_DEFAULT_SORT) sp.set('sort', state.sort)
  if (state.page > 1) sp.set('page', String(state.page))
  return sp
}

export function buildCatalogCategoriaRootHref(
  basePath: string,
  current: CatalogCategoriaRootState,
  patch: CatalogCategoriaRootPatch = {},
): string {
  const next = applyCatalogCategoriaRootPatch(current, patch)
  const qs = buildCatalogCategoriaRootSearchParams(next).toString()
  return `${basePath}${qs ? `?${qs}` : ''}`
}

export function buildCatalogCategoriaLeafHref(
  basePath: string,
  current: CatalogCategoriaLeafState,
  patch: CatalogCategoriaLeafPatch = {},
): string {
  const next = applyCatalogCategoriaLeafPatch(current, patch)
  const qs = buildCatalogCategoriaLeafSearchParams(next).toString()
  return `${basePath}${qs ? `?${qs}` : ''}`
}

export function catalogCategoriaRootPaginationParams(
  state: CatalogCategoriaRootState,
): Record<string, string> {
  const sp = buildCatalogCategoriaRootSearchParams({ ...state, page: 1 })
  const out: Record<string, string> = {}
  sp.forEach((value, key) => {
    out[key] = value
  })
  return out
}

export function catalogCategoriaLeafPaginationParams(
  state: CatalogCategoriaLeafState,
): Record<string, string> {
  const sp = buildCatalogCategoriaLeafSearchParams({ ...state, page: 1 })
  const out: Record<string, string> = {}
  sp.forEach((value, key) => {
    out[key] = value
  })
  return out
}

/** Hojas visibles del root (count > 0), orden taxonomía. */
export function visibleRootChildren(
  root: CatalogCategoryResolved & { kind: 'root' },
): CatalogCategoryNode[] {
  return (root.children ?? [])
    .filter((c) => c.count > 0)
    .sort(
      (a, b) =>
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es'),
    )
}

/** Página pública solo si la categoría tiene productos visibles. */
export function isPublicCategoryPageVisible(
  category: CatalogCategoryResolved | null,
): category is CatalogCategoryResolved {
  if (!category) return false
  return category.count > 0
}

/** Ignora hojas que no pertenecen al root de la URL. */
export function sanitizeRootLeafFilter(
  leafSlug: string,
  root: CatalogCategoryResolved & { kind: 'root' },
): string {
  if (!leafSlug) return ''
  return visibleRootChildren(root).some((c) => c.slug === leafSlug)
    ? leafSlug
    : ''
}

export function catalogCategoryMetaDescription(category: {
  name: string
  shortDescription: string | null
}): string {
  const short = category.shortDescription?.trim()
  if (short) return short
  return `Productos de ${category.name} en IFEDEL.`
}

export { CATALOG_PRODUCTOS_SORTS, CATALOG_PRODUCTOS_DEFAULT_SORT }
