import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isLegacyCategorySlug } from '@/lib/admin-categories'
import {
  buildCatalogCategoryTree,
  buildFlatPublicLeafCategories,
  buildPublicCategoryIndex,
  buildPublicProductCategoryWhere,
  resolveCatalogCategoryBySlug,
  resolveCatalogCategoryFromTree,
  type PublicCategoryRow,
} from '@/lib/catalog-category-public'

function row(
  partial: Partial<PublicCategoryRow> & Pick<PublicCategoryRow, 'id' | 'slug' | 'name' | 'parentId'>
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

/** Mini taxonomía V1 alineada a TAXONOMY_V1 (2 roots, 3 leaves). */
function miniV1Fixture() {
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
    // legacy activa (debe excluirse)
    row({
      id: 99,
      name: 'Legacy lectores',
      slug: 'lectores',
      parentId: null,
      sortOrder: 99,
    }),
    // hoja inactiva
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
    [99, 999], // legacy con productos — no debe contar en árbol
  ])

  const index = buildPublicCategoryIndex({ categories, countsByCategoryId })
  return { categories, countsByCategoryId, index }
}

describe('buildPublicCategoryIndex — hojas administrables', () => {
  const identRoot = row({
    id: 2,
    name: 'Identificación y Pesaje Animal',
    slug: 'identificacion-y-pesaje-animal',
    parentId: null,
    sortOrder: 2,
  })

  it('caso 1: hoja V1 seed con productos públicos → en índice y árbol', () => {
    const { index } = miniV1Fixture()
    assert.ok(index.bySlug.has('aisladores'))
    const tree = buildCatalogCategoryTree(index)
    const slugs =
      tree
        .find((r) => r.slug === 'electrificacion-y-alambrados')
        ?.children?.map((c) => c.slug) ?? []
    assert.ok(slugs.includes('aisladores'))
  })

  it('caso 2: hoja nueva admin bajo root V1 con productos → en índice y árbol', () => {
    const categories: PublicCategoryRow[] = [
      identRoot,
      row({
        id: 36,
        name: 'Identificación electrónica Oficial Senasa',
        slug: 'identificacion-electronica-oficial-senasa',
        parentId: 2,
        sortOrder: 1,
      }),
    ]
    const counts = new Map<number, number>([[36, 9]])
    const index = buildPublicCategoryIndex({ categories, countsByCategoryId: counts })
    assert.ok(index.bySlug.has('identificacion-electronica-oficial-senasa'))
    const tree = buildCatalogCategoryTree(index)
    const idRoot = tree.find((r) => r.slug === 'identificacion-y-pesaje-animal')
    assert.ok(idRoot)
    assert.equal(idRoot?.count, 9)
    assert.deepEqual(
      idRoot?.children?.map((c) => c.slug),
      ['identificacion-electronica-oficial-senasa'],
    )
  })

  it('caso 3: hoja admin activa con 0 públicos → en índice pero oculta en árbol', () => {
    const categories: PublicCategoryRow[] = [
      identRoot,
      row({
        id: 39,
        name: 'Sistemas de Pesaje',
        slug: 'sistemas-de-pesaje',
        parentId: 2,
      }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map(),
    })
    assert.ok(index.bySlug.has('sistemas-de-pesaje'))
    const tree = buildCatalogCategoryTree(index)
    assert.equal(tree.length, 0)
  })

  it('caso 4: hoja inactiva con productos → fuera del índice', () => {
    const categories: PublicCategoryRow[] = [
      identRoot,
      row({
        id: 50,
        name: 'Inactiva admin',
        slug: 'hoja-inactiva-admin',
        parentId: 2,
        isActive: false,
      }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map([[50, 5]]),
    })
    assert.ok(!index.bySlug.has('hoja-inactiva-admin'))
  })

  it('caso 5: legacy → fuera del índice aunque tenga parent V1', () => {
    const categories: PublicCategoryRow[] = [
      identRoot,
      row({
        id: 99,
        name: 'Legacy lectores',
        slug: 'lectores',
        parentId: 2,
      }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map([[99, 10]]),
    })
    assert.ok(!index.bySlug.has('lectores'))
  })

  it('hoja bajo root no V1 → excluida', () => {
    const categories: PublicCategoryRow[] = [
      row({
        id: 500,
        name: 'Root custom no V1',
        slug: 'root-custom-no-v1',
        parentId: null,
      }),
      row({
        id: 501,
        name: 'Hoja bajo root inválido',
        slug: 'hoja-root-invalido',
        parentId: 500,
      }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map([[501, 3]]),
    })
    assert.ok(!index.bySlug.has('hoja-root-invalido'))
    assert.ok(!index.bySlug.has('root-custom-no-v1'))
  })

  it('categoría intermedia con hijas → no entra como hoja', () => {
    const categories: PublicCategoryRow[] = [
      identRoot,
      row({
        id: 60,
        name: 'Intermedia',
        slug: 'intermedia-id',
        parentId: 2,
      }),
      row({
        id: 61,
        name: 'Hoja real',
        slug: 'hoja-real',
        parentId: 60,
      }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map([[61, 4]]),
    })
    assert.ok(!index.bySlug.has('intermedia-id'))
    assert.ok(!index.bySlug.has('hoja-real'))
  })
})

