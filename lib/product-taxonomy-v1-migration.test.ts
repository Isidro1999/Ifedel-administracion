import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  parseProductTaxonomyMappingCsv,
  validateMappingRowsStructure,
  validateProductTaxonomyMigration,
  groupPlannedChangesByCategoryId,
  assertUpdateManyCount,
  type CategoryLeafCandidate,
  type PlannedChange,
  type ProductSnapshotRow,
} from './product-taxonomy-v1-migration'
import { assertLocalP1Database, sanitizeDatabaseUrl } from './db-local-safety'

function leaf(
  partial: Partial<CategoryLeafCandidate> & Pick<CategoryLeafCandidate, 'id' | 'slug'>
): CategoryLeafCandidate {
  return {
    name: partial.name ?? partial.slug,
    parentId: partial.parentId ?? 1,
    isActive: partial.isActive ?? true,
    isTaxonomyV1: partial.isTaxonomyV1 ?? true,
    isLeaf: partial.isLeaf ?? true,
    ...partial,
  }
}

describe('parseProductTaxonomyMappingCsv', () => {
  it('parsea header con BOM y filas', () => {
    const raw = '\uFEFFsku,new_category_slug\nA1,aisladores\nA2,energizadores\n'
    const { rows, errors } = parseProductTaxonomyMappingCsv(raw)
    assert.equal(errors.length, 0)
    assert.equal(rows.length, 2)
    assert.equal(rows[0].sku, 'A1')
    assert.equal(rows[0].newCategorySlug, 'aisladores')
  })

  it('detecta SKU duplicado en estructura', () => {
    const { rows } = parseProductTaxonomyMappingCsv(
      'sku,new_category_slug\nA1,aisladores\nA1,energizadores\n'
    )
    const issues = validateMappingRowsStructure(rows)
    assert.ok(issues.some((i) => i.code === 'DUPLICATE_SKU'))
  })

  it('detecta SKU vacío y destino vacío', () => {
    const { rows } = parseProductTaxonomyMappingCsv(
      'sku,new_category_slug\n,aisladores\nA2,\n'
    )
    const issues = validateMappingRowsStructure(rows)
    assert.ok(issues.some((i) => i.code === 'EMPTY_SKU'))
    assert.ok(issues.some((i) => i.code === 'EMPTY_DESTINATION'))
  })

  it('preserva trailing spaces en SKU', () => {
    const raw = 'sku,new_category_slug\nXHU-SMM ,aplicadores-y-accesorios\n'
    const { rows, errors } = parseProductTaxonomyMappingCsv(raw)
    assert.equal(errors.length, 0)
    assert.equal(rows[0].sku, 'XHU-SMM ')
    assert.equal(rows[0].newCategorySlug, 'aplicadores-y-accesorios')
  })
})

