/**
 * P2 — Migración de productos a taxonomía V1 (sku → new_category_slug).
 *
 * Local (default seguro, localhost:5433/ifedel_p1):
 *   npx tsx scripts/migrate-products-to-taxonomy-v1.ts --dry-run
 *   npx tsx scripts/migrate-products-to-taxonomy-v1.ts --apply
 *
 * Producción Supabase (explícito):
 *   npx tsx scripts/migrate-products-to-taxonomy-v1.ts --dry-run --production
 *   npx tsx scripts/migrate-products-to-taxonomy-v1.ts --apply --production --confirm-production
 *
 * Apply producción usa DIRECT_URL (session/direct :5432), NUNCA el transaction
 * pooler :6543. Dry-run/validación leen vía DATABASE_URL (pooler OK).
 *
 * Apply escribe solo Product.categoryId vía updateMany agrupados por destino.
 * Prisma también actualiza Product.updatedAt (@updatedAt) en cada fila tocada.
 *
 * Opciones:
 *   --csv <path>     Mapping CSV (default: tmp/ifedel_p2_mapping_475_minimo.csv)
 *   --verbose        Muestra más filas de ejemplo
 *   --production     Autoriza target production-supabase (read-only o write con confirm)
 *   --confirm-production  Obligatorio junto a --apply --production
 *
 * Sin --dry-run ni --apply → aborta (no aplica automáticamente).
 */

import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { prisma } from '../lib/prisma'
import {
  assertScriptDatabaseAccess,
  formatDbTargetLog,
  parseProductionFlags,
  resolveApplyWriteDatasourceUrl,
} from '../lib/db-local-safety'
import { resolveTaxonomyV1EffectiveNodes } from '../lib/category-taxonomy-v1'
import {
  P2_APPLY_TRANSACTION_TIMEOUT_MS,
  assertUpdateManyCount,
  countPlannedByParent,
  groupPlannedChangesByCategoryId,
  parseProductTaxonomyMappingCsv,
  validateProductTaxonomyMigration,
  type CategoryLeafCandidate,
  type PlannedChange,
} from '../lib/product-taxonomy-v1-migration'

const DEFAULT_CSV = path.join('tmp', 'ifedel_p2_mapping_475_minimo.csv')
const EXPECTED_V1_PRODUCTS = 475
/** Si producción supera este umbral, no adaptar mapping: abortar. */
const MAX_PROD_PRODUCTS_EXCLUSIVE = 476

const EXPECTED_BY_ROOT_SLUG: Record<string, number> = {
  'electrificacion-y-alambrados': 266,
  'identificacion-y-pesaje-animal': 104,
  'esquila-y-peladoras': 65,
  'manejo-ganadero': 28,
  'agua-y-manejo-hidrico': 11,
  pasturas: 1,
}

type Mode = 'dry-run' | 'apply'

function parseArgs(argv: string[]): {
  mode: Mode | null
  csvPath: string
  verbose: boolean
  production: boolean
  confirmProduction: boolean
} {
  let mode: Mode | null = null
  let csvPath = DEFAULT_CSV
  let verbose = false
  const { production, confirmProduction } = parseProductionFlags(argv)

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') mode = 'dry-run'
    else if (a === '--apply') mode = 'apply'
    else if (a === '--verbose') verbose = true
    else if (a === '--production' || a === '--confirm-production') {
      // parseados arriba
    } else if (a === '--csv') {
      csvPath = argv[++i] ?? csvPath
    } else if (a.startsWith('--csv=')) {
      csvPath = a.slice('--csv='.length)
    }
  }

  return { mode, csvPath, verbose, production, confirmProduction }
}

function writeCsv(filePath: string, header: string[], rows: string[][]) {
  const lines = [
    header.join(','),
    ...rows.map((r) =>
      r
        .map((c) => {
          const s = c ?? ''
          if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
          return s
        })
        .join(',')
    ),
  ]
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
}

function isPrismaP2028(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code?: string }).code === 'P2028'
  )
}

