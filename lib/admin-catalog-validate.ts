/**
 * Validación dry-run para acciones de publicación de catálogo (admin).
 * No modifica la base de datos.
 */

import type { Prisma } from '@prisma/client'
import { withPerf } from '@/lib/perf'
import {
  ensureUniqueProductSlug,
  isValidProductSlug,
  normalizeProductSlug,
} from '@/lib/product-slug'

export const ADMIN_CATALOG_BULK_MAX = 50

export const ADMIN_CATALOG_ACTIONS = [
  'publish',
  'unpublish',
  'feature',
  'unfeature',
  'ensureSlug',
] as const

export type AdminCatalogAction = (typeof ADMIN_CATALOG_ACTIONS)[number]

export type AdminCatalogValidateOptions = {
  generateMissingSlug?: boolean
}

export type AdminCatalogValidateInput = {
  action: AdminCatalogAction
  productIds: number[]
  options?: AdminCatalogValidateOptions
}

export type AdminCatalogItemStatus =
  | 'ready'
  | 'failed'
  | 'warning'
  | 'skipped'

export type AdminCatalogValidateItem = {
  id: number
  sku: string
  title: string
  current: {
    catalogVisible: boolean
    isFeatured: boolean
    slug: string
    isActive: boolean
    hasImage: boolean
  }
  proposed: {
    catalogVisible?: boolean
    isFeatured?: boolean
    slug?: string
  }
  status: AdminCatalogItemStatus
  errors: string[]
  warnings: string[]
}

export type AdminCatalogValidateResult = {
  action: AdminCatalogAction
  summary: {
    total: number
    ready: number
    failed: number
    warnings: number
    skipped: number
  }
  items: AdminCatalogValidateItem[]
}

export type ParseValidateBodyResult =
  | { ok: true; input: AdminCatalogValidateInput }
  | { ok: false; error: string }

const validateSelect = {
  id: true,
  sku: true,
  title: true,
  publicTitle: true,
  short: true,
  publicShortDescription: true,
  slug: true,
  catalogVisible: true,
  isFeatured: true,
  showPrice: true,
  catalogPriceList: true,
  isActive: true,
  brandId: true,
  categoryId: true,
  brand: { select: { id: true, name: true } },
  category: { select: { id: true, name: true } },
  _count: { select: { images: true } },
  images: {
    where: { isPrimary: true },
    take: 1,
    select: { id: true },
  },
} satisfies Prisma.ProductSelect

type ValidateRow = Prisma.ProductGetPayload<{ select: typeof validateSelect }>

function isAdminCatalogAction(value: unknown): value is AdminCatalogAction {
  return (
    typeof value === 'string' &&
    (ADMIN_CATALOG_ACTIONS as readonly string[]).includes(value)
  )
}

/** Parsea y valida el body HTTP. No toca DB. */
export function parseAdminCatalogValidateBody(
  body: unknown,
): ParseValidateBodyResult {
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Body JSON inválido' }
  }

  const raw = body as Record<string, unknown>

  if (!isAdminCatalogAction(raw.action)) {
    return {
      ok: false,
      error: `action inválida. Usá: ${ADMIN_CATALOG_ACTIONS.join(', ')}`,
    }
  }

  if (!Array.isArray(raw.productIds)) {
    return { ok: false, error: 'productIds es obligatorio y debe ser un array' }
  }

  if (raw.productIds.length === 0) {
    return { ok: false, error: 'productIds no puede estar vacío' }
  }

  if (raw.productIds.length > ADMIN_CATALOG_BULK_MAX) {
    return {
      ok: false,
      error: `Máximo ${ADMIN_CATALOG_BULK_MAX} productos por request`,
    }
  }

  const productIds: number[] = []
  const seen = new Set<number>()

  for (const value of raw.productIds) {
    const id =
      typeof value === 'number'
        ? value
        : typeof value === 'string'
          ? Number.parseInt(value, 10)
          : NaN

    if (!Number.isInteger(id) || id <= 0) {
      return {
        ok: false,
        error: 'productIds contiene ids inválidos (se requieren enteros positivos)',
      }
    }

    if (seen.has(id)) continue
    seen.add(id)
    productIds.push(id)
  }

  if (productIds.length === 0) {
    return { ok: false, error: 'productIds no puede estar vacío' }
  }

  if (productIds.length > ADMIN_CATALOG_BULK_MAX) {
    return {
      ok: false,
      error: `Máximo ${ADMIN_CATALOG_BULK_MAX} productos por request`,
    }
  }

  const optionsRaw =
    raw.options && typeof raw.options === 'object'
      ? (raw.options as Record<string, unknown>)
      : {}

  const generateMissingSlug =
    optionsRaw.generateMissingSlug === undefined
      ? true
      : Boolean(optionsRaw.generateMissingSlug)

  return {
    ok: true,
    input: {
      action: raw.action,
      productIds,
      options: { generateMissingSlug },
    },
  }
}