describe('validateProductTaxonomyMigration', () => {
  const destA = leaf({
    id: 10,
    slug: 'aisladores',
    parentId: 1,
    isTaxonomyV1: true,
    isLeaf: true,
  })
  const destB = leaf({
    id: 11,
    slug: 'energizadores',
    parentId: 1,
    isTaxonomyV1: true,
    isLeaf: true,
  })
  const fallbackLectores = leaf({
    id: 20,
    slug: 'lectores-identificacion-y-pesaje',
    parentId: 2,
  })
  const fallbackPostes = leaf({
    id: 21,
    slug: 'postes-y-varillas-electrificacion',
    parentId: 1,
  })

  const categoriesBySlug = new Map<string, CategoryLeafCandidate>([
    [destA.slug, destA],
    [destB.slug, destB],
    [fallbackLectores.slug, fallbackLectores],
    [fallbackPostes.slug, fallbackPostes],
  ])

  const v1CategoryIds = new Set([10, 11, 20, 21, 1, 2])

  function products(list: Array<Partial<ProductSnapshotRow> & { sku: string }>): ProductSnapshotRow[] {
    return list.map((p, i) => ({
      id: p.id ?? i + 1,
      sku: p.sku,
      categoryId: p.categoryId ?? 99,
      categorySlug: p.categorySlug ?? 'legacy',
      categoryName: p.categoryName ?? 'Legacy',
      categoryParentId: p.categoryParentId ?? null,
    }))
  }

  it('OK cuando CSV y DB coinciden y destinos son hojas V1', () => {
    const mappingRows = [
      { sku: 'A1', newCategorySlug: 'aisladores', line: 2 },
      { sku: 'A2', newCategorySlug: 'energizadores', line: 3 },
    ]
    const result = validateProductTaxonomyMigration({
      mappingRows,
      products: products([
        { sku: 'A1', categoryId: 99 },
        { sku: 'A2', categoryId: 99 },
      ]),
      categoriesBySlug,
      v1CategoryIds,
      expectedProductCount: 2,
    })
    assert.equal(result.ok, true)
    assert.equal(result.changesNeeded, 2)
    assert.equal(result.productsOnV1Before, 0)
  })

  it('falla si falta SKU en DB', () => {
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'aisladores', line: 2 }],
      products: products([]),
      categoriesBySlug,
      v1CategoryIds,
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'SKU_MISSING_IN_DB'))
  })

  it('falla si hay producto extra en DB', () => {
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'aisladores', line: 2 }],
      products: products([
        { sku: 'A1', categoryId: 99 },
        { sku: 'EXTRA', categoryId: 99 },
      ]),
      categoriesBySlug,
      v1CategoryIds,
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'SKU_EXTRA_IN_DB'))
  })

  it('falla si slug destino no existe', () => {
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'no-existe', line: 2 }],
      products: products([{ sku: 'A1' }]),
      categoriesBySlug,
      v1CategoryIds,
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'DEST_NOT_FOUND'))
  })

  it('falla si destino es principal', () => {
    const root = leaf({
      id: 1,
      slug: 'electrificacion-y-alambrados',
      parentId: null,
      isLeaf: false,
      isTaxonomyV1: true,
    })
    const map = new Map(categoriesBySlug)
    map.set(root.slug, root)
    const result = validateProductTaxonomyMigration({
      mappingRows: [
        { sku: 'A1', newCategorySlug: 'electrificacion-y-alambrados', line: 2 },
      ],
      products: products([{ sku: 'A1' }]),
      categoriesBySlug: map,
      v1CategoryIds,
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'DEST_IS_ROOT'))
  })

  it('falla si destino inactivo', () => {
    const inactive = leaf({
      id: 30,
      slug: 'carreteles',
      isActive: false,
    })
    const map = new Map(categoriesBySlug)
    map.set(inactive.slug, inactive)
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'carreteles', line: 2 }],
      products: products([{ sku: 'A1' }]),
      categoriesBySlug: map,
      v1CategoryIds: new Set([...v1CategoryIds, 30]),
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'DEST_INACTIVE'))
  })

  it('falla si destino no es hoja', () => {
    const parentLike = leaf({
      id: 40,
      slug: 'con-hijos',
      parentId: 1,
      isLeaf: false,
    })
    const map = new Map(categoriesBySlug)
    map.set(parentLike.slug, parentLike)
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'con-hijos', line: 2 }],
      products: products([{ sku: 'A1' }]),
      categoriesBySlug: map,
      v1CategoryIds: new Set([...v1CategoryIds, 40]),
    })
    assert.equal(result.ok, false)
    assert.ok(result.issues.some((i) => i.code === 'DEST_NOT_LEAF'))
  })

  it('acepta slugs fallback V1 como hoja válida', () => {
    const result = validateProductTaxonomyMigration({
      mappingRows: [
        {
          sku: 'L1',
          newCategorySlug: 'lectores-identificacion-y-pesaje',
          line: 2,
        },
        {
          sku: 'P1',
          newCategorySlug: 'postes-y-varillas-electrificacion',
          line: 3,
        },
      ],
      products: products([
        { sku: 'L1', categoryId: 99 },
        { sku: 'P1', categoryId: 99 },
      ]),
      categoriesBySlug,
      v1CategoryIds,
      expectedProductCount: 2,
    })
    assert.equal(result.ok, true)
    assert.equal(result.planned[0].toCategorySlug, 'lectores-identificacion-y-pesaje')
    assert.equal(result.planned[1].toCategorySlug, 'postes-y-varillas-electrificacion')
  })

  it('marca alreadyAtTarget cuando ya está en destino', () => {
    const result = validateProductTaxonomyMigration({
      mappingRows: [{ sku: 'A1', newCategorySlug: 'aisladores', line: 2 }],
      products: products([{ sku: 'A1', categoryId: 10, categorySlug: 'aisladores' }]),
      categoriesBySlug,
      v1CategoryIds,
      expectedProductCount: 1,
    })
    assert.equal(result.ok, true)
    assert.equal(result.alreadyAtTarget, 1)
    assert.equal(result.changesNeeded, 0)
  })
})

