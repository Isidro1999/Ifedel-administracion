/**
 * Check POST-P2: productos asignados exactamente según mapping V1 (read-only).
 *
 * Local:
 *   npx tsx scripts/check-product-taxonomy-v1.ts
 *   npx tsx scripts/check-product-taxonomy-v1.ts --csv tmp/ifedel_p2_mapping_475_minimo.csv
 *
 * Producción Supabase:
 *   npx tsx scripts/check-product-taxonomy-v1.ts --production
 */

import fs from 'node:fs'
import path from 'node:path'
import { prisma } from '../lib/prisma'
import {
  assertScriptDatabaseAccess,
  formatDbTargetLog,
  parseProductionFlags,
} from '../lib/db-local-safety'
import { resolveTaxonomyV1EffectiveNodes } from '../lib/category-taxonomy-v1'
import { parseProductTaxonomyMappingCsv } from '../lib/product-taxonomy-v1-migration'

const DEFAULT_CSV = path.join('tmp', 'ifedel_p2_mapping_475_minimo.csv')

const EXPECTED_BY_ROOT_SLUG: Record<string, number> = {
  'electrificacion-y-alambrados': 266,
  'identificacion-y-pesaje-animal': 104,
  'esquila-y-peladoras': 65,
  'manejo-ganadero': 28,
  'agua-y-manejo-hidrico': 11,
  pasturas: 1,
}

type Issue = { level: 'error' | 'warn'; message: string }

function parseArgs(argv: string[]) {
  let csvPath = DEFAULT_CSV
  const { production } = parseProductionFlags(argv)
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--csv') csvPath = argv[++i] ?? csvPath
    else if (argv[i]?.startsWith('--csv=')) csvPath = argv[i].slice(6)
  }
  return { csvPath, production }
}

async function main() {
  const { csvPath, production } = parseArgs(process.argv.slice(2))
  const issues: Issue[] = []

  console.log('=== Check POST-P2 product taxonomy V1 ===')
  const target = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
    mode: production ? 'production-readonly' : 'local-only',
    allowProduction: production,
  })
  console.log(`DB target: ${formatDbTargetLog(target)}`)

  const raw = fs.readFileSync(csvPath, 'utf8')
  const parsed = parseProductTaxonomyMappingCsv(raw)
  if (parsed.errors.length) {
    for (const e of parsed.errors) issues.push({ level: 'error', message: e })
  }

  const mappingBySku = new Map(
    parsed.rows.map((r) => [r.sku, r.newCategorySlug] as const)
  )

  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      categoryId: true,
      category: {
        select: {
          id: true,
          slug: true,
          name: true,
          parentId: true,
          isActive: true,
          parent: { select: { id: true, slug: true, name: true } },
        },
      },
    },
  })

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      _count: { select: { products: true, children: true } },
    },
  })

  const { effectiveSlugs, nodes } = resolveTaxonomyV1EffectiveNodes(categories)
  const v1Ids = new Set(
    categories.filter((c) => effectiveSlugs.has(c.slug)).map((c) => c.id)
  )
  const v1RootIds = new Set(
    nodes
      .filter((n) => n.kind === 'root')
      .map((n) => categories.find((c) => c.slug === n.effectiveSlug)?.id)
      .filter((id): id is number => id != null)
  )

  if (products.length !== mappingBySku.size) {
    issues.push({
      level: 'error',
      message: `Productos DB=${products.length}, mapping=${mappingBySku.size}`,
    })
  } else {
    console.log(`✓ Productos: ${products.length}`)
  }

  let mismatch = 0
  let onRoot = 0
  let inactive = 0
  let missingCat = 0
  const byRoot = new Map<string, number>()

  for (const p of products) {
    const expectedSlug = mappingBySku.get(p.sku)
    if (!expectedSlug) {
      issues.push({
        level: 'error',
        message: `SKU en DB sin mapping: ${p.sku}`,
      })
      continue
    }
    if (!p.category) {
      missingCat++
      continue
    }
    if (p.category.slug !== expectedSlug) {
      mismatch++
      if (mismatch <= 10) {
        issues.push({
          level: 'error',
          message: `SKU ${p.sku}: category=${p.category.slug}, esperado ${expectedSlug}`,
        })
      }
    }
    if (v1RootIds.has(p.categoryId) || p.category.parentId === null) {
      onRoot++
    }
    if (!p.category.isActive) inactive++

    const parentSlug = p.category.parent?.slug
    if (parentSlug) {
      byRoot.set(parentSlug, (byRoot.get(parentSlug) ?? 0) + 1)
    }
  }

  for (const sku of mappingBySku.keys()) {
    if (!products.some((p) => p.sku === sku)) {
      issues.push({
        level: 'error',
        message: `SKU del mapping ausente en DB: ${sku}`,
      })
    }
  }

  if (mismatch === 0) console.log('✓ 100% SKUs apuntan al slug destino del mapping')
  else {
    issues.push({
      level: 'error',
      message: `${mismatch} producto(s) con slug distinto al mapping`,
    })
  }

  if (onRoot === 0) console.log('✓ 0 productos en categorías principales')
  else issues.push({ level: 'error', message: `${onRoot} producto(s) en principal` })

  if (inactive === 0) console.log('✓ 0 productos en categorías inactivas')
  else
    issues.push({
      level: 'error',
      message: `${inactive} producto(s) en categoría inactiva`,
    })

  if (missingCat === 0) console.log('✓ 0 productos sin categoría')
  else
    issues.push({
      level: 'error',
      message: `${missingCat} producto(s) sin categoría`,
    })

  console.log('\n--- Distribución por principal ---')
  for (const [slug, expected] of Object.entries(EXPECTED_BY_ROOT_SLUG)) {
    const actual = byRoot.get(slug) ?? 0
    const mark = actual === expected ? '✓' : '✗'
    console.log(`${mark} ${slug}: ${actual} (esperado ${expected})`)
    if (actual !== expected) {
      issues.push({
        level: 'error',
        message: `Principal ${slug}: ${actual}, esperado ${expected}`,
      })
    }
  }

  const legacy = categories.filter((c) => !effectiveSlugs.has(c.slug))
  if (legacy.length !== 18) {
    issues.push({
      level: 'warn',
      message: `Legacy count=${legacy.length}, esperado 18`,
    })
  } else {
    console.log('✓ 18 categorías legacy siguen existiendo')
  }

  const legacyWithProducts = legacy.filter((c) => c._count.products > 0)
  if (legacyWithProducts.length === 0) {
    console.log('✓ 0 productos en categorías legacy')
  } else {
    issues.push({
      level: 'error',
      message: `${legacyWithProducts.length} categoría(s) legacy aún tienen productos: ${legacyWithProducts
        .map((c) => c.slug)
        .join(', ')}`,
    })
  }

  const productsOnV1 = products.filter((p) => v1Ids.has(p.categoryId)).length
  console.log(`Productos en nodos V1: ${productsOnV1}/${products.length}`)

  console.log('\n--- Resumen ---')
  const errors = issues.filter((i) => i.level === 'error')
  const warns = issues.filter((i) => i.level === 'warn')
  console.log(`Errores: ${errors.length}`)
  console.log(`Warnings: ${warns.length}`)
  for (const i of issues.slice(0, 30)) {
    console.log(`[${i.level}] ${i.message}`)
  }
  if (issues.length > 30) console.log(`… (+${issues.length - 30} más)`)

  if (errors.length) process.exitCode = 1
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
