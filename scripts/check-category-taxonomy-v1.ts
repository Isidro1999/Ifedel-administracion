/**
 * Check de integridad P1: taxonomía V1 + productos no reasignados (read-only).
 *
 * Local:
 *   npx tsx scripts/check-category-taxonomy-v1.ts
 *
 * Producción Supabase:
 *   npx tsx scripts/check-category-taxonomy-v1.ts --production
 *
 * No asume un conteo histórico fijo de productos (p. ej. 462).
 * Valida que ningún producto apunte a los nodos V1 efectivos.
 */

import { prisma } from '../lib/prisma'
import {
  assertScriptDatabaseAccess,
  formatDbTargetLog,
  parseProductionFlags,
} from '../lib/db-local-safety'
import {
  TAXONOMY_V1_ROOTS,
  countTaxonomyV1Expected,
  resolveTaxonomyV1EffectiveNodes,
} from '../lib/category-taxonomy-v1'

type Issue = { level: 'error' | 'warn'; message: string }

async function main() {
  const { production } = parseProductionFlags(process.argv.slice(2))
  const issues: Issue[] = []
  const expected = countTaxonomyV1Expected()

  console.log('=== Check integridad taxonomía V1 ===')
  const target = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
    mode: production ? 'production-readonly' : 'local-only',
    allowProduction: production,
  })
  console.log(`DB target: ${formatDbTargetLog(target)}`)

  const productCount = await prisma.product.count()
  console.log(`✓ Productos existentes: ${productCount} (baseline actual; P1 no exige un total histórico fijo)`)

  const products = await prisma.product.findMany({
    select: {
      id: true,
      categoryId: true,
    },
  })

  const allCategories = await prisma.category.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      parentId: true,
      sortOrder: true,
      showInHome: true,
      isActive: true,
      shortDescription: true,
    },
  })

  const bySlug = new Map(allCategories.map((c) => [c.slug, c]))
  const { nodes, effectiveSlugs, missing } = resolveTaxonomyV1EffectiveNodes(
    allCategories.map((c) => ({ slug: c.slug, name: c.name }))
  )

  const v1Categories = nodes
    .map((n) => bySlug.get(n.effectiveSlug))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))

  const v1Ids = new Set(v1Categories.map((c) => c.id))
  const v1Roots = nodes.filter((n) => n.kind === 'root')
  const v1Children = nodes.filter((n) => n.kind === 'child')

  for (const m of missing) {
    issues.push({
      level: 'error',
      message: `Falta nodo V1 "${m.name}" (slug=${m.intendedSlug}${
        m.fallback ? ` o ${m.fallback}` : ''
      })`,
    })
  }

  // --- Productos: ninguno debe apuntar a nodos V1 efectivos ---
  let productsOnV1 = 0
  for (const p of products) {
    if (v1Ids.has(p.categoryId)) productsOnV1 += 1
  }

  if (productsOnV1 > 0) {
    issues.push({
      level: 'error',
      message: `${productsOnV1} producto(s) apuntan a categorías de la taxonomía V1 (aún no debería haber reasignación)`,
    })
  } else {
    console.log('✓ Ningún producto apunta a la taxonomía V1 nueva')
  }

  const productsOnLegacy = products.filter((p) => !v1Ids.has(p.categoryId)).length
  console.log(
    `✓ Productos fuera de V1 (legacy u otras): ${productsOnLegacy}/${productCount}`
  )

  // --- Principales ---
  for (const rootDef of TAXONOMY_V1_ROOTS) {
    const resolved = v1Roots.find((n) => n.intendedSlug === rootDef.slug)
    if (!resolved) continue

    const root = bySlug.get(resolved.effectiveSlug)
    if (!root) continue

    if (root.parentId !== null) {
      issues.push({
        level: 'error',
        message: `Principal ${root.slug} tiene parentId=${root.parentId} (debe ser null)`,
      })
    }
    if (root.sortOrder !== rootDef.sortOrder) {
      issues.push({
        level: 'warn',
        message: `Principal ${root.slug}: sortOrder=${root.sortOrder}, esperado ${rootDef.sortOrder}`,
      })
    }
    if (root.showInHome !== rootDef.showInHome) {
      issues.push({
        level: 'warn',
        message: `Principal ${root.slug}: showInHome=${root.showInHome}, esperado ${rootDef.showInHome}`,
      })
    }
    if (!root.isActive) {
      issues.push({
        level: 'error',
        message: `Principal ${root.slug} está inactiva`,
      })
    }
    if (!root.shortDescription) {
      issues.push({
        level: 'warn',
        message: `Principal ${root.slug} sin shortDescription`,
      })
    }

    let childSort = 1
    for (const childDef of rootDef.children) {
      const childResolved = v1Children.find(
        (n) =>
          n.intendedSlug === childDef.slug &&
          n.parentIntendedSlug === rootDef.slug
      )
      if (!childResolved) {
        childSort += 1
        continue
      }
      const child = bySlug.get(childResolved.effectiveSlug)
      if (!child) {
        childSort += 1
        continue
      }

      if (child.parentId !== root.id) {
        issues.push({
          level: 'error',
          message: `Subcategoría ${child.slug}: parentId=${child.parentId}, esperado ${root.id} (${root.slug})`,
        })
      }
      if (child.sortOrder !== childSort) {
        issues.push({
          level: 'warn',
          message: `Subcategoría ${child.slug}: sortOrder=${child.sortOrder}, esperado ${childSort}`,
        })
      }
      if (child.showInHome) {
        issues.push({
          level: 'warn',
          message: `Subcategoría ${child.slug} tiene showInHome=true (esperado false)`,
        })
      }
      if (!child.isActive) {
        issues.push({
          level: 'error',
          message: `Subcategoría ${child.slug} está inactiva`,
        })
      }
      childSort += 1
    }
  }

  if (v1Roots.length !== expected.roots) {
    issues.push({
      level: 'error',
      message: `Principales V1: encontradas ${v1Roots.length}, esperadas ${expected.roots}`,
    })
  } else {
    console.log(`✓ Principales V1: ${v1Roots.length}`)
  }

  // Huérfanos: hijos V1 cuyo parent no es la principal V1 esperada
  const rootIdByIntended = new Map<string, number>()
  for (const n of v1Roots) {
    const row = bySlug.get(n.effectiveSlug)
    if (row) rootIdByIntended.set(n.intendedSlug, row.id)
  }

  for (const n of v1Children) {
    const child = bySlug.get(n.effectiveSlug)
    if (!child || !n.parentIntendedSlug) continue
    const expectedParentId = rootIdByIntended.get(n.parentIntendedSlug)
    if (expectedParentId === undefined || child.parentId !== expectedParentId) {
      issues.push({
        level: 'error',
        message: `Subcategoría huérfana o con padre incorrecto: ${child.slug} parentId=${child.parentId}`,
      })
    }
  }

  console.log(
    `✓ Subcategorías V1: ${v1Children.length} (esperadas ${expected.children})`
  )
  if (v1Children.length !== expected.children) {
    issues.push({
      level: 'error',
      message: `Subcategorías V1: ${v1Children.length}, esperadas ${expected.children}`,
    })
  }

  console.log(
    `✓ Nodos V1 efectivos: ${nodes.length} (esperados ${expected.total}); slugs: ${[...effectiveSlugs].sort().length} únicos en resolución`
  )
  if (nodes.length !== expected.total) {
    issues.push({
      level: 'error',
      message: `Nodos V1: ${nodes.length}, esperados ${expected.total}`,
    })
  }

  // Confirmar que legacy conflictivos NO están en el set V1 efectivo
  for (const legacySlug of ['lectores', 'postes-y-varillas', 'agua']) {
    if (effectiveSlugs.has(legacySlug)) {
      issues.push({
        level: 'error',
        message: `Slug legacy "${legacySlug}" fue contado erróneamente como nodo V1`,
      })
    }
  }

  // Confirmar fallbacks efectivos cuando existen
  for (const [intended, fallback] of [
    ['lectores', 'lectores-identificacion-y-pesaje'],
    ['postes-y-varillas', 'postes-y-varillas-electrificacion'],
  ] as const) {
    const node = nodes.find((n) => n.intendedSlug === intended)
    if (node && bySlug.has(intended) && bySlug.get(intended)!.name !== node.name) {
      if (node.effectiveSlug !== fallback) {
        issues.push({
          level: 'error',
          message: `Conflicto slug "${intended}": efectivo=${node.effectiveSlug}, esperado fallback ${fallback}`,
        })
      } else {
        console.log(
          `✓ Conflicto "${intended}" (legacy) → V1 usa "${node.effectiveSlug}"`
        )
      }
    }
  }

  const allSlugs = await prisma.category.groupBy({
    by: ['slug'],
    _count: { slug: true },
    having: { slug: { _count: { gt: 1 } } },
  })
  if (allSlugs.length > 0) {
    issues.push({
      level: 'error',
      message: `Slugs duplicados: ${allSlugs.map((s) => s.slug).join(', ')}`,
    })
  } else {
    console.log('✓ Slugs de categorías únicos')
  }

  const legacyAgua = await prisma.category.findUnique({
    where: { slug: 'agua' },
    select: { id: true, name: true, parentId: true },
  })
  const newAgua = bySlug.get('agua-y-manejo-hidrico')
  if (!legacyAgua) {
    issues.push({
      level: 'error',
      message: 'Categoría legacy slug=agua no encontrada (no debería haberse tocado)',
    })
  } else if (legacyAgua.parentId !== null) {
    issues.push({
      level: 'error',
      message: `Legacy agua fue modificada: parentId=${legacyAgua.parentId}`,
    })
  } else {
    console.log(`✓ Legacy agua intacta (id=${legacyAgua.id}, name=${legacyAgua.name})`)
  }

  if (!newAgua || newAgua.name !== 'Agua' || newAgua.parentId !== null) {
    issues.push({
      level: 'error',
      message:
        'Principal V1 Agua (slug=agua-y-manejo-hidrico, name=Agua, parentId=null) no encontrada o inválida',
    })
  } else {
    console.log(
      `✓ Principal V1 Agua OK (id=${newAgua.id}, slug=${newAgua.slug})`
    )
  }

  const totalCategories = allCategories.length
  const legacyCount = totalCategories - nodes.length
  console.log(
    `✓ Categorías totales: ${totalCategories} (V1=${nodes.length}, otras/legacy≈${legacyCount})`
  )

  console.log('\n--- Resumen ---')
  const errors = issues.filter((i) => i.level === 'error')
  const warns = issues.filter((i) => i.level === 'warn')
  console.log(`Errores: ${errors.length}`)
  console.log(`Warnings: ${warns.length}`)
  for (const i of issues) {
    console.log(`[${i.level}] ${i.message}`)
  }

  if (errors.length > 0) {
    process.exitCode = 1
  }
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