describe('groupPlannedChangesByCategoryId', () => {
  it('agrupa 475 mappings en grupos por categoryId con conteos correctos', () => {
    const planned: PlannedChange[] = []
    let skuN = 0
    // 37 grupos de 12 = 444 + 1 grupo de 31 = 475 → 38 hojas
    const groupDefs = [
      { id: 100, slug: 'leaf-0', n: 31 },
      ...Array.from({ length: 37 }, (_, i) => ({
        id: 101 + i,
        slug: `leaf-${i + 1}`,
        n: 12,
      })),
    ]
    assert.equal(
      groupDefs.reduce((s, g) => s + g.n, 0),
      475
    )

    for (const g of groupDefs) {
      for (let i = 0; i < g.n; i++) {
        skuN += 1
        planned.push({
          sku: `SKU-${skuN}`,
          productId: skuN,
          fromCategoryId: 1,
          fromCategorySlug: 'legacy',
          toCategoryId: g.id,
          toCategorySlug: g.slug,
          alreadyAtTarget: false,
        })
      }
    }

    const groups = groupPlannedChangesByCategoryId(planned)
    assert.equal(groups.length, 38)
    assert.equal(
      groups.reduce((s, g) => s + g.expectedCount, 0),
      475
    )
    assert.equal(groups.find((g) => g.toCategoryId === 100)?.expectedCount, 31)
    assert.equal(groups.find((g) => g.toCategoryId === 101)?.expectedCount, 12)
  })

  it('ignora alreadyAtTarget', () => {
    const groups = groupPlannedChangesByCategoryId([
      {
        sku: 'A',
        productId: 1,
        fromCategoryId: 1,
        fromCategorySlug: 'x',
        toCategoryId: 10,
        toCategorySlug: 'leaf-a',
        alreadyAtTarget: true,
      },
      {
        sku: 'B',
        productId: 2,
        fromCategoryId: 1,
        fromCategorySlug: 'x',
        toCategoryId: 10,
        toCategorySlug: 'leaf-a',
        alreadyAtTarget: false,
      },
    ])
    assert.equal(groups.length, 1)
    assert.deepEqual(groups[0].skus, ['B'])
    assert.equal(groups[0].expectedCount, 1)
  })

  it('SKU duplicado en plan de apply → throw', () => {
    assert.throws(
      () =>
        groupPlannedChangesByCategoryId([
          {
            sku: 'DUP',
            productId: 1,
            fromCategoryId: 1,
            fromCategorySlug: 'x',
            toCategoryId: 10,
            toCategorySlug: 'leaf-a',
            alreadyAtTarget: false,
          },
          {
            sku: 'DUP',
            productId: 2,
            fromCategoryId: 1,
            fromCategorySlug: 'x',
            toCategoryId: 11,
            toCategorySlug: 'leaf-b',
            alreadyAtTarget: false,
          },
        ]),
      /duplicado/
    )
  })
})

describe('assertUpdateManyCount', () => {
  it('count distinto del esperado causa throw', () => {
    const group = {
      toCategoryId: 10,
      toCategorySlug: 'leaf-a',
      skus: ['A', 'B'],
      expectedCount: 2,
    }
    assert.throws(() => assertUpdateManyCount(group, 1), /mismatch/)
    assert.doesNotThrow(() => assertUpdateManyCount(group, 2))
  })
})

describe('assertLocalP1Database', () => {
  it('acepta localhost:5433/ifedel_p1', () => {
    const t = assertLocalP1Database(
      'postgresql://postgres:postgres@localhost:5433/ifedel_p1'
    )
    assert.equal(t.host, 'localhost')
    assert.equal(t.port, '5433')
    assert.equal(t.database, 'ifedel_p1')
  })

  it('aborta Supabase pooler', () => {
    assert.throws(() =>
      assertLocalP1Database(
        'postgresql://u:p@aws-1-sa-east-1.pooler.supabase.com:6543/postgres'
      )
    )
  })

  it('sanitize no expone password', () => {
    const t = sanitizeDatabaseUrl(
      'postgresql://user:secret@localhost:5433/ifedel_p1'
    )
    assert.equal(t.host, 'localhost')
    assert.ok(!JSON.stringify(t).includes('secret'))
  })
})