describe('buildCatalogCategoryTree', () => {
  it('devuelve roots V1 ordenados por sortOrder', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    assert.equal(tree.length, 2)
    assert.equal(tree[0].slug, 'electrificacion-y-alambrados')
    assert.equal(tree[1].slug, 'identificacion-y-pesaje-animal')
  })

  it('children bajo parent correcto', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const elec = tree[0]
    assert.equal(elec.children?.length, 2)
    assert.deepEqual(
      elec.children?.map((c) => c.slug),
      ['aisladores', 'energizadores']
    )
  })

  it('legacy excluida del árbol', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const allSlugs = tree.flatMap((r) => [
      r.slug,
      ...(r.children ?? []).map((c) => c.slug),
    ])
    assert.ok(!allSlugs.includes('lectores'))
    assert.ok(isLegacyCategorySlug('lectores'))
  })

  it('inactive excluida del árbol', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const elecChildren = tree[0].children?.map((c) => c.slug) ?? []
    assert.ok(!elecChildren.includes('cercos-moviles'))
  })

  it('hoja con 0 públicos excluida', () => {
    const categories: PublicCategoryRow[] = [
      row({
        id: 1,
        name: 'Pasturas',
        slug: 'pasturas',
        parentId: null,
        sortOrder: 6,
      }),
    row({
      id: 30,
      name: 'Medición de pasturas',
      slug: 'medicion-de-pasturas',
      parentId: 1,
      sortOrder: 1,
    }),
    ]
    const index = buildPublicCategoryIndex({
      categories,
      countsByCategoryId: new Map(),
    })
    const tree = buildCatalogCategoryTree(index)
    assert.equal(tree.length, 0)
  })

  it('root count = suma children visibles', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    assert.equal(tree[0].count, 80)
    assert.equal(tree[0].children?.[0].count, 50)
    assert.equal(tree[1].count, 15)
  })
})

describe('buildFlatPublicLeafCategories', () => {
  it('lista plana solo hojas con count > 0', () => {
    const { index } = miniV1Fixture()
    const flat = buildFlatPublicLeafCategories(index)
    assert.equal(flat.length, 3)
    assert.ok(flat.every((c) => c.count > 0))
    assert.ok(!flat.some((c) => c.slug === 'lectores'))
  })
})

