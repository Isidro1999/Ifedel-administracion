/**
 * Relink San Miguel: Cloudinary (SKU folder) → product_images.
 *
 * Dry-run (read-only):
 *   npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --dry-run
 *   npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --dry-run --production
 *
 * Apply (escritura producción — NO correr sin aprobación explícita):
 *   npx tsx --env-file=.env scripts/san-miguel-image-relink.ts \
 *     --apply --production --confirm-relink
 *
 * Match exclusivo por SKU → carpeta:
 *   {CLOUDINARY_FOLDER|ifedel/products}/{SKU}/...
 *
 * Orden multi-imagen (aprobado):
 *   created_at ASC, desempate public_id ASC
 *   → primera: isPrimary=true, sortOrder=0
 *
 * Protecciones apply:
 *   --apply + --production + --confirm-relink
 *   escritura vía DIRECT_URL (no transaction pooler :6543)
 *   transacción por producto; no toca catalogVisible ni Cloudinary
 *
 * Alias legacy: scripts/san-miguel-image-relink-dry-run.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import { PrismaClient } from '@prisma/client'
import { v2 as cloudinary } from 'cloudinary'
import {
  assertScriptDatabaseAccess,
  formatDbTargetLog,
  parseProductionFlags,
  resolveApplyWriteDatasourceUrl,
} from '../lib/db-local-safety'

const BRAND_SLUG = 'san-miguel'
const DEFAULT_FOLDER_BASE = 'ifedel/products'
const DEFAULT_DRY_CSV = path.join('output', 'san-miguel-image-relink-dry-run.csv')
const DEFAULT_APPLY_CSV = path.join('output', 'san-miguel-image-relink-apply.csv')

type AuditAction =
  | 'ALREADY_LINKED'
  | 'RELINK'
  | 'NO_CLOUDINARY_ASSET'
  | 'REVIEW'
  | 'SKIP'

type ApplyStatus =
  | 'RELINKED'
  | 'SKIPPED_ALREADY_LINKED'
  | 'SKIPPED_CHANGED_SINCE_DRY_RUN'
  | 'SKIPPED_NO_LONGER_RELINK'
  | 'FAILED'

type CloudAsset = {
  publicId: string
  url: string
  createdAt: string | null
  proposedSortOrder: number
  proposedIsPrimary: boolean
}

type AuditRow = {
  sku: string
  productId: number
  title: string
  catalogVisible: boolean
  dbImageCount: number
  cloudinaryAssetCount: number
  proposedPrimary: string
  cloudinaryAssets: string
  action: AuditAction
  notes: string
}

type ApplyRow = {
  sku: string
  productId: number
  title: string
  imagesCreated: number
  primaryPublicId: string
  status: ApplyStatus
  error: string
}

type ProductRow = {
  id: number
  sku: string
  title: string
  catalogVisible: boolean
  images: Array<{ id: number; publicId: string | null; url: string; isPrimary: boolean }>
}

function parseArgs(argv: string[]) {
  let dryRun = false
  let apply = false
  let confirmRelink = false
  let dryCsvPath = DEFAULT_DRY_CSV
  let applyCsvPath = DEFAULT_APPLY_CSV
  const { production, confirmProduction } = parseProductionFlags(argv)

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--dry-run') dryRun = true
    if (a === '--apply') apply = true
    if (a === '--confirm-relink') confirmRelink = true
    if (a === '--csv') {
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        throw new Error('ABORT: --csv requiere una ruta')
      }
      dryCsvPath = next
      i++
    }
    if (a === '--apply-csv') {
      const next = argv[i + 1]
      if (!next || next.startsWith('--')) {
        throw new Error('ABORT: --apply-csv requiere una ruta')
      }
      applyCsvPath = next
      i++
    }
  }

  return {
    dryRun,
    apply,
    production,
    confirmProduction,
    confirmRelink,
    dryCsvPath,
    applyCsvPath,
  }
}

function folderBase(): string {
  return (process.env.CLOUDINARY_FOLDER || DEFAULT_FOLDER_BASE).replace(
    /\/+$/,
    '',
  )
}

function skuFolderPrefix(sku: string): string {
  return `${folderBase()}/${sku}/`
}

function csvEscape(value: string | number | boolean): string {
  const s = String(value ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function writeCsv<T extends Record<string, string | number | boolean>>(
  filePath: string,
  headers: (keyof T)[],
  rows: T[],
) {
  const lines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => csvEscape(r[h] as string | number | boolean)).join(',')),
  ]
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, lines.join('\n') + '\n', 'utf8')
}

/**
 * Orden determinístico compatible con el upload admin:
 * primera imagen subida → isPrimary + sortOrder 0.
 * Cloudinary: created_at ASC, desempate public_id ASC.
 */
