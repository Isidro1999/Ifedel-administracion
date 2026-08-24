/**
 * Lógica pura del catálogo público jerárquico (P4A).
 * Sin Prisma — testeable sin DB.
 */

import { isLegacyCategorySlug } from '@/lib/admin-categories'
import { resolveTaxonomyV1EffectiveNodes } from '@/lib/category-taxonomy-v1'

export type CatalogCategoryKind = 'root' | 'leaf'

export type CatalogCategoryNode = {
  id: number
  name: string
  slug: string
  parentId: number | null
  shortDescription: string | null
  imageUrl: string | null
  sortOrder: number
  count: number
  children?: CatalogCategoryNode[]
}

export type CatalogCategoryResolved = {
  kind: CatalogCategoryKind
  id: number
  name: string
  slug: string
  parentId: number | null
  shortDescription: string | null
  imageUrl: string | null
  sortOrder: number
  /** Hoja: productos directos. Principal: suma de hojas activas V1. */
  count: number
  parent?: { id: number; name: string; slug: string } | null
  children?: CatalogCategoryNode[]
}

/** Fila mínima de Category desde DB. */
export type PublicCategoryRow = {
  id: number
  name: string
  slug: string
  parentId: number | null
  shortDescription: string | null
  imageUrl: string | null
  sortOrder: number
  isActive: boolean
}

export type PublicCategoryIndex = {
  rows: PublicCategoryRow[]
  v1SlugSet: Set<string>
  countsByCategoryId: Map<number, number>
  bySlug: Map<string, PublicCategoryRow>
  byId: Map<number, PublicCategoryRow>
}

const categoryOrder = (a: PublicCategoryRow, b: PublicCategoryRow) =>
  a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'es')

export function isPublicV1CategorySlug(
  slug: string,
  v1SlugSet: Set<string>
): boolean {
  if (isLegacyCategorySlug(slug)) return false
  return v1SlugSet.has(slug)
}

export function buildPublicCategoryIndex(input: {
  categories: PublicCategoryRow[]
  countsByCategoryId: Map<number, number>
}): PublicCategoryIndex {
  const { nodes } = resolveTaxonomyV1EffectiveNodes(
    input.categories.map((c) => ({ slug: c.slug, name: c.name }))
  )
  const v1SlugSet = new Set(nodes.map((n) => n.effectiveSlug))

  const rows = input.categories.filter(
    (c) => c.isActive && isPublicV1CategorySlug(c.slug, v1SlugSet)
  )

  const bySlug = new Map(rows.map((r) => [r.slug, r]))
  const byId = new Map(rows.map((r) => [r.id, r]))

  return {
    rows,
    v1SlugSet,
    countsByCategoryId: input.countsByCategoryId,
    bySlug,
    byId,
  }
}

export function leafPublicCount(
  index: PublicCategoryIndex,
  categoryId: number
): number {
  return index.countsByCategoryId.get(categoryId) ?? 0
}

export function buildCatalogCategoryTree(
  index: PublicCategoryIndex,
  options: {
    /** Ocultar hojas sin productos publicados (default true). */
    hideEmptyLeaves?: boolean
    /** Ocultar principales cuya suma de hojas visibles es 0 (default true). */
    hideEmptyRoots?: boolean
  } = {}
): CatalogCategoryNode[] {
  const hideEmptyLeaves = options.hideEmptyLeaves !== false
  const hideEmptyRoots = options.hideEmptyRoots !== false

  const roots = index.rows
    .filter((r) => r.parentId === null)
    .sort(categoryOrder)

  const tree: CatalogCategoryNode[] = []

  for (const root of roots) {
    const childRows = index.rows
      .filter((c) => c.parentId === root.id)
      .sort(categoryOrder)

    const children: CatalogCategoryNode[] = []
    let rootCount = 0

    for (const child of childRows) {
      const count = leafPublicCount(index, child.id)
      if (hideEmptyLeaves && count === 0) continue
      rootCount += count
      children.push({
        id: child.id,
        name: child.name,
        slug: child.slug,
        parentId: child.parentId,
        shortDescription: child.shortDescription,
        imageUrl: child.imageUrl,
        sortOrder: child.sortOrder,
        count,
      })
    }

    if (hideEmptyRoots && rootCount === 0) continue

    tree.push({
      id: root.id,
      name: root.name,
      slug: root.slug,
      parentId: root.parentId,
      shortDescription: root.shortDescription,
      imageUrl: root.imageUrl,
      sortOrder: root.sortOrder,
      count: rootCount,
      children,
    })
  }

  return tree
}