async function loadDbContext() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      categoryId: true,
      category: {
        select: { id: true, slug: true, name: true, parentId: true },
      },
    },
    orderBy: { sku: 'asc' },
  })

  const categories = await prisma.category.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      parentId: true,
      isActive: true,
      children: { select: { id: true }, take: 1 },
    },
  })

  const { nodes, effectiveSlugs } = resolveTaxonomyV1EffectiveNodes(categories)
  const v1Ids = new Set(
    categories.filter((c) => effectiveSlugs.has(c.slug)).map((c) => c.id)
  )
  const childCountByParent = new Map<number, number>()
  for (const c of categories) {
    if (c.parentId != null) {
      childCountByParent.set(
        c.parentId,
        (childCountByParent.get(c.parentId) ?? 0) + 1
      )
    }
  }

  const categoriesBySlug = new Map<string, CategoryLeafCandidate>()
  for (const c of categories) {
    categoriesBySlug.set(c.slug, {
      id: c.id,
      slug: c.slug,
      name: c.name,
      parentId: c.parentId,
      isActive: c.isActive,
      isTaxonomyV1: effectiveSlugs.has(c.slug),
      isLeaf: (childCountByParent.get(c.id) ?? 0) === 0,
    })
  }

  const leafSlugToParentSlug = new Map<string, string>()
  const idToSlug = new Map(categories.map((c) => [c.id, c.slug]))
  for (const n of nodes) {
    if (n.kind !== 'child') continue
    const row = categoriesBySlug.get(n.effectiveSlug)
    if (!row?.parentId) continue
    const parentSlug = idToSlug.get(row.parentId)
    if (parentSlug) leafSlugToParentSlug.set(n.effectiveSlug, parentSlug)
  }

  const productRows = products.map((p) => ({
    id: p.id,
    sku: p.sku,
    categoryId: p.categoryId,
    categorySlug: p.category.slug,
    categoryName: p.category.name,
    categoryParentId: p.category.parentId,
  }))

  return {
    productRows,
    categoriesBySlug,
    v1Ids,
    leafSlugToParentSlug,
    categories,
    effectiveSlugs,
    nodes,
  }
}

function printSample(planned: PlannedChange[], verbose: boolean) {
  const sampleSize = verbose ? Math.min(50, planned.length) : 12
  const changes = planned.filter((p) => !p.alreadyAtTarget).slice(0, sampleSize)
  const already = planned.filter((p) => p.alreadyAtTarget).slice(0, 3)

  console.log('\n--- Muestra de cambios ---')
  if (changes.length === 0) {
    console.log('(ningún cambio pendiente)')
  } else {
    for (const p of changes) {
      console.log(
        `${p.sku} | ${p.fromCategorySlug} → ${p.toCategorySlug}`
      )
    }
    if (!verbose && planned.filter((x) => !x.alreadyAtTarget).length > sampleSize) {
      console.log(
        `… (+${planned.filter((x) => !x.alreadyAtTarget).length - sampleSize} más; usá --verbose)`
      )
    }
  }
  if (already.length) {
    console.log('\n--- Ya en destino (muestra) ---')
    for (const p of already) {
      console.log(`${p.sku} | ${p.toCategorySlug}`)
    }
  }
}

function printDistribution(
  planned: PlannedChange[],
  leafSlugToParentSlug: Map<string, string>,
  byDestinationSlug: Map<string, number>
) {
  const byParent = countPlannedByParent(planned, leafSlugToParentSlug)
  console.log('\n--- Distribución esperada por principal ---')
  let parentTotal = 0
  for (const [slug, expected] of Object.entries(EXPECTED_BY_ROOT_SLUG)) {
    const actual = byParent.get(slug) ?? 0
    parentTotal += actual
    const mark = actual === expected ? '✓' : '✗'
    console.log(`${mark} ${slug}: ${actual} (esperado ${expected})`)
  }
  console.log(`Total por principales resueltos: ${parentTotal}`)

  console.log('\n--- Distribución esperada por subcategoría (destino) ---')
  const sorted = [...byDestinationSlug.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )
  for (const [slug, n] of sorted) {
    console.log(`  ${n}\t${slug}`)
  }
  console.log(`Destinos hoja únicos: ${sorted.length}`)
}