function orderCloudAssets(
  resources: Array<{
    public_id: string
    secure_url?: string
    url?: string
    created_at?: string
  }>,
): CloudAsset[] {
  const sorted = [...resources].sort((a, b) => {
    const ca = a.created_at || ''
    const cb = b.created_at || ''
    if (ca !== cb) return ca.localeCompare(cb)
    return a.public_id.localeCompare(b.public_id)
  })

  return sorted.map((r, index) => ({
    publicId: r.public_id,
    url: r.secure_url || r.url || '',
    createdAt: r.created_at || null,
    proposedSortOrder: index,
    proposedIsPrimary: index === 0,
  }))
}

async function listCloudinaryAssetsForSku(sku: string): Promise<{
  assets: CloudAsset[]
  rawCount: number
  rejectedOutsideFolder: number
}> {
  const prefix = skuFolderPrefix(sku)
  const collected: Array<{
    public_id: string
    secure_url?: string
    url?: string
    created_at?: string
  }> = []

  let nextCursor: string | undefined
  do {
    const res = (await cloudinary.api.resources({
      type: 'upload',
      prefix,
      max_results: 100,
      ...(nextCursor ? { next_cursor: nextCursor } : {}),
    })) as {
      resources?: Array<{
        public_id: string
        secure_url?: string
        url?: string
        created_at?: string
      }>
      next_cursor?: string
    }

    for (const r of res.resources || []) {
      collected.push(r)
    }
    nextCursor = res.next_cursor
  } while (nextCursor)

  const rawCount = collected.length
  const inFolder = collected.filter(
    (r) =>
      r.public_id.startsWith(prefix) ||
      r.public_id === `${folderBase()}/${sku}`,
  )
  const rejectedOutsideFolder = rawCount - inFolder.length
  const withUrl = inFolder.filter((r) => Boolean(r.secure_url || r.url))

  return {
    assets: orderCloudAssets(withUrl),
    rawCount,
    rejectedOutsideFolder,
  }
}

function classifyProduct(input: {
  dbImageCount: number
  assets: CloudAsset[]
  rejectedOutsideFolder: number
}): Pick<AuditRow, 'action' | 'proposedPrimary' | 'notes'> {
  if (input.dbImageCount > 0) {
    return {
      action: 'ALREADY_LINKED',
      proposedPrimary: '',
      notes:
        'Ya tiene product_images en DB. No se propone cambios (no borrar/reordenar).',
    }
  }

  if (input.rejectedOutsideFolder > 0) {
    return {
      action: 'REVIEW',
      proposedPrimary: '',
      notes: `Cloudinary devolvió ${input.rejectedOutsideFolder} asset(s) fuera del prefijo exacto de carpeta SKU. Revisión manual.`,
    }
  }

  if (input.assets.length === 0) {
    return {
      action: 'NO_CLOUDINARY_ASSET',
      proposedPrimary: '',
      notes: 'Sin assets bajo carpeta exacta de SKU.',
    }
  }

  if (input.assets.some((a) => !a.url)) {
    return {
      action: 'REVIEW',
      proposedPrimary: '',
      notes: 'Algún asset no tiene secure_url/url. Revisión manual.',
    }
  }

  const primary = input.assets.find((a) => a.proposedIsPrimary)
  const orderNote =
    input.assets.length === 1
      ? 'Única imagen → primary sortOrder=0.'
      : `Múltiples imágenes: primary = created_at ASC, desempate public_id ASC. Orden: ${input.assets
          .map((a) => `${a.proposedSortOrder}:${a.publicId}`)
          .join(' | ')}`

  return {
    action: 'RELINK',
    proposedPrimary: primary?.publicId || '',
    notes: orderNote,
  }
}