function resolveItemStatus(
  errors: string[],
  warnings: string[],
  skipped: boolean,
): AdminCatalogItemStatus {
  if (errors.length > 0) return 'failed'
  if (skipped) return 'skipped'
  if (warnings.length > 0) return 'warning'
  return 'ready'
}

async function resolveProposedSlug(
  prisma: Awaited<typeof import('@/lib/prisma')>['prisma'],
  product: ValidateRow,
  generateMissingSlug: boolean,
  reservedSlugs: Set<string>,
): Promise<{ slug?: string; errors: string[]; warnings: string[] }> {
  const errors: string[] = []
  const warnings: string[] = []
  const current = (product.slug || '').trim()
  const titleForSlug =
    product.publicTitle?.trim() || product.title.trim() || product.sku

  const isOwnValid =
    current.length > 0 &&
    isValidProductSlug(current) &&
    !reservedSlugs.has(current)

  if (isOwnValid) {
    const existing = await prisma.product.findUnique({
      where: { slug: current },
      select: { id: true },
    })
    if (!existing || existing.id === product.id) {
      reservedSlugs.add(current)
      return { slug: current, errors, warnings }
    }
    // Slug válido pero tomado por otro producto
    if (!generateMissingSlug) {
      errors.push(`El slug "${current}" ya está en uso por otro producto`)
      return { errors, warnings }
    }
    warnings.push(
      `El slug actual "${current}" está en uso; se propone uno único`,
    )
  } else if (current && !isValidProductSlug(current)) {
    if (!generateMissingSlug) {
      errors.push(
        'Slug inválido. Usá solo minúsculas, números y guiones',
      )
      return { errors, warnings }
    }
    warnings.push('Slug inválido; se propone uno regenerado')
  } else if (!current) {
    if (!generateMissingSlug) {
      errors.push('Falta slug y generateMissingSlug=false')
      return { errors, warnings }
    }
    warnings.push('Falta slug; se propone uno autogenerado')
  }

  // Generar único respetando slugs ya reservados en este lote
  let candidate = await ensureUniqueProductSlug(
    prisma,
    titleForSlug,
    product.sku,
    product.id,
  )

  if (reservedSlugs.has(candidate)) {
    const base =
      normalizeProductSlug(titleForSlug) ||
      normalizeProductSlug(product.sku) ||
      'producto'
    let n = 2
    while (reservedSlugs.has(candidate) && n <= 10_000) {
      candidate = `${base}-${n}`
      n += 1
    }
    if (reservedSlugs.has(candidate)) {
      candidate = `${base}-${product.id}`
    }

    const clash = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
    if (clash && clash.id !== product.id) {
      candidate = await ensureUniqueProductSlug(
        prisma,
        `${titleForSlug}-${product.id}`,
        product.sku,
        product.id,
      )
      let m = 2
      while (reservedSlugs.has(candidate) && m <= 10_000) {
        candidate = `${normalizeProductSlug(titleForSlug) || 'producto'}-${product.id}-${m}`
        m += 1
      }
    }
  }

  reservedSlugs.add(candidate)
  return { slug: candidate, errors, warnings }
}