async function main() {
  const { mode, csvPath, verbose, production, confirmProduction } = parseArgs(
    process.argv.slice(2)
  )

  let writeClient: PrismaClient | null = null

  console.log('=== P2 migrate products → taxonomy V1 ===')

  try {
    if (!mode) {
      console.error(
        '\nDebés indicar --dry-run o --apply. Por seguridad no se aplica nada por defecto.\n' +
          'Local: npx tsx scripts/migrate-products-to-taxonomy-v1.ts --dry-run\n' +
          'Prod dry-run: … --dry-run --production\n' +
          'Prod apply: … --apply --production --confirm-production'
      )
      process.exitCode = 1
      return
    }

    const accessMode =
      mode === 'apply'
        ? production
          ? 'production-write'
          : 'local-only'
        : production
          ? 'production-readonly'
          : 'local-only'

    const target = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
      mode: accessMode,
      allowProduction: production,
      confirmProduction,
    })
    console.log(`DB target (read/validate): ${formatDbTargetLog(target)}`)

    if (!fs.existsSync(csvPath)) {
      console.error(`ABORT: no existe el CSV de mapping: ${csvPath}`)
      process.exitCode = 1
      return
    }

    const raw = fs.readFileSync(csvPath, 'utf8')
    const parsed = parseProductTaxonomyMappingCsv(raw)
    if (parsed.errors.length) {
      console.error('ABORT: errores de parseo CSV:')
      for (const e of parsed.errors) console.error(`- ${e}`)
      process.exitCode = 1
      return
    }

    const ctx = await loadDbContext()

    if (
      target.kind === 'production-supabase' &&
      ctx.productRows.length >= MAX_PROD_PRODUCTS_EXCLUSIVE
    ) {
      console.error(
        `ABORT: producción tiene ${ctx.productRows.length} productos (≥ ${MAX_PROD_PRODUCTS_EXCLUSIVE}). ` +
          'No se adapta el mapping automáticamente.'
      )
      process.exitCode = 1
      return
    }

    const validation = validateProductTaxonomyMigration({
      mappingRows: parsed.rows,
      products: ctx.productRows,
      categoriesBySlug: ctx.categoriesBySlug,
      v1CategoryIds: ctx.v1Ids,
      expectedProductCount: EXPECTED_V1_PRODUCTS,
    })

    const extraIssues: { code: string; message: string }[] = []

    const dirtyV1 = validation.planned.filter(
      (p) => ctx.v1Ids.has(p.fromCategoryId) && !p.alreadyAtTarget
    )
    if (dirtyV1.length > 0) {
      extraIssues.push({
        code: 'DIRTY_V1_STATE',
        message: `${dirtyV1.length} producto(s) ya están en V1 pero no en el destino del mapping`,
      })
    }

    const byParent = countPlannedByParent(
      validation.planned,
      ctx.leafSlugToParentSlug
    )
    for (const [slug, expected] of Object.entries(EXPECTED_BY_ROOT_SLUG)) {
      const actual = byParent.get(slug) ?? 0
      if (actual !== expected) {
        extraIssues.push({
          code: 'ROOT_DISTRIBUTION',
          message: `Principal ${slug}: mapping implica ${actual}, esperado ${expected}`,
        })
      }
    }

    const allIssues = [...validation.issues, ...extraIssues]
    const ready = validation.ok && extraIssues.length === 0

    console.log('\n--- Resumen ---')
    console.log(`Modo: ${mode}`)
    console.log(
      `Flags: production=${production} confirmProduction=${confirmProduction}`
    )
    console.log(`CSV: ${csvPath}`)
    console.log(`Productos DB: ${validation.dbProductCount}`)
    console.log(`Filas mapping: ${validation.mappingRowCount}`)
    console.log(`SKUs únicos mapping: ${validation.uniqueSkus}`)
    console.log(`Destinos únicos: ${validation.uniqueDestinations}`)
    console.log(`SKUs encontrados (planned): ${validation.planned.length}`)
    console.log(`Cambios necesarios: ${validation.changesNeeded}`)
    console.log(`Ya en destino: ${validation.alreadyAtTarget}`)
    console.log(`Productos ya en V1 (antes): ${validation.productsOnV1Before}`)

    const missingInDb = allIssues.filter((i) => i.code === 'SKU_MISSING_IN_DB')
    const extraInDb = allIssues.filter((i) => i.code === 'SKU_EXTRA_IN_DB')
    const destInvalid = allIssues.filter((i) =>
      [
        'DEST_NOT_FOUND',
        'DEST_INACTIVE',
        'DEST_NOT_V1',
        'DEST_IS_ROOT',
        'DEST_NOT_LEAF',
      ].includes(i.code)
    )
    console.log(`SKUs faltantes en DB: ${missingInDb.length}`)
    console.log(`SKUs extra en DB: ${extraInDb.length}`)
    console.log(`Destinos inválidos (issues): ${destInvalid.length}`)

    printDistribution(
      validation.planned,
      ctx.leafSlugToParentSlug,
      validation.byDestinationSlug
    )
    printSample(validation.planned, verbose)

    if (allIssues.length) {
      console.log('\n--- Issues ---')
      for (const i of allIssues.slice(0, 40)) {
        console.log(`[${i.code}] ${i.message}`)
      }
      if (allIssues.length > 40) {
        console.log(`… (+${allIssues.length - 40} más)`)
      }
    }

    console.log(`\nREADY TO APPLY: ${ready ? 'YES' : 'NO'}`)

    if (!ready) {
      process.exitCode = 1
      return
    }

    if (mode === 'dry-run') {
      console.log('\nDry-run OK: no se modificó la DB.')
      return
    }

    // --- APPLY ---
    if (target.kind === 'production-supabase') {
      if (!production || !confirmProduction) {
        console.error(
          'ABORT: apply en producción requiere --production --confirm-production'
        )
        process.exitCode = 1
        return
      }
    } else if (target.kind !== 'local') {
      console.error(
        `ABORT: target no autorizado para apply (${formatDbTargetLog(target)})`
      )
      process.exitCode = 1
      return
    }

    const stamp = new Date().toISOString().replace(/[:.]/g, '-')
    const prePath = path.join('tmp', `p2-pre-snapshot-${stamp}.csv`)
    const postPath = path.join('tmp', `p2-post-snapshot-${stamp}.csv`)
    const reportPath = path.join('tmp', `p2-migration-report-${stamp}.csv`)

    try {
      writeCsv(
        prePath,
        ['sku', 'currentCategoryId'],
        validation.planned.map((p) => [p.sku, String(p.fromCategoryId)])
      )
      if (!fs.existsSync(prePath)) {
        throw new Error('archivo PRE no existe tras escritura')
      }
      const preBody = fs.readFileSync(prePath, 'utf8').trimEnd()
      const preLines = preBody.split('\n')
      const expectedLines = validation.planned.length + 1
      if (preLines.length !== expectedLines) {
        throw new Error(
          `PRE tiene ${preLines.length} líneas, esperadas ${expectedLines}`
        )
      }
      if (!preLines[0].startsWith('sku,')) {
        throw new Error('PRE header inválido')
      }
    } catch (err) {
      console.error(
        `ABORT: no se pudo generar snapshot PRE antes del UPDATE: ${
          err instanceof Error ? err.message : String(err)
        }`
      )
      process.exitCode = 1
      return
    }
    console.log(`Snapshot PRE: ${prePath}`)

    const writeDs = resolveApplyWriteDatasourceUrl({
      isProduction: production && target.kind === 'production-supabase',
      databaseUrl: process.env.DATABASE_URL,
      directUrl: process.env.DIRECT_URL,
    })
    console.log(
      `Write client (${writeDs.envKey}): ${formatDbTargetLog(writeDs.target)}`
    )
    console.log(
      `Nota: solo se escribe Product.categoryId; Prisma también toca updatedAt (@updatedAt).`
    )

    writeClient = new PrismaClient({
      datasources: { db: { url: writeDs.url } },
      log: ['error'],
    })

    const groups = groupPlannedChangesByCategoryId(validation.planned)
    const totalSkus = groups.reduce((n, g) => n + g.expectedCount, 0)
    console.log(
      `Aplicando ${totalSkus} SKUs en ${groups.length} updateMany ` +
        `(timeout ${P2_APPLY_TRANSACTION_TIMEOUT_MS}ms)…`
    )

    try {
      await writeClient.$transaction(
        async (tx) => {
          for (const group of groups) {
            const result = await tx.product.updateMany({
              where: { sku: { in: group.skus } },
              data: { categoryId: group.toCategoryId },
            })
            assertUpdateManyCount(group, result.count)
          }
        },
        {
          maxWait: 10_000,
          timeout: P2_APPLY_TRANSACTION_TIMEOUT_MS,
        }
      )
    } catch (err) {
      console.error('\nAPPLY FAILED / ROLLED BACK')
      if (isPrismaP2028(err)) {
        console.error(
          'P2028 Transaction not found. No se reintenta automáticamente. ' +
            'Verificá que el write client use DIRECT_URL (:5432), no transaction pooler (:6543).'
        )
      }
      console.error(err)
      process.exitCode = 1
      return
    }

    writeCsv(
      postPath,
      ['sku', 'newCategoryId'],
      validation.planned.map((p) => [
        p.sku,
        String(p.alreadyAtTarget ? p.fromCategoryId : p.toCategoryId),
      ])
    )
    writeCsv(
      reportPath,
      [
        'sku',
        'categoryIdAnterior',
        'categoryIdNuevo',
        'slugAnterior',
        'slugNuevo',
      ],
      validation.planned.map((p) => [
        p.sku,
        String(p.fromCategoryId),
        String(p.toCategoryId),
        p.fromCategorySlug,
        p.toCategorySlug,
      ])
    )

    console.log(`Snapshot POST: ${postPath}`)
    console.log(`Reporte: ${reportPath}`)
    console.log('APPLY OK: migración transaccional completada.')
  } finally {
    if (writeClient) {
      await writeClient.$disconnect()
    }
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
