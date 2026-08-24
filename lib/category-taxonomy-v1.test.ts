import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  TAXONOMY_V1_ROOTS,
  countTaxonomyV1Expected,
  getTaxonomyV1ManagedSlugs,
  resolveTaxonomyV1EffectiveNodes,
  resolveTaxonomyV1EffectiveSlug,
} from './category-taxonomy-v1'

describe('category-taxonomy-v1', () => {
  it('define exactamente 6 principales', () => {
    assert.equal(TAXONOMY_V1_ROOTS.length, 6)
    assert.equal(countTaxonomyV1Expected().roots, 6)
  })

  it('define 39 subcategorías (14+9+4+5+6+1)', () => {
    assert.equal(countTaxonomyV1Expected().children, 39)
    assert.equal(countTaxonomyV1Expected().total, 45)
  })

  it('asigna sortOrder 1..6 a principales sin duplicar', () => {
    const orders = TAXONOMY_V1_ROOTS.map((r) => r.sortOrder)
    assert.deepEqual(orders, [1, 2, 3, 4, 5, 6])
  })

  it('Pasturas es la única principal fuera de Home', () => {
    const home = TAXONOMY_V1_ROOTS.filter((r) => r.showInHome).map((r) => r.slug)
    const notHome = TAXONOMY_V1_ROOTS.filter((r) => !r.showInHome).map(
      (r) => r.slug
    )
    assert.deepEqual(notHome, ['pasturas'])
    assert.equal(home.length, 5)
  })

  it('permite name Agua en la principal nueva (slug distinto al legacy)', () => {
    const agua = TAXONOMY_V1_ROOTS.find((r) => r.slug === 'agua-y-manejo-hidrico')
    assert.ok(agua)
    assert.equal(agua.name, 'Agua')
  })

  it('usa slugs canónicos explícitos (sin depender de slugify global)', () => {
    assert.ok(
      getTaxonomyV1ManagedSlugs().has('electrificacion-y-alambrados'),
      'slug con acento normalizado explícito'
    )
    assert.ok(getTaxonomyV1ManagedSlugs().has('agua-y-manejo-hidrico'))
    assert.ok(
      getTaxonomyV1ManagedSlugs().has('lectores-identificacion-y-pesaje'),
      'fallback por conflicto con legacy lectores'
    )
    assert.ok(
      getTaxonomyV1ManagedSlugs().has('postes-y-varillas-electrificacion'),
      'fallback por conflicto con legacy postes-y-varillas'
    )
  })

  it('no duplica slugs canónicos dentro de la definición', () => {
    const slugs: string[] = []
    for (const root of TAXONOMY_V1_ROOTS) {
      slugs.push(root.slug)
      for (const child of root.children) {
        slugs.push(child.slug)
      }
    }
    assert.equal(new Set(slugs).size, slugs.length)
  })

  it('resuelve fallbacks cuando el canónico lo ocupa legacy', () => {
    const bySlug = new Map([
      ['lectores', { slug: 'lectores', name: 'LECTORES' }],
      [
        'lectores-identificacion-y-pesaje',
        { slug: 'lectores-identificacion-y-pesaje', name: 'Lectores' },
      ],
      [
        'postes-y-varillas',
        { slug: 'postes-y-varillas', name: 'Postes y Varillas' },
      ],
      [
        'postes-y-varillas-electrificacion',
        {
          slug: 'postes-y-varillas-electrificacion',
          name: 'Postes y varillas',
        },
      ],
    ])

    assert.equal(
      resolveTaxonomyV1EffectiveSlug(
        'lectores',
        'Lectores',
        'lectores-identificacion-y-pesaje',
        bySlug
      ),
      'lectores-identificacion-y-pesaje'
    )
    assert.equal(
      resolveTaxonomyV1EffectiveSlug(
        'postes-y-varillas',
        'Postes y varillas',
        'postes-y-varillas-electrificacion',
        bySlug
      ),
      'postes-y-varillas-electrificacion'
    )
  })

  it('no cuenta slugs legacy conflictivos como nodos V1 efectivos', () => {
    const rows = [
      { slug: 'lectores', name: 'LECTORES' },
      { slug: 'lectores-identificacion-y-pesaje', name: 'Lectores' },
      { slug: 'postes-y-varillas', name: 'Postes y Varillas' },
      {
        slug: 'postes-y-varillas-electrificacion',
        name: 'Postes y varillas',
      },
      { slug: 'agua', name: 'Agua' },
      { slug: 'agua-y-manejo-hidrico', name: 'Agua' },
      {
        slug: 'electrificacion-y-alambrados',
        name: 'Electrificación y Alambrados',
      },
      {
        slug: 'identificacion-y-pesaje-animal',
        name: 'Identificación y Pesaje Animal',
      },
    ]
    const { effectiveSlugs, nodes } = resolveTaxonomyV1EffectiveNodes(rows)
    assert.equal(effectiveSlugs.has('lectores'), false)
    assert.equal(effectiveSlugs.has('postes-y-varillas'), false)
    assert.equal(effectiveSlugs.has('agua'), false)
    assert.ok(effectiveSlugs.has('lectores-identificacion-y-pesaje'))
    assert.ok(effectiveSlugs.has('postes-y-varillas-electrificacion'))
    assert.ok(effectiveSlugs.has('agua-y-manejo-hidrico'))
    assert.ok(
      nodes.every((n) => n.effectiveSlug !== 'lectores'),
      'ningún nodo V1 usa slug legacy lectores'
    )
  })
})