function configureCloudinary() {
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY) {
    throw new Error('ABORT: faltan variables Cloudinary en el entorno')
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  })
}

async function loadSanMiguelProducts(prisma: PrismaClient): Promise<ProductRow[]> {
  return prisma.product.findMany({
    where: { brand: { slug: BRAND_SLUG } },
    select: {
      id: true,
      sku: true,
      title: true,
      catalogVisible: true,
      images: {
        select: { id: true, publicId: true, url: true, isPrimary: true },
      },
    },
    orderBy: { sku: 'asc' },
  })
}

async function auditProducts(
  products: ProductRow[],
  options: { skipCloudinaryIfLinked?: boolean } = {},
): Promise<{
  rows: AuditRow[]
  counts: Record<AuditAction, number>
  relinkPlan: Array<{ product: ProductRow; assets: CloudAsset[] }>
}> {
  const skipCloudinaryIfLinked = options.skipCloudinaryIfLinked !== false
  const rows: AuditRow[] = []
  const counts: Record<AuditAction, number> = {
    ALREADY_LINKED: 0,
    RELINK: 0,
    NO_CLOUDINARY_ASSET: 0,
    REVIEW: 0,
    SKIP: 0,
  }
  const relinkPlan: Array<{ product: ProductRow; assets: CloudAsset[] }> = []

  let i = 0
  for (const product of products) {
    i++
    if (i % 20 === 0 || i === products.length) {
      console.log(`… Cloudinary ${i}/${products.length}`)
    }

    const dbImageCount = product.images.length
    let assets: CloudAsset[] = []
    let rejectedOutsideFolder = 0
    let cloudError: string | null = null

    const shouldQueryCloud =
      !(skipCloudinaryIfLinked && dbImageCount > 0)

    if (shouldQueryCloud) {
      try {
        const listed = await listCloudinaryAssetsForSku(product.sku)
        assets = listed.assets
        rejectedOutsideFolder = listed.rejectedOutsideFolder
      } catch (err) {
        cloudError = err instanceof Error ? err.message : String(err)
      }
    }

    let classified: Pick<AuditRow, 'action' | 'proposedPrimary' | 'notes'>
    if (cloudError) {
      classified = {
        action: 'REVIEW',
        proposedPrimary: '',
        notes: `Error consultando Cloudinary: ${cloudError}`,
      }
    } else {
      classified = classifyProduct({
        dbImageCount,
        assets,
        rejectedOutsideFolder,
      })
      if (classified.action === 'NO_CLOUDINARY_ASSET') {
        classified = {
          ...classified,
          notes: `Sin assets bajo ${skuFolderPrefix(product.sku)}`,
        }
      }
    }

    counts[classified.action]++

    if (classified.action === 'RELINK') {
      relinkPlan.push({ product, assets })
    }

    rows.push({
      sku: product.sku,
      productId: product.id,
      title: product.title,
      catalogVisible: product.catalogVisible,
      dbImageCount,
      cloudinaryAssetCount: assets.length,
      proposedPrimary: classified.proposedPrimary,
      cloudinaryAssets: assets.map((a) => a.publicId).join(' | '),
      action: classified.action,
      notes: classified.notes,
    })
  }

  return { rows, counts, relinkPlan }
}

