/**
 * Migración controlada: SQLite (legacy dev.db) → PostgreSQL (Supabase / DATABASE_URL).
 *
 * Tablas: brands, categories, products, product_images, product_specs,
 *         product_prices, product_files, settings
 *
 * Por defecto solo muestra el PLAN (no escribe). Escritura explícita:
 *
 *   npm run db:migrate:sqlite-products -- --plan
 *   SQLITE_SOURCE_PATH=./prisma/dev.db npm run db:migrate:sqlite-products -- --execute --yes
 *
 * Opciones:
 *   --sqlite-path=ruta/al.db   (o env SQLITE_SOURCE_PATH)
 *   --upsert-existing-products  Actualiza fila de producto en Postgres si el SKU ya existe
 *   --overwrite-settings        Sobrescribe settings id=1 (usdArsRate) en Postgres
 *
 * Requiere en .env: DATABASE_URL (y DIRECT_URL si aplica). No usa db push ni migraciones.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import Database from 'better-sqlite3'
import { PrismaClient } from '@prisma/client'

const TABLES = [
  'brands',
  'categories',
  'products',
  'product_images',
  'product_specs',
  'product_prices',
  'product_files',
  'settings',
] as const

type Args = {
  execute: boolean
  yes: boolean
  overwriteSettings: boolean
  upsertExistingProducts: boolean
  sqlitePath: string
  help: boolean
}

function parseArgs(argv: string[]): Args {
  const out: Args = {
    execute: false,
    yes: false,
    overwriteSettings: false,
    upsertExistingProducts: false,
    sqlitePath: process.env.SQLITE_SOURCE_PATH || 'prisma/dev.db',
    help: false,
  }
  for (const a of argv) {
    if (a === '--execute') out.execute = true
    else if (a === '--yes') out.yes = true
    else if (a === '--overwrite-settings') out.overwriteSettings = true
    else if (a === '--upsert-existing-products') out.upsertExistingProducts = true
    else if (a === '--plan') out.execute = false
    else if (a === '-h' || a === '--help') out.help = true
    else if (a.startsWith('--sqlite-path='))
      out.sqlitePath = a.slice('--sqlite-path='.length)
  }
  return out
}

function printHelp() {
  console.log(`
Migración SQLite → Postgres (catálogo de productos + settings).

  npm run db:migrate:sqlite-products -- --plan
  npm run db:migrate:sqlite-products -- --execute --yes

Variables:
  SQLITE_SOURCE_PATH   Ruta al .db (default: prisma/dev.db)
  DATABASE_URL         Destino Postgres (obligatorio para --execute)
`)
}

function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v
  if (v === 1 || v === '1' || v === 'true') return true
  return false
}

function asDate(v: unknown): Date | null {
  if (v == null || v === '') return null
  const d = new Date(String(v))
  return Number.isNaN(d.getTime()) ? null : d
}

function assertDbUrl() {
  if (!process.env.DATABASE_URL) {
    console.error('Falta DATABASE_URL en el entorno (.env).')
    process.exit(1)
  }
}

function tableExists(db: Database.Database, name: string): boolean {
  const row = db
    .prepare(
      `SELECT 1 FROM sqlite_master WHERE type='table' AND name=? LIMIT 1`,
    )
    .get(name) as { 1?: number } | undefined
  return Boolean(row)
}

async function main() {
  const argv = process.argv.slice(2)
  const args = parseArgs(argv)

  if (args.help) {
    printHelp()
    process.exit(0)
  }

  const sqliteAbs = path.resolve(process.cwd(), args.sqlitePath)
  if (!fs.existsSync(sqliteAbs)) {
    console.error(`No existe el archivo SQLite: ${sqliteAbs}`)
    process.exit(1)
  }

  assertDbUrl()
  const prisma = new PrismaClient()
  const sqlite = new Database(sqliteAbs, { fileMustExist: true, readonly: true })

  try {
    for (const t of TABLES) {
      if (!tableExists(sqlite, t)) {
        console.error(`La tabla "${t}" no existe en SQLite. Abortando.`)
        process.exit(1)
      }
    }

    const sqliteBrands = sqlite
      .prepare(`SELECT id, name, slug, "createdAt", "updatedAt" FROM brands ORDER BY id`)
      .all() as {
      id: number
      name: string
      slug: string
      createdAt: string
      updatedAt: string
    }[]

    const sqliteCategories = sqlite
      .prepare(
        `SELECT id, name, slug, "createdAt", "updatedAt" FROM categories ORDER BY id`,
      )
      .all() as {
      id: number
      name: string
      slug: string
      createdAt: string
      updatedAt: string
    }[]

    const productRows = sqlite
      .prepare(
        `
      SELECT p.*, b.slug AS "brandSlug", c.slug AS "categorySlug"
      FROM products p
      INNER JOIN brands b ON b.id = p."brandId"
      INNER JOIN categories c ON c.id = p."categoryId"
      ORDER BY p.id
    `,
      )
      .all() as {
      id: number
      sku: string
      title: string
      short: string | null
      description: string | null
      isActive: number | boolean
      isFeatured: number | boolean
      createdAt: string
      updatedAt: string
      brandId: number
      categoryId: number
      cost: number | null
      costCurrency: string | null
      brandSlug: string
      categorySlug: string
    }[]

    const skuCounts = new Map<string, number>()
    for (const p of productRows) {
      skuCounts.set(p.sku, (skuCounts.get(p.sku) ?? 0) + 1)
    }
    const dupSkus = [...skuCounts.entries()].filter(([, n]) => n > 1).map(([s]) => s)
    if (dupSkus.length > 0) {
      console.warn(
        '\n⚠️  ADVERTENCIA: SKUs duplicados en SQLite (la importación fallará al segundo insert):',
        dupSkus.join(', '),
      )
    }

    const badBrandSlugs = sqliteBrands.filter(
      (b) => !b.slug?.trim() || b.slug === 'nan',
    )
    if (badBrandSlugs.length > 0) {
      console.warn(
        '\n⚠️  ADVERTENCIA: marcas con slug vacío o "nan" en SQLite (revisar datos):',
        badBrandSlugs.map((b) => `${b.name} → "${b.slug}"`).join('; '),
      )
    }

    const sqliteSettings = sqlite
      .prepare(`SELECT id, "usdArsRate", "updatedAt" FROM settings WHERE id = 1`)
      .get() as
      | { id: number; usdArsRate: number; updatedAt: string }
      | undefined

    const [pgBrandCount, pgCategoryCount, pgProductCount] = await Promise.all([
      prisma.brand.count(),
      prisma.category.count(),
      prisma.product.count(),
    ])

    const pgSettings = await prisma.settings.findUnique({ where: { id: 1 } })

    const existingSkus = new Set(
      (
        await prisma.product.findMany({
          select: { sku: true },
        })
      ).map((p) => p.sku),
    )

    type ProductPlan = {
      sku: string
      title: string
      brandSlug: string
      categorySlug: string
      action: 'insert' | 'skip' | 'update'
      sqliteProductId: number
    }

    const productPlans: ProductPlan[] = productRows.map((p) => {
      const exists = existingSkus.has(p.sku)
      let action: ProductPlan['action'] = 'insert'
      if (exists) {
        action = args.upsertExistingProducts ? 'update' : 'skip'
      }
      return {
        sku: p.sku,
        title: p.title,
        brandSlug: p.brandSlug,
        categorySlug: p.categorySlug,
        action,
        sqliteProductId: p.id,
      }
    })

    let settingsPlan: 'skip-no-sqlite' | 'insert' | 'skip-pg-exists' | 'overwrite' | 'skip-no-overwrite'
    if (!sqliteSettings) settingsPlan = 'skip-no-sqlite'
    else if (!pgSettings) settingsPlan = 'insert'
    else if (args.overwriteSettings) settingsPlan = 'overwrite'
    else settingsPlan = 'skip-no-overwrite'

    // --- Informe (siempre antes de cualquier escritura) ---
    console.log('\n========== PLAN DE MIGRACIÓN ==========')
    console.log(`SQLite: ${sqliteAbs}`)
    console.log(`Postgres: ${maskUrl(process.env.DATABASE_URL!)}`)
    console.log('\n--- Conteos SQLite ---')
    console.log(`  brands:           ${sqliteBrands.length}`)
    console.log(`  categories:       ${sqliteCategories.length}`)
    console.log(`  products:         ${productRows.length}`)
    console.log(
      `  product_images:   ${(sqlite.prepare(`SELECT COUNT(*) as c FROM product_images`).get() as { c: number }).c}`,
    )
    console.log(
      `  product_specs:    ${(sqlite.prepare(`SELECT COUNT(*) as c FROM product_specs`).get() as { c: number }).c}`,
    )
    console.log(
      `  product_prices:   ${(sqlite.prepare(`SELECT COUNT(*) as c FROM product_prices`).get() as { c: number }).c}`,
    )
    console.log(
      `  product_files:    ${(sqlite.prepare(`SELECT COUNT(*) as c FROM product_files`).get() as { c: number }).c}`,
    )
    console.log(`  settings (id=1):  ${sqliteSettings ? 'sí' : 'no'}`)

    console.log('\n--- Conteos actuales Postgres ---')
    console.log(`  brands:     ${pgBrandCount}`)
    console.log(`  categories: ${pgCategoryCount}`)
    console.log(`  products:   ${pgProductCount}`)

    console.log('\n--- Marcas (upsert por slug en destino) ---')
    for (const b of sqliteBrands) {
      console.log(`  • [${b.slug}] ${b.name}`)
    }

    console.log('\n--- Categorías (upsert por slug en destino) ---')
    for (const c of sqliteCategories) {
      console.log(`  • [${c.slug}] ${c.name}`)
    }

    console.log('\n--- Productos por SKU ---')
    const byAction = { insert: 0, skip: 0, update: 0 }
    for (const pp of productPlans) {
      byAction[pp.action]++
      console.log(
        `  • ${pp.sku}  →  ${pp.action.toUpperCase()}  (${pp.title.slice(0, 50)}${pp.title.length > 50 ? '…' : ''})`,
      )
    }
    console.log(
      `\n  Resumen: insert=${byAction.insert}, skip=${byAction.skip}, update=${byAction.update}`,
    )
    if (byAction.skip > 0 && !args.upsertExistingProducts) {
      console.log(
        '\n  (Los SKU "skip" no se modifican ni sus imágenes/specs/prices/files.)',
      )
      console.log(
        '   Para actualizar la cabecera del producto existente: --upsert-existing-products',
      )
    }

    console.log('\n--- Settings (id=1, usdArsRate) ---')
    if (settingsPlan === 'skip-no-sqlite') console.log('  Sin fila en SQLite: no se toca Postgres.')
    else if (settingsPlan === 'insert')
      console.log(
        `  Insertar en Postgres: usdArsRate=${sqliteSettings!.usdArsRate} (no existía fila id=1).`,
      )
    else if (settingsPlan === 'overwrite')
      console.log(
        `  Sobrescribir Postgres: usdArsRate=${sqliteSettings!.usdArsRate} (--overwrite-settings).`,
      )
    else
      console.log(
        `  Postgres ya tiene settings id=1 (usdArsRate=${pgSettings!.usdArsRate}). No se pisa.`,
      )
    console.log(
      '   Para forzar usdArsRate desde SQLite: --overwrite-settings (solo con --execute --yes).',
    )

    console.log('\n========================================\n')

    if (!args.execute) {
      console.log(
        'Modo plan únicamente (sin cambios). Para aplicar: --execute --yes\n',
      )
      return
    }

    if (!args.yes) {
      console.error('Abortado: --execute requiere --yes para confirmar.')
      process.exit(1)
    }

    console.log('>>> Ejecutando escritura en Postgres…\n')

    // 1) Brands & categories upsert por slug
    for (const b of sqliteBrands) {
      await prisma.brand.upsert({
        where: { slug: b.slug },
        create: { name: b.name, slug: b.slug },
        update: { name: b.name },
      })
    }
    console.log(`Marcas upsert: ${sqliteBrands.length}`)

    for (const c of sqliteCategories) {
      await prisma.category.upsert({
        where: { slug: c.slug },
        create: { name: c.name, slug: c.slug },
        update: { name: c.name },
      })
    }
    console.log(`Categorías upsert: ${sqliteCategories.length}`)

    const brandSlugToId = new Map(
      (await prisma.brand.findMany({ select: { id: true, slug: true } })).map(
        (x) => [x.slug, x.id] as const,
      ),
    )
    const categorySlugToId = new Map(
      (
        await prisma.category.findMany({ select: { id: true, slug: true } })
      ).map((x) => [x.slug, x.id] as const),
    )

    // 2) Products + children
    let inserted = 0
    let updated = 0
    let skipped = 0

    for (const p of productRows) {
      const brandId = brandSlugToId.get(p.brandSlug)
      const categoryId = categorySlugToId.get(p.categorySlug)
      if (!brandId || !categoryId) {
        console.warn(
          `Omitido producto SKU=${p.sku}: slug marca/categoría no resuelto en Postgres.`,
        )
        skipped++
        continue
      }

      const commonData = {
        title: p.title,
        short: p.short,
        description: p.description,
        cost: p.cost ?? undefined,
        costCurrency: p.costCurrency ?? 'USD',
        isActive: asBool(p.isActive),
        isFeatured: asBool(p.isFeatured),
        brandId,
        categoryId,
      }

      const plan = productPlans.find((x) => x.sku === p.sku)!
      if (plan.action === 'skip') {
        skipped++
        continue
      }

      if (plan.action === 'update') {
        await prisma.product.update({
          where: { sku: p.sku },
          data: commonData,
        })
        updated++
        continue
      }

      const created = await prisma.product.create({
        data: {
          sku: p.sku,
          ...commonData,
        },
      })
      inserted++
      const newProductId = created.id
      const oldId = p.id

      const images = sqlite
        .prepare(`SELECT * FROM product_images WHERE "productId" = ?`)
        .all(oldId) as {
        url: string
        isPrimary: number | boolean
        sortOrder: number
        createdAt: string
        publicId: string | null
      }[]

      for (const im of images) {
        let publicId: string | null = im.publicId
        if (publicId) {
          const clash = await prisma.productImage.findUnique({
            where: { publicId },
          })
          if (clash) publicId = null
        }
        await prisma.productImage.create({
          data: {
            url: im.url,
            isPrimary: asBool(im.isPrimary),
            sortOrder: im.sortOrder ?? 0,
            createdAt: asDate(im.createdAt) ?? undefined,
            publicId: publicId ?? undefined,
            productId: newProductId,
          },
        })
      }

      const specs = sqlite
        .prepare(`SELECT * FROM product_specs WHERE "productId" = ?`)
        .all(oldId) as {
        label: string
        value: string
        sortOrder: number
        createdAt: string
      }[]

      for (const s of specs) {
        await prisma.productSpec.create({
          data: {
            label: s.label,
            value: s.value,
            sortOrder: s.sortOrder ?? 0,
            createdAt: asDate(s.createdAt) ?? undefined,
            productId: newProductId,
          },
        })
      }

      const prices = sqlite
        .prepare(`SELECT * FROM product_prices WHERE "productId" = ?`)
        .all(oldId) as {
        priceList: string
        currency: string
        netPrice: number
        taxRate: number
        validFrom: string | null
        validTo: string | null
        createdAt: string
        updatedAt: string
      }[]

      for (const pr of prices) {
        await prisma.productPrice.create({
          data: {
            priceList: pr.priceList,
            currency: pr.currency ?? 'ARS',
            netPrice: pr.netPrice,
            taxRate: pr.taxRate ?? 0,
            validFrom: asDate(pr.validFrom),
            validTo: asDate(pr.validTo),
            createdAt: asDate(pr.createdAt) ?? undefined,
            updatedAt: asDate(pr.updatedAt) ?? undefined,
            productId: newProductId,
          },
        })
      }

      const files = sqlite
        .prepare(`SELECT * FROM product_files WHERE "productId" = ?`)
        .all(oldId) as {
        type: string
        url: string
        createdAt: string
      }[]

      for (const f of files) {
        await prisma.productFile.create({
          data: {
            type: f.type,
            url: f.url,
            createdAt: asDate(f.createdAt) ?? undefined,
            productId: newProductId,
          },
        })
      }
    }

    console.log(
      `\nProductos: insertados=${inserted}, actualizados cabecera=${updated}, omitidos=${skipped}`,
    )

    // 3) Settings
    if (sqliteSettings) {
      if (!pgSettings) {
        await prisma.settings.create({
          data: {
            id: 1,
            usdArsRate: sqliteSettings.usdArsRate,
          },
        })
        console.log('Settings: creado id=1 desde SQLite.')
      } else if (args.overwriteSettings) {
        await prisma.settings.update({
          where: { id: 1 },
          data: { usdArsRate: sqliteSettings.usdArsRate },
        })
        console.log('Settings: actualizado id=1 (--overwrite-settings).')
      } else {
        console.log('Settings: sin cambios (ya existía; no se pasó --overwrite-settings).')
      }
    }

    console.log('\nMigración finalizada.\n')
  } finally {
    sqlite.close()
    await prisma.$disconnect()
  }
}

function maskUrl(url: string): string {
  try {
    const u = new URL(url)
    if (u.password) u.password = '***'
    if (u.username) u.username = '***'
    return u.toString()
  } catch {
    return '(URL inválida)'
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
