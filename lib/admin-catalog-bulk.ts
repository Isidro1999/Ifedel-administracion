/**
 * Acciones masivas reales sobre catálogo online (admin).
 * Reutiliza la validación dry-run; aplica solo ready/warning.
 */

import type { Prisma } from '@prisma/client'
import { withPerf } from '@/lib/perf'
import { revalidateCatalogPublicCache } from '@/lib/catalog-revalidate'
import {
  parseAdminCatalogValidateBody,
  validateAdminCatalogProducts,
  type AdminCatalogAction,
  type AdminCatalogValidateInput,
  type AdminCatalogValidateItem,
  type ParseValidateBodyResult,
} from '@/lib/admin-catalog-validate'

export { parseAdminCatalogValidateBody }
export type { AdminCatalogValidateInput, ParseValidateBodyResult }

export type AdminCatalogBulkItemStatus = 'updated' | 'failed' | 'skipped'

export type AdminCatalogBulkChange = {
  from: boolean | string | null
  to: boolean | string | null
}

export type AdminCatalogBulkItem = {
  id: number
  sku: string
  title: string
  status: AdminCatalogBulkItemStatus
  errors: string[]
  warnings: string[]
  changes: {
    catalogVisible?: AdminCatalogBulkChange
    isFeatured?: AdminCatalogBulkChange
    slug?: AdminCatalogBulkChange
  }
}

export type AdminCatalogBulkResult = {
  action: AdminCatalogAction
  summary: {
    total: number
    updated: number
    failed: number
    skipped: number
    warnings: number
  }
  items: AdminCatalogBulkItem[]
}

function buildDataFromValidated(
  action: AdminCatalogAction,
  item: AdminCatalogValidateItem,
): Prisma.ProductUpdateInput | null {
  const data: Prisma.ProductUpdateInput = {}

  switch (action) {
    case 'publish': {
      data.catalogVisible = true
      const nextSlug = item.proposed.slug?.trim()
      if (nextSlug && nextSlug !== item.current.slug) {
        data.slug = nextSlug
      }
      break
    }
    case 'unpublish':
      data.catalogVisible = false
      break
    case 'feature':
      data.isFeatured = true
      break
    case 'unfeature':
      data.isFeatured = false
      break
    case 'ensureSlug': {
      const nextSlug = item.proposed.slug?.trim()
      if (!nextSlug || nextSlug === item.current.slug) {
        return null
      }
      data.slug = nextSlug
      break
    }
  }

  return Object.keys(data).length > 0 ? data : null
}

function buildChanges(
  action: AdminCatalogAction,
  item: AdminCatalogValidateItem,
  data: Prisma.ProductUpdateInput,
): AdminCatalogBulkItem['changes'] {
  const changes: AdminCatalogBulkItem['changes'] = {}

  if (data.catalogVisible !== undefined) {
    changes.catalogVisible = {
      from: item.current.catalogVisible,
      to: Boolean(data.catalogVisible),
    }
  }
  if (data.isFeatured !== undefined) {
    changes.isFeatured = {
      from: item.current.isFeatured,
      to: Boolean(data.isFeatured),
    }
  }
  if (typeof data.slug === 'string') {
    changes.slug = {
      from: item.current.slug || null,
      to: data.slug,
    }
  }

  // Asegurar que publish siempre reporte catalogVisible si se aplicó
  if (action === 'publish' && !changes.catalogVisible) {
    changes.catalogVisible = {
      from: item.current.catalogVisible,
      to: true,
    }
  }

  return changes
}

async function applyOneUpdate(
  prisma: Awaited<typeof import('@/lib/prisma')>['prisma'],
  action: AdminCatalogAction,
  item: AdminCatalogValidateItem,
): Promise<AdminCatalogBulkItem> {
  const base = {
    id: item.id,
    sku: item.sku,
    title: item.title,
    warnings: item.warnings,
  }

  if (item.status === 'failed') {
    return {
      ...base,
      status: 'failed',
      errors: item.errors,
      changes: {},
    }
  }

  if (item.status === 'skipped') {
    return {
      ...base,
      status: 'skipped',
      errors: [],
      changes: {},
    }
  }

  // ready | warning → aplicar
  const data = buildDataFromValidated(action, item)
  if (!data) {
    return {
      ...base,
      status: 'skipped',
      errors: [],
      changes: {},
    }
  }

  try {
    await prisma.product.update({
      where: { id: item.id },
      data,
      select: { id: true },
    })

    return {
      ...base,
      status: 'updated',
      errors: [],
      changes: buildChanges(action, item, data),
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Error al actualizar producto'
    const isUnique =
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'

    return {
      ...base,
      status: 'failed',
      errors: [
        isUnique
          ? 'Conflicto de slug único al guardar (otro producto lo tomó)'
          : message,
      ],
      changes: {},
    }
  }
}

function buildBulkSummary(
  items: AdminCatalogBulkItem[],
): AdminCatalogBulkResult['summary'] {
  const summary = {
    total: items.length,
    updated: 0,
    failed: 0,
    skipped: 0,
    warnings: 0,
  }
  for (const item of items) {
    if (item.status === 'updated') summary.updated += 1
    else if (item.status === 'failed') summary.failed += 1
    else if (item.status === 'skipped') summary.skipped += 1
    if (item.warnings.length > 0) summary.warnings += 1
  }
  return summary
}

/**
 * Valida y aplica acciones masivas. No aborta el lote ante fallos parciales.
 */
export async function bulkAdminCatalogProducts(
  input: AdminCatalogValidateInput,
): Promise<AdminCatalogBulkResult> {
  return withPerf(
    'admin.catalog.bulk',
    async () => {
      const validation = await withPerf(
        'admin.catalog.bulk.validate',
        () => validateAdminCatalogProducts(input),
        (r) => r.items.length,
      )

      const { prisma } = await import('@/lib/prisma')

      const items = await withPerf(
        'admin.catalog.bulk.update',
        async () => {
          const out: AdminCatalogBulkItem[] = []
          for (const item of validation.items) {
            out.push(await applyOneUpdate(prisma, input.action, item))
          }
          return out
        },
        (rows) => rows.filter((r) => r.status === 'updated').length,
      )

      const updatedSlugs: string[] = []
      for (const item of items) {
        if (item.status !== 'updated') continue
        const toSlug = item.changes.slug?.to
        if (typeof toSlug === 'string' && toSlug) updatedSlugs.push(toSlug)
        // También revalidar slug anterior si cambió
        const fromSlug = item.changes.slug?.from
        if (typeof fromSlug === 'string' && fromSlug) updatedSlugs.push(fromSlug)
        // Si solo cambió visibilidad/featured, el listado usa slug actual
        if (!item.changes.slug) {
          const validated = validation.items.find((v) => v.id === item.id)
          if (validated?.current.slug) updatedSlugs.push(validated.current.slug)
          if (validated?.proposed.slug) updatedSlugs.push(validated.proposed.slug)
        }
      }

      if (items.some((i) => i.status === 'updated')) {
        revalidateCatalogPublicCache({ slugs: updatedSlugs })
      }

      return {
        action: input.action,
        summary: buildBulkSummary(items),
        items,
      }
    },
    (result) => result.summary.updated,
  )
}