function printDryRunSummary(
  productsLength: number,
  counts: Record<AuditAction, number>,
  rows: AuditRow[],
  csvPath: string,
) {
  const relinkCatalogVisible = rows.filter(
    (r) => r.action === 'RELINK' && r.catalogVisible,
  ).length
  const noAssetCatalogVisible = rows.filter(
    (r) => r.action === 'NO_CLOUDINARY_ASSET' && r.catalogVisible,
  ).length
  const multiImageRelink = rows.filter(
    (r) => r.action === 'RELINK' && r.cloudinaryAssetCount > 1,
  ).length
  const plannedImages = rows
    .filter((r) => r.action === 'RELINK')
    .reduce((sum, r) => sum + r.cloudinaryAssetCount, 0)
  const reviewRows = rows.filter((r) => r.action === 'REVIEW')

  console.log('\n=== SUMMARY (dry-run) ===')
  console.log(`total San Miguel:     ${productsLength}`)
  console.log(`ALREADY_LINKED:       ${counts.ALREADY_LINKED}`)
  console.log(`RELINK:               ${counts.RELINK}`)
  console.log(`  └ catalogVisible:   ${relinkCatalogVisible}`)
  console.log(`  └ multi-image:      ${multiImageRelink}`)
  console.log(`  └ images planned:   ${plannedImages}`)
  console.log(`NO_CLOUDINARY_ASSET:  ${counts.NO_CLOUDINARY_ASSET}`)
  console.log(`  └ catalogVisible:   ${noAssetCatalogVisible}`)
  console.log(`REVIEW:               ${counts.REVIEW}`)
  console.log(`SKIP:                 ${counts.SKIP}`)
  console.log(`CSV: ${path.resolve(csvPath)}`)

  console.log('\nComparación con auditoría previa (~98 / 1 / 72 / 25):')
  console.log(
    `  total=${productsLength} linked=${counts.ALREADY_LINKED} relink=${counts.RELINK} noAsset=${counts.NO_CLOUDINARY_ASSET} review=${counts.REVIEW}`,
  )
  if (
    productsLength === 98 &&
    counts.ALREADY_LINKED === 1 &&
    counts.RELINK === 72 &&
    counts.NO_CLOUDINARY_ASSET === 25
  ) {
    console.log('  ✓ Coincide con el snapshot previo.')
  } else {
    console.log(
      '  ⚠ Difiere del snapshot previo (estado DB/Cloudinary puede haber cambiado).',
    )
  }

  if (reviewRows.length) {
    console.log('\n=== REVIEW (detalle) ===')
    for (const r of reviewRows.slice(0, 30)) {
      console.log(`- ${r.sku} | ${r.title} | ${r.notes}`)
    }
    if (reviewRows.length > 30) {
      console.log(`… +${reviewRows.length - 30} más (ver CSV)`)
    }
  }
}

async function runDryRun(args: ReturnType<typeof parseArgs>) {
  console.log('=== San Miguel image relink — DRY-RUN ===')

  const target = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
    mode: args.production ? 'production-readonly' : 'local-only',
    allowProduction: args.production,
  })
  console.log(`DB target: ${formatDbTargetLog(target)}`)
  console.log(`Cloudinary folder base: ${folderBase()}`)
  console.log('Modo: DRY-RUN (read-only; no escribe DB ni Cloudinary)')

  configureCloudinary()
  const { prisma } = await import('../lib/prisma')
  const products = await loadSanMiguelProducts(prisma)
  console.log(`Productos marca ${BRAND_SLUG}: ${products.length}`)

  const { rows, counts } = await auditProducts(products)
  writeCsv(
    args.dryCsvPath,
    [
      'sku',
      'productId',
      'title',
      'catalogVisible',
      'dbImageCount',
      'cloudinaryAssetCount',
      'proposedPrimary',
      'cloudinaryAssets',
      'action',
      'notes',
    ],
    rows,
  )
  printDryRunSummary(products.length, counts, rows, args.dryCsvPath)
  console.log(
    '\nGarantía: este run no ejecutó create/update/delete en product_images ni uploads Cloudinary.',
  )
  console.log(
    '\nPost-apply esperado (cuando se ejecute apply): ALREADY_LINKED≈73, RELINK=0, NO_CLOUDINARY_ASSET=25, REVIEW=0.',
  )
}