describe('buildPublicProductCategoryWhere', () => {
  it('category hoja → slug exacto', () => {
    const { index } = miniV1Fixture()
    const w = buildPublicProductCategoryWhere(index, {
      category: 'aisladores',
    })
    assert.deepEqual(w, { category: { slug: 'aisladores' } })
  })

  it('categoryRoot → parent.slug', () => {
    const { index } = miniV1Fixture()
    const w = buildPublicProductCategoryWhere(index, {
      categoryRoot: 'electrificacion-y-alambrados',
    })
    assert.deepEqual(w, {
      category: { parent: { slug: 'electrificacion-y-alambrados' } },
    })
  })

  it('category root slug en param category → inválido', () => {
    const { index } = miniV1Fixture()
    const w = buildPublicProductCategoryWhere(index, {
      category: 'electrificacion-y-alambrados',
    })
    assert.equal(w, null)
  })

  it('legacy slug → inválido', () => {
    const { index } = miniV1Fixture()
    assert.equal(
      buildPublicProductCategoryWhere(index, { category: 'lectores' }),
      null
    )
  })

  it('inactive slug → inválido', () => {
    const { index } = miniV1Fixture()
    assert.equal(
      buildPublicProductCategoryWhere(index, { category: 'cercos-moviles' }),
      null
    )
  })
})

describe('resolveCatalogCategoryBySlug', () => {
  it('root válido aunque no tenga productos directos', () => {
    const { index } = miniV1Fixture()
    const resolved = resolveCatalogCategoryBySlug(
      index,
      'electrificacion-y-alambrados'
    )
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'root')
    assert.equal(resolved?.count, 80)
    assert.equal(resolved?.children?.length, 2)
  })

  it('leaf devuelve parent', () => {
    const { index } = miniV1Fixture()
    const resolved = resolveCatalogCategoryBySlug(index, 'aisladores')
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'leaf')
    assert.equal(resolved?.parent?.slug, 'electrificacion-y-alambrados')
    assert.equal(resolved?.count, 50)
  })

  it('legacy no se expone', () => {
    const { index } = miniV1Fixture()
    assert.equal(resolveCatalogCategoryBySlug(index, 'lectores'), null)
  })

  it('inactive no se expone', () => {
    const { index } = miniV1Fixture()
    assert.equal(resolveCatalogCategoryBySlug(index, 'cercos-moviles'), null)
  })
})

describe('resolveCatalogCategoryFromTree (P4C / cache compartido)', () => {
  it('root con 0 productos directos pero hijos con productos → visible', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const resolved = resolveCatalogCategoryFromTree(
      tree,
      'electrificacion-y-alambrados',
    )
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'root')
    assert.equal(resolved?.count, 80)
    assert.ok((resolved?.count ?? 0) > 0)
  })

  it('root count = suma de hojas del árbol', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const resolved = resolveCatalogCategoryFromTree(
      tree,
      'electrificacion-y-alambrados',
    )
    const childSum = (resolved?.children ?? []).reduce((s, c) => s + c.count, 0)
    assert.equal(resolved?.count, childSum)
    assert.equal(resolved?.count, 80)
  })

  it('leaf válida sigue resolviendo con parent', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    const resolved = resolveCatalogCategoryFromTree(tree, 'aisladores')
    assert.ok(resolved)
    assert.equal(resolved?.kind, 'leaf')
    assert.equal(resolved?.parent?.slug, 'electrificacion-y-alambrados')
    assert.equal(resolved?.count, 50)
  })

  it('legacy sigue 404', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    assert.equal(resolveCatalogCategoryFromTree(tree, 'lectores'), null)
  })

  it('inactive sigue 404', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    assert.equal(resolveCatalogCategoryFromTree(tree, 'cercos-moviles'), null)
  })

  it('inexistente sigue 404', () => {
    const { index } = miniV1Fixture()
    const tree = buildCatalogCategoryTree(index)
    assert.equal(resolveCatalogCategoryFromTree(tree, 'no-existe'), null)
  })
})

describe('brands / product filter semantics (where builder)', () => {
  it('category tiene prioridad sobre categoryRoot si ambos (caller debe evitar)', () => {
    const { index } = miniV1Fixture()
    const w = buildPublicProductCategoryWhere(index, {
      category: 'aisladores',
      categoryRoot: 'electrificacion-y-alambrados',
    })
    assert.deepEqual(w, { category: { slug: 'aisladores' } })
  })
})