/** Lista plana de hojas con productos publicados (compat P4 previo). */
export function buildFlatPublicLeafCategories(
  index: PublicCategoryIndex
): Array<{
  id: number
  name: string
  slug: string
  count: number
}> {
  const leaves = index.rows
    .filter((r) => r.parentId !== null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      count: leafPublicCount(index, r.id),
    }))
    .filter((r) => r.count > 0)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))

  return leaves
}

export function resolveCatalogCategoryBySlug(
  index: PublicCategoryIndex,
  slugRaw: string
): CatalogCategoryResolved | null {
  const slug = slugRaw.trim()
  if (!slug) return null

  const row = index.bySlug.get(slug)
  if (!row) return null

  const kind: CatalogCategoryKind =
    row.parentId === null ? 'root' : 'leaf'

  if (kind === 'leaf') {
    const count = leafPublicCount(index, row.id)
    const parentRow =
      row.parentId != null ? index.byId.get(row.parentId) : undefined
    return {
      kind,
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      shortDescription: row.shortDescription,
      imageUrl: row.imageUrl,
      sortOrder: row.sortOrder,
      count,
      parent: parentRow
        ? { id: parentRow.id, name: parentRow.name, slug: parentRow.slug }
        : null,
    }
  }

  // Root: count = suma de hojas (no productos directos en el root).
  const childRows = index.rows
    .filter((c) => c.parentId === row.id)
    .sort(categoryOrder)

  const children: CatalogCategoryNode[] = childRows.map((child) => ({
    id: child.id,
    name: child.name,
    slug: child.slug,
    parentId: child.parentId,
    shortDescription: child.shortDescription,
    imageUrl: child.imageUrl,
    sortOrder: child.sortOrder,
    count: leafPublicCount(index, child.id),
  }))

  const count = children.reduce((sum, c) => sum + c.count, 0)

  return {
    kind,
    id: row.id,
    name: row.name,
    slug: row.slug,
    parentId: row.parentId,
    shortDescription: row.shortDescription,
    imageUrl: row.imageUrl,
    sortOrder: row.sortOrder,
    count,
    parent: null,
    children,
  }
}

/**
 * Resuelve slug contra el árbol público cacheado (P4A/P4B).
 * Misma fuente que `/productos` — roots visibles por count agregado de hojas.
 */
export function resolveCatalogCategoryFromTree(
  tree: CatalogCategoryNode[],
  slugRaw: string,
): CatalogCategoryResolved | null {
  const slug = slugRaw.trim()
  if (!slug) return null

  for (const root of tree) {
    if (root.slug === slug) {
      return {
        kind: 'root',
        id: root.id,
        name: root.name,
        slug: root.slug,
        parentId: root.parentId,
        shortDescription: root.shortDescription,
        imageUrl: root.imageUrl,
        sortOrder: root.sortOrder,
        count: root.count,
        parent: null,
        children: root.children ?? [],
      }
    }

    for (const leaf of root.children ?? []) {
      if (leaf.slug === slug) {
        return {
          kind: 'leaf',
          id: leaf.id,
          name: leaf.name,
          slug: leaf.slug,
          parentId: leaf.parentId,
          shortDescription: leaf.shortDescription,
          imageUrl: leaf.imageUrl,
          sortOrder: leaf.sortOrder,
          count: leaf.count,
          parent: { id: root.id, name: root.name, slug: root.slug },
        }
      }
    }
  }

  return null
}

export type PublicCategoryFilterInput = {
  category?: string
  categoryRoot?: string
}

/**
 * Cláusula Prisma-compatible para filtrar productos por categoría pública.
 * Devuelve null si el slug no es un filtro público válido (inactive/legacy/tipo incorrecto).
 */
export function buildPublicProductCategoryWhere(
  index: PublicCategoryIndex,
  filters: PublicCategoryFilterInput
): Record<string, unknown> | null {
  const category = (filters.category ?? '').trim()
  const categoryRoot = (filters.categoryRoot ?? '').trim()

  if (category) {
    const row = index.bySlug.get(category)
    if (!row || row.parentId === null) return null
    return { category: { slug: category } }
  }

  if (categoryRoot) {
    const row = index.bySlug.get(categoryRoot)
    if (!row || row.parentId !== null) return null
    return { category: { parent: { slug: categoryRoot } } }
  }

  return {}
}

/** Marca un where de producto como imposible (0 resultados). */
export function impossibleProductWhere(): Record<string, unknown> {
  return { id: -1 }
}
