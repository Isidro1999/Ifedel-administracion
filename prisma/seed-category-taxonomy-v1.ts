/**
 * Seed idempotente: taxonomía V1 (principales + subcategorías) en paralelo a legacy.
 *
 * - No modifica Product.categoryId
 * - No borra ni altera categorías legacy (fuera de los slugs gestionados)
 * - Upsert por slug (canónico o fallback por conflicto)
 *
 * Local (default seguro):
 *   npx tsx prisma/seed-category-taxonomy-v1.ts
 *
 * Producción Supabase (escritura explícita):
 *   npx tsx prisma/seed-category-taxonomy-v1.ts --production --confirm-production
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
  type TaxonomyRootDef,
  type TaxonomySubcategoryDef,
} from '../lib/category-taxonomy-v1'

type Conflict = {
  kind: 'slug'
  intended: string
  resolved?: string
  existingId?: number
  existingSlug?: string
  existingName?: string
  message: string
}

type UpsertResult = 'created' | 'updated' | 'skipped'

/** Una fila V1 se reconoce por slug (canónico/fallback) + name visible esperado. */
function isTaxonomyOwnedRow(existingName: string, intendedName: string): boolean {
  return existingName === intendedName
}

/**
 * Resuelve el slug a usar sin apropiarse de filas legacy.
 * Si ya existe el fallback (corrida previa), se reutiliza.
 * Los nombres visibles ya no son unique: pueden coincidir con legacy.
 */
async function resolveSlug(input: {
  intended: string
  fallback?: string
  intendedName: string
  conflicts: Conflict[]
}): Promise<string | null> {
  const { intended, fallback, intendedName, conflicts } = input

  if (fallback) {
    const byFallback = await prisma.category.findUnique({
      where: { slug: fallback },
      select: { id: true, slug: true, name: true },
    })
    if (byFallback && isTaxonomyOwnedRow(byFallback.name, intendedName)) {
      return byFallback.slug
    }
    if (byFallback && !isTaxonomyOwnedRow(byFallback.name, intendedName)) {
      conflicts.push({
        kind: 'slug',
        intended,
        existingId: byFallback.id,
        existingSlug: byFallback.slug,
        existingName: byFallback.name,
        message: `Fallback "${fallback}" existe pero no pertenece a la taxonomía V1 (name="${byFallback.name}").`,
      })
      return null
    }
  }

  const byIntended = await prisma.category.findUnique({
    where: { slug: intended },
    select: { id: true, slug: true, name: true },
  })

  if (!byIntended) {
    return intended
  }

  if (isTaxonomyOwnedRow(byIntended.name, intendedName)) {
    return byIntended.slug
  }

  // Slug canónico ocupado por legacy
  if (!fallback) {
    conflicts.push({
      kind: 'slug',
      intended,
      existingId: byIntended.id,
      existingSlug: byIntended.slug,
      existingName: byIntended.name,
      message: `Slug "${intended}" ocupado por legacy id=${byIntended.id} ("${byIntended.name}"). Sin fallback.`,
    })
    return null
  }

  conflicts.push({
    kind: 'slug',
    intended,
    resolved: fallback,
    existingId: byIntended.id,
    existingSlug: byIntended.slug,
    existingName: byIntended.name,
    message: `Slug "${intended}" ocupado por legacy id=${byIntended.id}; usando "${fallback}".`,
  })
  return fallback
}

async function upsertCategory(input: {
  slug: string
  name: string
  parentId: number | null
  sortOrder: number
  showInHome: boolean
  shortDescription: string | null
  isActive: boolean
}): Promise<UpsertResult> {
  const existing = await prisma.category.findUnique({
    where: { slug: input.slug },
    select: {
      id: true,
      name: true,
      parentId: true,
      sortOrder: true,
      showInHome: true,
      shortDescription: true,
      isActive: true,
      imageUrl: true,
    },
  })

  if (!existing) {
    await prisma.category.create({
      data: {
        slug: input.slug,
        name: input.name,
        parentId: input.parentId,
        sortOrder: input.sortOrder,
        showInHome: input.showInHome,
        shortDescription: input.shortDescription,
        isActive: input.isActive,
        imageUrl: null,
      },
    })
    return 'created'
  }

  const needsUpdate =
    existing.name !== input.name ||
    existing.parentId !== input.parentId ||
    existing.sortOrder !== input.sortOrder ||
    existing.showInHome !== input.showInHome ||
    existing.shortDescription !== input.shortDescription ||
    existing.isActive !== input.isActive

  if (!needsUpdate) {
    return 'skipped'
  }

  await prisma.category.update({
    where: { id: existing.id },
    data: {
      name: input.name,
      parentId: input.parentId,
      sortOrder: input.sortOrder,
      showInHome: input.showInHome,
      shortDescription: input.shortDescription,
      isActive: input.isActive,
      // imageUrl: no tocar (assets posteriores)
    },
  })
  return 'updated'
}

type SeedStats = {
  rootsCreated: number
  rootsUpdated: number
  childrenCreated: number
  childrenUpdated: number
  skipped: number
  failed: number
}