async function validatePublishItem(
  prisma: Awaited<typeof import('@/lib/prisma')>['prisma'],
  product: ValidateRow,
  generateMissingSlug: boolean,
  reservedSlugs: Set<string>,
): Promise<AdminCatalogValidateItem> {
  const errors: string[] = []
  const warnings: string[] = []
  const hasImage = product._count.images > 0
  const hasPrimary = product.images.length > 0
  const displayTitle =
    product.publicTitle?.trim() || product.title.trim() || ''

  if (!product.isActive) {
    errors.push('El producto debe estar activo para publicarse')
  }
  if (!product.brandId || !product.brand) {
    errors.push('Falta marca')
  }
  if (!product.categoryId || !product.category) {
    errors.push('Falta categoría')
  }
  if (!hasImage) {
    errors.push('Se requiere al menos una imagen para publicar')
  }
  if (!displayTitle) {
    errors.push('Se requiere título o título público')
  }

  const slugResult = await resolveProposedSlug(
    prisma,
    product,
    generateMissingSlug,
    reservedSlugs,
  )
  errors.push(...slugResult.errors)
  warnings.push(...slugResult.warnings)

  if (product.catalogVisible) {
    warnings.push('Ya está publicado en el catálogo')
  }
  if (
    !product.publicShortDescription?.trim() &&
    !product.short?.trim()
  ) {
    warnings.push('Falta descripción corta (publicShortDescription o short)')
  }
  if (product.showPrice && !product.catalogPriceList?.trim()) {
    warnings.push('showPrice=true pero falta catalogPriceList')
  }
  if (hasImage && !hasPrimary) {
    warnings.push('Ninguna imagen está marcada como principal')
  }

  const skipped =
    errors.length === 0 && product.catalogVisible === true

  // Si ya publicado y sin errores de bloqueo → skipped (nada que aplicar)
  // Si hay errores, failed gana
  const status = resolveItemStatus(errors, warnings, skipped)

  return {
    id: product.id,
    sku: product.sku,
    title: displayTitle || product.title || product.sku,
    current: {
      catalogVisible: product.catalogVisible,
      isFeatured: product.isFeatured,
      slug: product.slug,
      isActive: product.isActive,
      hasImage,
    },
    proposed: {
      catalogVisible: true,
      ...(slugResult.slug ? { slug: slugResult.slug } : {}),
    },
    status,
    errors,
    warnings,
  }
}

function validateUnpublishItem(product: ValidateRow): AdminCatalogValidateItem {
  const warnings: string[] = []
  const hasImage = product._count.images > 0
  const skipped = !product.catalogVisible

  if (skipped) {
    warnings.push('Ya está despublicado')
  }

  return {
    id: product.id,
    sku: product.sku,
    title: product.publicTitle?.trim() || product.title,
    current: {
      catalogVisible: product.catalogVisible,
      isFeatured: product.isFeatured,
      slug: product.slug,
      isActive: product.isActive,
      hasImage,
    },
    proposed: { catalogVisible: false },
    status: resolveItemStatus([], warnings, skipped),
    errors: [],
    warnings,
  }
}

function validateFeatureItem(
  product: ValidateRow,
  feature: boolean,
): AdminCatalogValidateItem {
  const warnings: string[] = []
  const hasImage = product._count.images > 0
  const already = product.isFeatured === feature
  const skipped = already

  if (skipped) {
    warnings.push(feature ? 'Ya está destacado' : 'Ya no está destacado')
  }
  if (feature && !product.catalogVisible) {
    warnings.push('El producto no está publicado en el catálogo')
  }

  return {
    id: product.id,
    sku: product.sku,
    title: product.publicTitle?.trim() || product.title,
    current: {
      catalogVisible: product.catalogVisible,
      isFeatured: product.isFeatured,
      slug: product.slug,
      isActive: product.isActive,
      hasImage,
    },
    proposed: { isFeatured: feature },
    status: resolveItemStatus([], warnings, skipped),
    errors: [],
    warnings,
  }
}