async function applyOneProduct(
  writePrisma: PrismaClient,
  product: ProductRow,
  _plannedAssets: CloudAsset[],
): Promise<ApplyRow> {
  const base: Omit<ApplyRow, 'imagesCreated' | 'primaryPublicId' | 'status' | 'error'> =
    {
      sku: product.sku,
      productId: product.id,
      title: product.title,
    }

  try {
    // Pre-check fuera de la TX (rápido; el check definitivo está dentro)
    const preCount = await writePrisma.productImage.count({
      where: { productId: product.id },
    })
    if (preCount > 0) {
      return {
        ...base,
        imagesCreated: 0,
        primaryPublicId: '',
        status: 'SKIPPED_CHANGED_SINCE_DRY_RUN',
        error: 'El producto ya tenía product_images al momento del apply.',
      }
    }

    // Cloudinary fresco FUERA de la TX (no retener conexión DB)
    const fresh = await listCloudinaryAssetsForSku(product.sku)
    const classified = classifyProduct({
      dbImageCount: 0,
      assets: fresh.assets,
      rejectedOutsideFolder: fresh.rejectedOutsideFolder,
    })
    if (classified.action !== 'RELINK' || fresh.assets.length === 0) {
      return {
        ...base,
        imagesCreated: 0,
        primaryPublicId: '',
        status: 'SKIPPED_NO_LONGER_RELINK',
        error: `Ya no califica como RELINK (acción=${classified.action}).`,
      }
    }

    const assets = fresh.assets
    const publicIds = assets.map((a) => a.publicId)

    await writePrisma.$transaction(async (tx) => {
      const currentCount = await tx.productImage.count({
        where: { productId: product.id },
      })
      if (currentCount > 0) {
        throw Object.assign(new Error('CHANGED_SINCE_CHECK'), {
          code: 'CHANGED_SINCE_CHECK',
        })
      }

      const conflicts = await tx.productImage.findMany({
        where: { publicId: { in: publicIds } },
        select: { publicId: true, productId: true },
      })
      if (conflicts.length > 0) {
        throw new Error(
          `publicId ya existe en DB: ${conflicts
            .map((c) => `${c.publicId}→productId=${c.productId}`)
            .join('; ')}`,
        )
      }

      await tx.productImage.createMany({
        data: assets.map((a) => ({
          productId: product.id,
          url: a.url,
          publicId: a.publicId,
          isPrimary: a.proposedIsPrimary,
          sortOrder: a.proposedSortOrder,
        })),
      })
    })

    const primary = assets.find((a) => a.proposedIsPrimary)
    return {
      ...base,
      imagesCreated: assets.length,
      primaryPublicId: primary?.publicId || '',
      status: 'RELINKED',
      error: '',
    }
  } catch (err) {
    const code =
      err && typeof err === 'object' && 'code' in err
        ? String((err as { code?: string }).code)
        : ''
    if (code === 'CHANGED_SINCE_CHECK') {
      return {
        ...base,
        imagesCreated: 0,
        primaryPublicId: '',
        status: 'SKIPPED_CHANGED_SINCE_DRY_RUN',
        error: 'El producto ya tenía product_images al momento del apply.',
      }
    }
    return {
      ...base,
      imagesCreated: 0,
      primaryPublicId: '',
      status: 'FAILED',
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

async function runApply(args: ReturnType<typeof parseArgs>) {
  console.log('=== San Miguel image relink — APPLY ===')

  if (!args.production) {
    throw new Error(
      'ABORT: apply requiere --production (escritura solo autorizada en producción Supabase IFEDEL con flags).',
    )
  }
  if (!args.confirmRelink) {
    throw new Error(
      'ABORT: apply requiere --confirm-relink (protección no interactiva contra apply accidental).',
    )
  }

  // Read-path classification usa DATABASE_URL; write-path exige DIRECT_URL.
  const readTarget = assertScriptDatabaseAccess(process.env.DATABASE_URL, {
    mode: 'production-readonly',
    allowProduction: true,
  })
  console.log(`DB read target: ${formatDbTargetLog(readTarget)}`)

  const writeDs = resolveApplyWriteDatasourceUrl({
    isProduction: true,
    databaseUrl: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  })
  console.log(
    `DB write target: ${formatDbTargetLog(writeDs.target)} via ${writeDs.envKey}`,
  )
  console.log(`Cloudinary folder base: ${folderBase()}`)
  console.log('Cloudinary: solo lectura (no upload/delete/transform)')

  configureCloudinary()

  const { prisma: readPrisma } = await import('../lib/prisma')
  const writePrisma = new PrismaClient({
    datasources: { db: { url: writeDs.url } },
  })

  const started = Date.now()
  try {
    const products = await loadSanMiguelProducts(readPrisma)
    console.log(`Productos marca ${BRAND_SLUG}: ${products.length}`)

    const { rows, counts, relinkPlan } = await auditProducts(products)
    // Guardar dry snapshot del mismo run (no pisa apply csv)
    writeCsv(
      args.dryCsvPath,
      [
        'sku',
        'productId',
        'title',
        'catalogVisible',
        'dbImageCount',
        'cloudinaryAssetCount',
        'proposedPrimary',
        'cloudinaryAssets',
        'action',
        'notes',
      ],
      rows,
    )

    const plannedImageRows = relinkPlan.reduce(
      (sum, p) => sum + p.assets.length,
      0,
    )

    console.log('\n=== PRE-APPLY CONFIRMATION ===')
    console.log('DB: production')
    console.log(`Brand: San Miguel (${BRAND_SLUG})`)
    console.log(`RELINK candidates: ${counts.RELINK}`)
    console.log(`Products already linked: ${counts.ALREADY_LINKED}`)
    console.log(`No Cloudinary asset: ${counts.NO_CLOUDINARY_ASSET}`)
    console.log(`REVIEW: ${counts.REVIEW}`)
    console.log(`Writes planned: ${plannedImageRows} product_images across ${relinkPlan.length} products`)
    console.log('Flags: --apply --production --confirm-relink ✓')

    if (relinkPlan.length === 0) {
      console.log('\nNada para escribir (0 RELINK).')
      writeCsv(
        args.applyCsvPath,
        [
          'sku',
          'productId',
          'title',
          'imagesCreated',
          'primaryPublicId',
          'status',
          'error',
        ],
        [],
      )
      console.log(`Apply CSV: ${path.resolve(args.applyCsvPath)}`)
      return
    }

    const applyRows: ApplyRow[] = []
    let relinked = 0
    let imagesCreated = 0
    let skipped = 0
    let failed = 0

    for (const item of relinkPlan) {
      const row = await applyOneProduct(writePrisma, item.product, item.assets)
      applyRows.push(row)

      const primaryLog = row.primaryPublicId || '—'
      console.log(
        `[${row.status}] sku=${row.sku} productId=${row.productId} created=${row.imagesCreated} primary=${primaryLog}${
          row.error ? ` error=${row.error}` : ''
        }`,
      )

      if (row.status === 'RELINKED') {
        relinked++
        imagesCreated += row.imagesCreated
      } else if (row.status === 'FAILED') {
        failed++
      } else {
        skipped++
      }
    }

    writeCsv(
      args.applyCsvPath,
      [
        'sku',
        'productId',
        'title',
        'imagesCreated',
        'primaryPublicId',
        'status',
        'error',
      ],
      applyRows,
    )

    const elapsedMs = Date.now() - started
    console.log('\n=== APPLY SUMMARY ===')
    console.log(`productos evaluados (RELINK plan): ${relinkPlan.length}`)
    console.log(`productos relinkeados:             ${relinked}`)
    console.log(`imágenes creadas:                  ${imagesCreated}`)
    console.log(`skipped:                           ${skipped}`)
    console.log(`errores (FAILED):                  ${failed}`)
    console.log(`duración:                          ${elapsedMs}ms`)
    console.log(`Apply CSV: ${path.resolve(args.applyCsvPath)}`)
    console.log(
      '\nValidación posterior sugerida:\n' +
        '  npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --dry-run --production\n' +
        'Esperado: ALREADY_LINKED≈73, RELINK=0, NO_CLOUDINARY_ASSET=25, REVIEW=0',
    )

    if (failed > 0) {
      process.exitCode = 1
    }
  } finally {
    await writePrisma.$disconnect()
  }
}

export async function main() {
  const args = parseArgs(process.argv.slice(2))

  if (args.apply && args.dryRun) {
    throw new Error('ABORT: no combines --dry-run y --apply en la misma ejecución')
  }
  if (!args.apply && !args.dryRun) {
    throw new Error(
      'ABORT: debés pasar --dry-run o --apply.\n' +
        '  Dry-run: npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --dry-run --production\n' +
        '  Apply:   npx tsx --env-file=.env scripts/san-miguel-image-relink.ts --apply --production --confirm-relink',
    )
  }

  if (args.dryRun) {
    await runDryRun(args)
    return
  }

  await runApply(args)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
