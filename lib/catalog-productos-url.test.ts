import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildCatalogCategoryTree,
  buildPublicCategoryIndex,
  type PublicCategoryRow,
} from '@/lib/catalog-category-public'
import {
  applyCatalogProductosPatch,
  buildCatalogProductosHref,
  buildCatalogProductosSearchParams,
  buildCatalogProductDetailHref,
  catalogProductosPaginationParams,
  countActiveCatalogProductosFilters,
  findRootSlugForLeaf,
  isValidCatalogProductosReturnUrl,
  parseCatalogProductosReturnUrl,
  parseCatalogProductosState,
  resolveCatalogProductosBackHref,
  resolveEffectiveCategoryRoot,
  sanitizeBrandForContext,
} from '@/lib/catalog-productos-url'

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

function miniTree() {
  const categories: PublicCategoryRow[] = [
    row({
      id: 1,
      name: 'Electrificación y Alambrados',
      slug: 'electrificacion-y-alambrados',
      parentId: null,
      sortOrder: 1,
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
  ]
  const countsByCategoryId = new Map<number, number>([
    [10, 50],
    [11, 30],
    [20, 15],
    [99, 999],
  ])
  const index = buildPublicCategoryIndex({ categories, countsByCategoryId })
  return buildCatalogCategoryTree(index)
}

const BASE = '/productos'

describe('parseCatalogProductosState / buildCatalogProductosHref', () => {
  it('seleccionar root genera categoryRoot', () => {
    const href = buildCatalogProductosHref(
      BASE,
      parseCatalogProductosState({}),
      { categoryRoot: 'electrificacion-y-alambrados', page: null },
    )
    assert.equal(href, '/productos?categoryRoot=electrificacion-y-alambrados')
  })

  it('seleccionar hoja mantiene root', () => {
    const href = buildCatalogProductosHref(
      BASE,
      parseCatalogProductosState({ categoryRoot: 'electrificacion-y-alambrados' }),
      { category: 'aisladores', page: null },
    )
    assert.equal(
      href,
      '/productos?categoryRoot=electrificacion-y-alambrados&category=aisladores',
    )
  })

  it('cambiar root elimina hoja anterior', () => {
    const next = applyCatalogProductosPatch(
      parseCatalogProductosState({
        categoryRoot: 'electrificacion-y-alambrados',
        category: 'aisladores',
      }),
      { categoryRoot: 'identificacion-y-pesaje-animal' },
    )
    assert.equal(next.categoryRoot, 'identificacion-y-pesaje-animal')
    assert.equal(next.category, '')
  })

  it('quitar root elimina hoja', () => {
    const next = applyCatalogProductosPatch(
      parseCatalogProductosState({
        categoryRoot: 'electrificacion-y-alambrados',
        category: 'aisladores',
      }),
      { categoryRoot: null },
    )
    assert.equal(next.categoryRoot, '')
    assert.equal(next.category, '')
  })

  it('cambiar filtro resetea page', () => {
    const href = buildCatalogProductosHref(
      BASE,
      parseCatalogProductosState({ page: '3', brand: 'gallagher' }),
      { q: 'pastor', page: null },
    )
    assert.match(href, /q=pastor/)
    assert.doesNotMatch(href, /page=/)
  })

  it('sort preservado en paginación', () => {
    const state = parseCatalogProductosState({
      sort: 'name_asc',
      categoryRoot: 'electrificacion-y-alambrados',
    })
    const params = catalogProductosPaginationParams(state)
    assert.equal(params.sort, 'name_asc')
    assert.equal(params.categoryRoot, 'electrificacion-y-alambrados')

    const page2 = buildCatalogProductosHref(BASE, state, { page: 2 })
    assert.equal(
      page2,
      '/productos?categoryRoot=electrificacion-y-alambrados&sort=name_asc&page=2',
    )
  })

  it('sort featured default no se serializa', () => {
    const sp = buildCatalogProductosSearchParams(parseCatalogProductosState({}))
    assert.equal(sp.get('sort'), null)
  })
})

describe('sidebar tree helpers', () => {
  const tree = miniTree()

  it('roots correctos sin legacy', () => {
    assert.equal(tree.length, 2)
    assert.equal(tree[0].slug, 'electrificacion-y-alambrados')
    assert.equal(tree[0].count, 80)
    assert.equal(tree[1].slug, 'identificacion-y-pesaje-animal')
  })

  it('hijos solo del root seleccionado', () => {
    const root = tree[0]
    assert.equal(root.children?.length, 2)
    assert.deepEqual(
      root.children?.map((c) => c.slug),
      ['aisladores', 'energizadores'],
    )
  })

  it('counts correctos en hojas', () => {
    const root = tree[0]
    assert.equal(root.children?.[0].count, 50)
    assert.equal(root.children?.[1].count, 30)
  })

  it('legacy ausente del árbol', () => {
    assert.equal(
      tree.some((r) => r.slug === 'lectores'),
      false,
    )
  })

  it('resolveEffectiveCategoryRoot con solo category legacy URL', () => {
    const root = resolveEffectiveCategoryRoot(
      { categoryRoot: '', category: 'aisladores' },
      tree,
    )
    assert.equal(root, 'electrificacion-y-alambrados')
    assert.equal(findRootSlugForLeaf(tree, 'aisladores'), 'electrificacion-y-alambrados')
  })
})

describe('brands / filtros activos', () => {
  it('sanitizeBrandForContext limpia marca inválida', () => {
    assert.equal(
      sanitizeBrandForContext('gallagher', [{ slug: 'tru-test' }]),
      '',
    )
    assert.equal(
      sanitizeBrandForContext('gallagher', [{ slug: 'gallagher' }]),
      'gallagher',
    )
  })

  it('countActiveCatalogProductosFilters', () => {
    const n = countActiveCatalogProductosFilters(
      parseCatalogProductosState({
        q: 'x',
        categoryRoot: 'electrificacion-y-alambrados',
        category: 'aisladores',
        brand: 'gallagher',
        sort: 'name_desc',
      }),
    )
    assert.equal(n, 5)
  })
})

describe('catalog productos return url (from)', () => {
  it('arma href con from encoded', () => {
    const origin =
      '/productos?categoryRoot=identificacion-y-pesaje-animal&category=lectores-identificacion-y-pesaje&brand=gallagher&page=2'
    assert.equal(
      buildCatalogProductDetailHref('/productos/foo', origin),
      '/productos/foo?from=%2Fproductos%3FcategoryRoot%3Didentificacion-y-pesaje-animal%26category%3Dlectores-identificacion-y-pesaje%26brand%3Dgallagher%26page%3D2',
    )
  })

  it('return inválido → from fallback', () => {
    assert.equal(
      buildCatalogProductDetailHref('/productos/foo', 'https://evil.com'),
      '/productos/foo?from=%2Fproductos',
    )
  })

  it('decodifica from válido', () => {
    const encoded = encodeURIComponent(
      '/productos?categoryRoot=electrificacion-y-alambrados',
    )
    assert.equal(
      parseCatalogProductosReturnUrl(encoded),
      '/productos?categoryRoot=electrificacion-y-alambrados',
    )
  })

  it('rechaza from malicioso', () => {
    assert.equal(parseCatalogProductosReturnUrl('//evil.com'), null)
    assert.equal(parseCatalogProductosReturnUrl('https://evil.com'), null)
    assert.equal(parseCatalogProductosReturnUrl('/admin'), null)
    assert.equal(parseCatalogProductosReturnUrl('/productos?evil=1'), null)
  })

  it('resolveCatalogProductosBackHref usa from válido', () => {
    const encoded = encodeURIComponent('/productos?q=pastor&sort=name_asc')
    assert.equal(
      resolveCatalogProductosBackHref(encoded),
      '/productos?q=pastor&sort=name_asc',
    )
  })

  it('fallback /productos sin from o inválido', () => {
    assert.equal(resolveCatalogProductosBackHref(null), '/productos')
    assert.equal(
      resolveCatalogProductosBackHref(encodeURIComponent('//evil.com')),
      '/productos',
    )
    assert.equal(
      resolveCatalogProductosBackHref(null, '/catalogo/productos'),
      '/catalogo/productos',
    )
  })

  it('acepta path con prefijo /catalogo/productos', () => {
    const url = '/catalogo/productos?categoryRoot=agua-y-manejo-hidrico'
    assert.equal(isValidCatalogProductosReturnUrl(url), true)
    assert.equal(parseCatalogProductosReturnUrl(encodeURIComponent(url)), url)
  })
})
