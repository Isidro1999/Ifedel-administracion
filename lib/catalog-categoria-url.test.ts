import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { CatalogCategoryResolved } from '@/lib/catalog-category-public'
import {
  buildCatalogCategoryTree,
  buildPublicCategoryIndex,
  resolveCatalogCategoryBySlug,
  resolveCatalogCategoryFromTree,
  type PublicCategoryRow,
} from '@/lib/catalog-category-public'
import {
  applyCatalogCategoriaRootPatch,
  buildCatalogCategoriaRootHref,
  catalogCategoryMetaDescription,
  catalogCategoriaRootPaginationParams,
  isPublicCategoryPageVisible,
  parseCatalogCategoriaRootState,
  sanitizeRootLeafFilter,
  visibleRootChildren,
} from '@/lib/catalog-categoria-url'
import { buildCategoryBreadcrumbJsonLd } from '@/lib/catalog-structured-data'

function row(
  partial: Partial<PublicCategoryRow> &
    Pick<PublicCategoryRow, 'id' | 'slug' | 'name' | 'parentId'>,
): PublicCategoryRow {
  return {
    shortDescription: null,
    imageUrl: null,
    sortOrder: 0,
    isActive: true,
    ...partial,
  }
}

function miniFixture() {
  const categories: PublicCategoryRow[] = [
    row({
      id: 1,
      name: 'Electrificación y Alambrados',
      slug: 'electrificacion-y-alambrados',
      parentId: null,
      sortOrder: 1,
      shortDescription: 'Soluciones para electrificación rural.',
    }),
    row({
      id: 2,
      name: 'Identificación y Pesaje Animal',
      slug: 'identificacion-y-pesaje-animal',
      parentId: null,
      sortOrder: 2,
    }),
    row({
      id: 10,
      name: 'Aisladores',
      slug: 'aisladores',
      parentId: 1,
      sortOrder: 1,
    }),
    row({
      id: 11,
      name: 'Energizadores',
      slug: 'energizadores',
      parentId: 1,
      sortOrder: 2,
    }),
    row({
      id: 20,
      name: 'Accesorios de identificación y pesaje',
      slug: 'accesorios-de-identificacion-y-pesaje',
      parentId: 2,
      sortOrder: 1,
    }),
    row({
      id: 99,
      name: 'Legacy lectores',
      slug: 'lectores',
      parentId: null,
      sortOrder: 99,
    }),
    row({
      id: 12,
      name: 'Inactiva',
      slug: 'cercos-moviles',
      parentId: 1,
      sortOrder: 99,
      isActive: false,
    }),
    row({
      id: 13,
      name: 'Conductores eléctricos',
      slug: 'conductores-electricos',
      parentId: 1,
      sortOrder: 3,
    }),
  ]

  const countsByCategoryId = new Map<number, number>([
    [10, 50],
    [11, 30],
    [20, 15],
    [99, 999],
  ])

  const index = buildPublicCategoryIndex({ categories, countsByCategoryId })
  return { index, countsByCategoryId }
}

describe('resolver UI / visibilidad', () => {
  const { index } = miniFixture()

  it('root renderiza hub (resolver kind root, count > 0)', () => {
    const resolved = resolveCatalogCategoryBySlug(
      index,
      'electrificacion-y-alambrados',
    )
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'root')
    assert.equal(isPublicCategoryPageVisible(resolved), true)
  })

  it('leaf renderiza page hoja', () => {
    const resolved = resolveCatalogCategoryBySlug(index, 'aisladores')
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'leaf')
    assert.equal(isPublicCategoryPageVisible(resolved), true)
  })

  it('legacy 404 (null)', () => {
    assert.equal(resolveCatalogCategoryBySlug(index, 'lectores'), null)
  })

  it('inactive 404', () => {
    assert.equal(resolveCatalogCategoryBySlug(index, 'cercos-moviles'), null)
  })

  it('inexistente 404', () => {
    assert.equal(resolveCatalogCategoryBySlug(index, 'no-existe'), null)
  })

  it('leaf count 0 no es página pública', () => {
    const resolved = resolveCatalogCategoryBySlug(index, 'conductores-electricos')
    assert.ok(resolved)
    assert.equal(resolved?.count, 0)
    assert.equal(isPublicCategoryPageVisible(resolved), false)
  })

  it('P4C: root vía árbol no cae en 404 (count agregado)', () => {
    const tree = buildCatalogCategoryTree(index)
    const fromTree = resolveCatalogCategoryFromTree(
      tree,
      'electrificacion-y-alambrados',
    )
    assert.ok(fromTree)
    assert.equal(fromTree?.kind, 'root')
    assert.equal(isPublicCategoryPageVisible(fromTree), true)
  })
})

