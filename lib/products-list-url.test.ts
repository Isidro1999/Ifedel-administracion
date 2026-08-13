import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PRODUCTS_LIST_DEFAULTS,
  PRODUCTS_LIST_DEFAULT_SORT,
  PRODUCTS_LIST_PATH,
  buildProductsListHref,
  buildProductsListSearchParams,
  canSafelyBackToProductsList,
  parseProductsListState,
} from './products-list-url'

describe('parseProductsListState', () => {
  it('lee filtros y página desde URLSearchParams', () => {
    const sp = new URLSearchParams(
      'q=gall+energ&brand=Gallagher&category=lectores&page=4&sort=price_asc',
    )
    const state = parseProductsListState(sp)
    assert.equal(state.q, 'gall energ')
    assert.equal(state.brand, 'Gallagher')
    assert.equal(state.category, 'lectores')
    assert.equal(state.page, 4)
    assert.equal(state.sort, 'price_asc')
  })

  it('cae a defaults con page inválida y sort desconocido', () => {
    const sp = new URLSearchParams('page=-4&sort=nope&q=')
    const state = parseProductsListState(sp)
    assert.equal(state.page, 1)
    assert.equal(state.sort, PRODUCTS_LIST_DEFAULT_SORT)
    assert.equal(state.q, '')
  })

  it('acepta page=abc como página 1', () => {
    const state = parseProductsListState(new URLSearchParams('page=abc'))
    assert.equal(state.page, 1)
  })
})

describe('buildProductsListSearchParams', () => {
  it('omite defaults (page=1, sort default, vacíos)', () => {
    const sp = buildProductsListSearchParams(PRODUCTS_LIST_DEFAULTS)
    assert.equal(sp.toString(), '')
  })

  it('agrega filtro y resetea page', () => {
    const current = {
      ...PRODUCTS_LIST_DEFAULTS,
      q: 'gall',
      page: 4,
    }
    const sp = buildProductsListSearchParams(current, {
      brand: 'Gallagher',
      page: null,
    })
    assert.equal(sp.get('q'), 'gall')
    assert.equal(sp.get('brand'), 'Gallagher')
    assert.equal(sp.get('page'), null)
  })

  it('preserva params al cambiar solo page', () => {
    const current = {
      ...PRODUCTS_LIST_DEFAULTS,
      q: 'gall',
      brand: 'Gallagher',
      category: 'lectores',
      page: 2,
    }
    const sp = buildProductsListSearchParams(current, { page: 3 })
    assert.equal(sp.get('q'), 'gall')
    assert.equal(sp.get('brand'), 'Gallagher')
    assert.equal(sp.get('category'), 'lectores')
    assert.equal(sp.get('page'), '3')
  })

  it('elimina filtro con null', () => {
    const current = {
      ...PRODUCTS_LIST_DEFAULTS,
      brand: 'Gallagher',
      q: 'x',
    }
    const sp = buildProductsListSearchParams(current, { brand: null })
    assert.equal(sp.get('brand'), null)
    assert.equal(sp.get('q'), 'x')
  })
})

describe('buildProductsListHref', () => {
  it('arma href limpio', () => {
    assert.equal(buildProductsListHref(PRODUCTS_LIST_DEFAULTS), PRODUCTS_LIST_PATH)
    assert.equal(
      buildProductsListHref(PRODUCTS_LIST_DEFAULTS, { q: 'gall', page: 3 }),
      `${PRODUCTS_LIST_PATH}?q=gall&page=3`,
    )
  })
})

describe('canSafelyBackToProductsList', () => {
  it('true solo con idx > 0', () => {
    assert.equal(canSafelyBackToProductsList({ idx: 2 }), true)
    assert.equal(canSafelyBackToProductsList({ idx: 0 }), false)
    assert.equal(canSafelyBackToProductsList({}), false)
    assert.equal(canSafelyBackToProductsList(null), false)
  })
})