async function validateEnsureSlugItem(
  prisma: Awaited<typeof import('@/lib/prisma')>['prisma'],
  product: ValidateRow,
  generateMissingSlug: boolean,
  reservedSlugs: Set<string>,
): Promise<AdminCatalogValidateItem> {
  const hasImage = product._count.images > 0
  const current = (product.slug || '').trim()
  const slugOk =
    current.length > 0 &&
    isValidProductSlug(current) &&
    !reservedSlugs.has(current)

  let needsChange = !slugOk

  if (slugOk) {
    const existing = await prisma.product.findUnique({
      where: { slug: current },
      select: { id: true },
    })
    if (existing && existing.id !== product.id) {
      needsChange = true
    } else {
      reservedSlugs.add(current)
    }
  }

  if (!needsChange) {
    return {
      id: product.id,
      sku: product.sku,
      title: product.publicTitle?.trim() || product.title,
      current: {
        catalogVisible: product.catalogVisible,
        isFeatured: product.isFeatured,
        slug: product.slug,
        isActive: product.isActive,
        hasImage,
      },
      proposed: { slug: current },
      status: 'skipped',
      errors: [],
      warnings: ['El slug actual es válido'],
    }
  }

  const slugResult = await resolveProposedSlug(
    prisma,
    product,
    generateMissingSlug,
    reservedSlugs,
  )

  return {
    id: product.id,
    sku: product.sku,
    title: product.publicTitle?.trim() || product.title,
    current: {
      catalogVisible: product.catalogVisible,
      isFeatured: product.isFeatured,
      slug: product.slug,
      isActive: product.isActive,
      hasImage,
    },
    proposed: slugResult.slug ? { slug: slugResult.slug } : {},
    status: resolveItemStatus(slugResult.errors, slugResult.warnings, false),
    errors: slugResult.errors,
    warnings: slugResult.warnings,
  }
}

function notFoundItem(id: number): AdminCatalogValidateItem {
  return {
    id,
    sku: '—',
    title: 'Producto no encontrado',
    current: {
      catalogVisible: false,
      isFeatured: false,
      slug: '',
      isActive: false,
      hasImage: false,
    },
    proposed: {},
    status: 'failed',
    errors: ['Producto no encontrado'],
    warnings: [],
  }
}

function buildSummary(
  items: AdminCatalogValidateItem[],
): AdminCatalogValidateResult['summary'] {
  const summary = {
    total: items.length,
    ready: 0,
    failed: 0,
    warnings: 0,
    skipped: 0,
  }
  for (const item of items) {
    if (item.status === 'ready') summary.ready += 1
    else if (item.status === 'failed') summary.failed += 1
    else if (item.status === 'warning') summary.warnings += 1
    else if (item.status === 'skipped') summary.skipped += 1
  }
  return summary
}

/**
 * Valida productos para una acción de catálogo sin mutar DB.
 */
export async function validateAdminCatalogProducts(
  input: AdminCatalogValidateInput,
): Promise<AdminCatalogValidateResult> {
  return withPerf(
    'admin.catalog.validate',
    async () => {
      const { prisma } = await import('@/lib/prisma')
      const generateMissingSlug = input.options?.generateMissingSlug !== false

      const rows = await prisma.product.findMany({
        where: { id: { in: input.productIds } },
        select: validateSelect,
      })

      const byId = new Map(rows.map((r) => [r.id, r]))
      const reservedSlugs = new Set<string>()
      const items: AdminCatalogValidateItem[] = []

      for (const id of input.productIds) {
        const product = byId.get(id)
        if (!product) {
          items.push(notFoundItem(id))
          continue
        }

        switch (input.action) {
          case 'publish':
            items.push(
              await validatePublishItem(
                prisma,
                product,
                generateMissingSlug,
                reservedSlugs,
              ),
            )
            break
          case 'unpublish':
            items.push(validateUnpublishItem(product))
            break
          case 'feature':
            items.push(validateFeatureItem(product, true))
            break
          case 'unfeature':
            items.push(validateFeatureItem(product, false))
            break
          case 'ensureSlug':
            items.push(
              await validateEnsureSlugItem(
                prisma,
                product,
                generateMissingSlug,
                reservedSlugs,
              ),
            )
            break
        }
      }

      return {
        action: input.action,
        summary: buildSummary(items),
        items,
      }
    },
    (result) => result.items.length,
  )
}
