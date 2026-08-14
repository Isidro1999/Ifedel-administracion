import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  PRODUCTS_LIST_DEFAULTS,
  PRODUCTS_LIST_DEFAULT_SORT,
  PRODUCTS_LIST_PATH,
  buildProductDetailHref,
  buildProductsListHref,
  buildProductsListReturnUrl,
  buildProductsListSearchParams,
  canSafelyBackToProductsList,
  isValidProductsListReturnUrl,
  parseProductsListReturnUrl,
  parseProductsListState,
  resolveProductsListBackHref,
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

describe('buildProductsListReturnUrl', () => {
  it('preserva query string crudo del listado', () => {
    const sp = new URLSearchParams('q=gall&brand=Gallagher&page=3')
    assert.equal(
      buildProductsListReturnUrl(sp),
      '/products?q=gall&brand=Gallagher&page=3',
    )
  })

  it('sin params devuelve /products', () => {
    assert.equal(buildProductsListReturnUrl(new URLSearchParams()), PRODUCTS_LIST_PATH)
  })
})

describe('buildProductDetailHref', () => {
  it('arma href con from encoded', () => {
    const origin = '/products?q=gall&brand=Gallagher&page=3'
    assert.equal(
      buildProductDetailHref(8, origin),
      '/products/8?from=%2Fproducts%3Fq%3Dgall%26brand%3DGallagher%26page%3D3',
    )
  })

  it('return inválido → from=/products', () => {
    assert.equal(
      buildProductDetailHref(8, 'https://evil.com'),
      '/products/8?from=%2Fproducts',
    )
  })
})

describe('isValidProductsListReturnUrl', () => {
  it('acepta /products y /products?...', () => {
    assert.equal(isValidProductsListReturnUrl('/products'), true)
    assert.equal(
      isValidProductsListReturnUrl('/products?q=gall&brand=Gallagher&page=3'),
      true,
    )
  })

  it('rechaza URLs externas y protocol-relative', () => {
    assert.equal(isValidProductsListReturnUrl('https://evil.com'), false)
    assert.equal(isValidProductsListReturnUrl('//evil.com/products'), false)
    assert.equal(isValidProductsListReturnUrl('/admin/catalog'), false)
    assert.equal(isValidProductsListReturnUrl('/products/8'), false)
  })

  it('rechaza query params desconocidos', () => {
    assert.equal(isValidProductsListReturnUrl('/products?redirect=https://x'), false)
  })
})

describe('parseProductsListReturnUrl', () => {
  it('decodifica from válido', () => {
    const encoded = encodeURIComponent('/products?q=gall&page=3')
    assert.equal(
      parseProductsListReturnUrl(encoded),
      '/products?q=gall&page=3',
    )
  })

  it('rechaza from malicioso', () => {
    assert.equal(
      parseProductsListReturnUrl(encodeURIComponent('https://evil.com')),
      null,
    )
  })
})

describe('resolveProductsListBackHref', () => {
  it('usa from válido', () => {
    const encoded = encodeURIComponent('/products?q=gall&page=3')
    assert.equal(resolveProductsListBackHref(encoded), '/products?q=gall&page=3')
  })

  it('fallback /products sin from o inválido', () => {
    assert.equal(resolveProductsListBackHref(null), PRODUCTS_LIST_PATH)
    assert.equal(
      resolveProductsListBackHref(encodeURIComponent('//evil.com')),
      PRODUCTS_LIST_PATH,
    )
  })
})