async function seedRoot(
  root: TaxonomyRootDef,
  conflicts: Conflict[],
  stats: SeedStats
) {
  const slug = await resolveSlug({
    intended: root.slug,
    intendedName: root.name,
    conflicts,
  })
  if (!slug) {
    stats.failed += 1
    return
  }

  const result = await upsertCategory({
    slug,
    name: root.name,
    parentId: null,
    sortOrder: root.sortOrder,
    showInHome: root.showInHome,
    shortDescription: root.shortDescription,
    isActive: true,
  })

  if (result === 'created') stats.rootsCreated += 1
  else if (result === 'updated') stats.rootsUpdated += 1
  else stats.skipped += 1

  const parent = await prisma.category.findUniqueOrThrow({
    where: { slug },
    select: { id: true },
  })

  let childSort = 1
  for (const child of root.children) {
    await seedChild(child, parent.id, childSort, conflicts, stats)
    childSort += 1
  }
}

async function seedChild(
  child: TaxonomySubcategoryDef,
  parentId: number,
  sortOrder: number,
  conflicts: Conflict[],
  stats: SeedStats
) {
  const slug = await resolveSlug({
    intended: child.slug,
    fallback: child.slugFallbackIfTaken,
    intendedName: child.name,
    conflicts,
  })
  if (!slug) {
    stats.failed += 1
    return
  }

  const result = await upsertCategory({
    slug,
    name: child.name,
    parentId,
    sortOrder,
    showInHome: false,
    shortDescription: null,
    isActive: true,
  })

  if (result === 'created') stats.childrenCreated += 1
  else if (result === 'updated') stats.childrenUpdated += 1
  else stats.skipped += 1
}

async function main() {
  const { production, confirmProduction } = parseProductionFlags(
    process.argv.slice(2)
  )
  const expected = countTaxonomyV1Expected()
  const conflicts: Conflict[] = []
  const stats: SeedStats = {
    rootsCreated: 0,
    rootsUpdated: 0,
    childrenCreated: 0,
    childrenUpdated: 0,
    skipped: 0,
    failed: 0,
  }

  console.log('=== Seed taxonomía V1 (idempotente) ===')
  const target = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
    mode: production ? 'production-write' : 'local-only',
    allowProduction: production,
    confirmProduction,
  })
  console.log(`DB target: ${formatDbTargetLog(target)}`)
  console.log(
    `Flags: production=${production} confirmProduction=${confirmProduction}`
  )

  const productCountBefore = await prisma.product.count()
  const categoryIdsBefore = await prisma.product.findMany({
    select: { id: true, categoryId: true },
    orderBy: { id: 'asc' },
  })

  console.log(
    `Esperado: ${expected.roots} principales + ${expected.children} subcategorías = ${expected.total}`
  )
  console.log(`Productos antes: ${productCountBefore}`)

  for (const root of TAXONOMY_V1_ROOTS) {
    await seedRoot(root, conflicts, stats)
  }

  const productCountAfter = await prisma.product.count()
  const categoryIdsAfter = await prisma.product.findMany({
    select: { id: true, categoryId: true },
    orderBy: { id: 'asc' },
  })

  let productCategoryDrift = 0
  if (categoryIdsBefore.length !== categoryIdsAfter.length) {
    productCategoryDrift = Math.abs(
      categoryIdsBefore.length - categoryIdsAfter.length
    )
  } else {
    for (let i = 0; i < categoryIdsBefore.length; i++) {
      if (
        categoryIdsBefore[i].id !== categoryIdsAfter[i].id ||
        categoryIdsBefore[i].categoryId !== categoryIdsAfter[i].categoryId
      ) {
        productCategoryDrift += 1
      }
    }
  }

  const allCategories = await prisma.category.findMany({
    select: { slug: true, name: true, parentId: true },
  })
  const { nodes } = resolveTaxonomyV1EffectiveNodes(allCategories)
  const v1Roots = nodes.filter((n) => n.kind === 'root')
  const v1Children = nodes.filter((n) => n.kind === 'child')
  const dbRootCount = allCategories.filter((c) => c.parentId === null).length

  console.log('\n--- Resultado ---')
  console.log(
    `Principales: creadas=${stats.rootsCreated} actualizadas=${stats.rootsUpdated}`
  )
  console.log(
    `Subcategorías: creadas=${stats.childrenCreated} actualizadas=${stats.childrenUpdated}`
  )
  console.log(`Sin cambios (skip): ${stats.skipped}`)
  console.log(`Fallidas: ${stats.failed}`)
  console.log(
    `Árbol V1 efectivo: ${v1Roots.length} principales + ${v1Children.length} subcategorías = ${nodes.length}`
  )
  console.log(
    `(Referencia) Raíces totales en DB (legacy + V1): ${dbRootCount}`
  )
  console.log(
    `Productos: antes=${productCountBefore} después=${productCountAfter} drifts categoryId=${productCategoryDrift}`
  )

  if (conflicts.length) {
    console.log(`\n--- Conflictos (${conflicts.length}) ---`)
    for (const c of conflicts) {
      console.log(`- [${c.kind}] ${c.message}`)
    }
  } else {
    console.log('\nConflictos: ninguno')
  }

  if (stats.failed > 0 || productCategoryDrift > 0) {
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