describe('root params', () => {
  const { index } = miniFixture()
  const root = resolveCatalogCategoryBySlug(
    index,
    'electrificacion-y-alambrados',
  ) as CatalogCategoryResolved & { kind: 'root' }

  it('leaf válida del root', () => {
    assert.equal(sanitizeRootLeafFilter('aisladores', root), 'aisladores')
  })

  it('leaf de otro root ignorada', () => {
    assert.equal(
      sanitizeRootLeafFilter('accesorios-de-identificacion-y-pesaje', root),
      '',
    )
  })

  it('cambiar category resetea page vía patch', () => {
    const href = buildCatalogCategoriaRootHref(
      '/categorias/electrificacion-y-alambrados',
      parseCatalogCategoriaRootState({ page: '3' }),
      { category: 'aisladores', page: null },
    )
    assert.match(href, /category=aisladores/)
    assert.doesNotMatch(href, /page=/)
  })

  it('sort preservado en paginación', () => {
    const state = parseCatalogCategoriaRootState({
      category: 'aisladores',
      sort: 'name_asc',
    })
    const params = catalogCategoriaRootPaginationParams(state)
    assert.equal(params.sort, 'name_asc')
    assert.equal(params.category, 'aisladores')
  })

  it('visibleRootChildren excluye count 0', () => {
    const children = visibleRootChildren(root)
    assert.equal(children.length, 2)
    assert.deepEqual(
      children.map((c) => c.slug),
      ['aisladores', 'energizadores'],
    )
  })
})

describe('breadcrumbs JSON-LD', () => {
  it('root 3 niveles + categorías', () => {
    const data = buildCategoryBreadcrumbJsonLd({
      kind: 'root',
      root: {
        name: 'Electrificación y Alambrados',
        slug: 'electrificacion-y-alambrados',
      },
    })
    const items = data.itemListElement as Array<{ name: string; position: number }>
    assert.equal(items.length, 3)
    assert.equal(items[0].name, 'Inicio')
    assert.equal(items[1].name, 'Categorías')
    assert.equal(items[2].name, 'Electrificación y Alambrados')
  })

  it('leaf 4 niveles', () => {
    const data = buildCategoryBreadcrumbJsonLd({
      kind: 'leaf',
      root: {
        name: 'Electrificación y Alambrados',
        slug: 'electrificacion-y-alambrados',
      },
      leaf: { name: 'Aisladores', slug: 'aisladores' },
    })
    const items = data.itemListElement as Array<{ name: string }>
    assert.equal(items.length, 4)
    assert.equal(items[3].name, 'Aisladores')
  })
})

describe('metadata description', () => {
  it('usa shortDescription', () => {
    assert.equal(
      catalogCategoryMetaDescription({
        name: 'Electrificación y Alambrados',
        shortDescription: 'Soluciones para electrificación rural.',
      }),
      'Soluciones para electrificación rural.',
    )
  })

  it('fallback description', () => {
    assert.equal(
      catalogCategoryMetaDescription({
        name: 'Aisladores',
        shortDescription: null,
      }),
      'Productos de Aisladores en IFEDEL.',
    )
  })
})

describe('root patch', () => {
  it('applyCatalogCategoriaRootPatch resetea page al cambiar brand', () => {
    const next = applyCatalogCategoriaRootPatch(
      parseCatalogCategoriaRootState({ page: '2', brand: 'gallagher' }),
      { brand: 'tru-test', page: null },
    )
    assert.equal(next.page, 1)
    assert.equal(next.brand, 'tru-test')
  })
})
