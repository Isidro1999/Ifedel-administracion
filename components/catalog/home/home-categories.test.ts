import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCatalogCategoryTree,
  buildPublicCategoryIndex,
  type CatalogCategoryNode,
  type PublicCategoryRow,
} from '@/lib/catalog-category-public'
import {
  selectHomeRootCategories,
  toHomeCategoryItemsFromTree,
} from '@/components/catalog/home/home-categories'
import { isLegacyCategorySlug } from '@/lib/admin-categories'

function row(
  partial: Partial<PublicCategoryRow> &
    Pick<PublicCategoryRow, 'id' | 'slug' | 'name' | 'parentId'>,
): PublicCategoryRow {
  return {
    shortDescription: null,
    imageUrl: null,
    sortOrder: 0,
    isActive: true,
    showInHome: partial.parentId == null,
    ...partial,
  }
}

function homeTreeFixture() {
  const categories: PublicCategoryRow[] = [
    row({
      id: 1,
      name: 'Electrificación y Alambrados',
      slug: 'electrificacion-y-alambrados',
      parentId: null,
      sortOrder: 1,
      showInHome: true,
    }),
    row({
      id: 2,
      name: 'Identificación y Pesaje Animal',
      slug: 'identificacion-y-pesaje-animal',
      parentId: null,
      sortOrder: 2,
      showInHome: true,
    }),
    row({
      id: 3,
      name: 'Pasturas',
      slug: 'pasturas',
      parentId: null,
      sortOrder: 6,
      showInHome: false,
    }),
    row({
      id: 10,
      name: 'Aisladores',
      slug: 'aisladores',
      parentId: 1,
      sortOrder: 1,
      showInHome: false,
    }),
    row({
      id: 11,
      name: 'Energizadores',
      slug: 'energizadores',
      parentId: 1,
      sortOrder: 2,
      showInHome: false,
    }),
    row({
      id: 20,
      name: 'Accesorios de identificación y pesaje',
      slug: 'accesorios-de-identificacion-y-pesaje',
      parentId: 2,
      sortOrder: 1,
      showInHome: false,
    }),
    row({
      id: 30,
      name: 'Medición de pasturas',
      slug: 'medicion-de-pasturas',
      parentId: 3,
      sortOrder: 1,
      showInHome: false,
    }),
    // legacy root (excluida del índice V1)
    row({
      id: 99,
      name: 'Legacy lectores',
      slug: 'lectores',
      parentId: null,
      sortOrder: 99,
      showInHome: true,
    }),
    // root inactivo
    row({
      id: 4,
      name: 'Inactiva',
      slug: 'manejo-ganadero',
      parentId: null,
      sortOrder: 4,
      showInHome: true,
      isActive: false,
    }),
  ]

  const countsByCategoryId = new Map<number, number>([
    [10, 50],
    [11, 30],
    [20, 15],
    [30, 5], // pasturas tiene productos pero showInHome=false
    [99, 999],
  ])

  const index = buildPublicCategoryIndex({ categories, countsByCategoryId })
  const tree = buildCatalogCategoryTree(index)
  return { tree, index }
}

describe('selectHomeRootCategories', () => {
  it('Home usa roots con showInHome y count > 0', () => {
    const { tree } = homeTreeFixture()
    const home = selectHomeRootCategories(tree)
    assert.deepEqual(
      home.map((r) => r.slug),
      ['electrificacion-y-alambrados', 'identificacion-y-pesaje-animal'],
    )
  })

  it('Pasturas queda fuera si showInHome=false', () => {
    const { tree } = homeTreeFixture()
    const home = selectHomeRootCategories(tree)
    assert.equal(
      home.some((r) => r.slug === 'pasturas'),
      false,
    )
  })

  it('legacy no aparece', () => {
    const { tree } = homeTreeFixture()
    const home = selectHomeRootCategories(tree)
    assert.equal(home.some((r) => r.slug === 'lectores'), false)
    assert.ok(isLegacyCategorySlug('lectores'))
  })

  it('leaf no aparece como categoría principal', () => {
    const { tree } = homeTreeFixture()
    const home = selectHomeRootCategories(tree)
    assert.equal(home.some((r) => r.slug === 'aisladores'), false)
    assert.ok(tree.every((r) => r.parentId === null))
  })

  it('inactive no aparece', () => {
    const { tree } = homeTreeFixture()
    assert.equal(
      tree.some((r) => r.slug === 'manejo-ganadero'),
      false,
    )
  })

  it('count 0 no aparece', () => {
    const emptyRoot: CatalogCategoryNode = {
      id: 50,
      name: 'Vacía',
      slug: 'esquila-y-peladoras',
      parentId: null,
      shortDescription: null,
      imageUrl: null,
      sortOrder: 3,
      showInHome: true,
      count: 0,
      children: [],
    }
    const home = selectHomeRootCategories([emptyRoot])
    assert.equal(home.length, 0)
  })

  it('orden por sortOrder', () => {
    const { tree } = homeTreeFixture()
    const home = selectHomeRootCategories(tree)
    assert.ok(home[0].sortOrder <= home[1].sortOrder)
  })

  it('href apunta a /categorias/root', () => {
    const { tree } = homeTreeFixture()
    const items = toHomeCategoryItemsFromTree(
      tree,
      (slug) => `/catalogo/categorias/${slug}`,
    )
    assert.equal(
      items[0].href,
      '/catalogo/categorias/electrificacion-y-alambrados',
    )
    assert.ok(items.every((i) => i.href.includes('/categorias/')))
    assert.ok(items.every((i) => !i.href.includes('productos?')))
  })

  it('árbol expone showInHome en roots', () => {
    const { tree } = homeTreeFixture()
    const elec = tree.find((r) => r.slug === 'electrificacion-y-alambrados')
    const pasturas = tree.find((r) => r.slug === 'pasturas')
    assert.equal(elec?.showInHome, true)
    assert.equal(pasturas?.showInHome, false)
  })
})
