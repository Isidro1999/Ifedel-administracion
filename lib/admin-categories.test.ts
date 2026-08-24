import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  AdminCategoryError,
  buildAdminCategoryTree,
  isLegacyCategorySlug,
  suggestCategorySlug,
  validateCategoryDelete,
  validateCategoryHierarchyRules,
  validateLeafAssignment,
} from './admin-categories'
import { slugifyCategoryName } from './category-slug'

describe('category-slug', () => {
  it('normaliza acentos (no como slugify global roto)', () => {
    assert.equal(
      slugifyCategoryName('Electrificación y Alambrados'),
      'electrificacion-y-alambrados'
    )
    assert.equal(suggestCategorySlug('Cercos móviles'), 'cercos-moviles')
  })
})

describe('admin-categories hierarchy', () => {
  it('permite crear principal (parent null)', () => {
    assert.doesNotThrow(() =>
      validateCategoryHierarchyRules({
        parent: null,
        current: null,
        nextParentId: null,
      })
    )
  })

  it('permite subcategoría bajo principal', () => {
    assert.doesNotThrow(() =>
      validateCategoryHierarchyRules({
        parent: { id: 1, parentId: null, slug: 'electrificacion-y-alambrados' },
        current: null,
        nextParentId: 1,
      })
    )
  })

  it('rechaza tercer nivel', () => {
    assert.throws(
      () =>
        validateCategoryHierarchyRules({
          parent: { id: 2, parentId: 1, slug: 'aisladores' },
          current: null,
          nextParentId: 2,
        }),
      (err: unknown) =>
        err instanceof AdminCategoryError && err.code === 'THIRD_LEVEL'
    )
  })

  it('rechaza parent legacy', () => {
    assert.throws(
      () =>
        validateCategoryHierarchyRules({
          parent: { id: 7, parentId: null, slug: 'agua' },
          current: null,
          nextParentId: 7,
        }),
      (err: unknown) =>
        err instanceof AdminCategoryError && err.code === 'PARENT_LEGACY'
    )
  })

  it('rechaza delete con productos', () => {
    assert.throws(
      () => validateCategoryDelete({ productCount: 3, childCount: 0 }),
      (err: unknown) =>
        err instanceof AdminCategoryError && err.code === 'DELETE_HAS_PRODUCTS'
    )
  })

  it('rechaza delete con hijos', () => {
    assert.throws(
      () => validateCategoryDelete({ productCount: 0, childCount: 2 }),
      (err: unknown) =>
        err instanceof AdminCategoryError && err.code === 'DELETE_HAS_CHILDREN'
    )
  })

  it('acepta delete hoja vacía', () => {
    assert.doesNotThrow(() =>
      validateCategoryDelete({ productCount: 0, childCount: 0 })
    )
  })

  it('rechaza asignación a principal', () => {
    assert.throws(
      () =>
        validateLeafAssignment({
          id: 1,
          parentId: null,
          slug: 'pasturas',
          isActive: true,
          childCount: 1,
        }),
      (err: unknown) =>
        err instanceof AdminCategoryError && err.code === 'CATEGORY_NOT_LEAF'
    )
  })

  it('acepta hoja V1 activa', () => {
    assert.doesNotThrow(() =>
      validateLeafAssignment({
        id: 10,
        parentId: 1,
        slug: 'aisladores',
        isActive: true,
        childCount: 0,
      })
    )
  })

  it('arma árbol excluyendo legacy', () => {
    const tree = buildAdminCategoryTree([
      {
        id: 1,
        name: 'Electrificación y Alambrados',
        slug: 'electrificacion-y-alambrados',
        parentId: null,
        sortOrder: 1,
        shortDescription: null,
        imageUrl: null,
        showInHome: true,
        isActive: true,
        productCount: 0,
        childCount: 1,
      },
      {
        id: 2,
        name: 'Aisladores',
        slug: 'aisladores',
        parentId: 1,
        sortOrder: 1,
        shortDescription: null,
        imageUrl: null,
        showInHome: false,
        isActive: true,
        productCount: 5,
        childCount: 0,
      },
      {
        id: 7,
        name: 'Agua',
        slug: 'agua',
        parentId: null,
        sortOrder: 0,
        shortDescription: null,
        imageUrl: null,
        showInHome: false,
        isActive: true,
        productCount: 0,
        childCount: 0,
      },
    ])
    assert.equal(tree.length, 1)
    assert.equal(tree[0].slug, 'electrificacion-y-alambrados')
    assert.equal(tree[0].children.length, 1)
    assert.equal(isLegacyCategorySlug('agua'), true)
  })
})
