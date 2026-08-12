import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { effectiveCatalogPriceList, resolvePublicCatalogPrice } from '@/lib/catalog-public-price'
import {
  computeInquiryEstimatedTotals,
  snapshotInquiryLinePrice,
} from '@/lib/catalog-inquiry-totals'
import { getUsdArsRateSettings } from '@/lib/exchange-rate/get-usd-ars-rate'

/**
 * Genera el próximo referenceNumber IFD-000001 de forma atómica.
 * Usa UPDATE … RETURNING sobre commercial_inquiry_sequence.
 */
export async function nextCommercialInquiryReference(
  tx: Prisma.TransactionClient,
): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ nextValue: number }>>`
    UPDATE "commercial_inquiry_sequence"
    SET "nextValue" = "nextValue" + 1
    WHERE "id" = 1
    RETURNING ("nextValue" - 1) AS "nextValue"
  `

  const seq = rows[0]?.nextValue
  if (!seq || seq < 1) {
    throw new Error('No se pudo generar el número de consulta')
  }

  return `IFD-${String(seq).padStart(6, '0')}`
}

export type InquiryItemSnapshotInput = {
  productId: number
  quantity: number
  comment: string | null
}

export type PublicInquiryItemSnapshot = {
  productId: number
  sku: string
  title: string
  slug: string
  quantity: number
  comment: string | null
  unitPriceARS: number | null
  subtotalARS: number | null
  sortOrder: number
}

export type PublicInquirySnapshotsResult = {
  snapshots: PublicInquiryItemSnapshot[]
  estimatedProductsTotalARS: number
  pricedItemsCount: number
  unpricedItemsCount: number
}

/**
 * Valida productos públicos y arma snapshots desde DB (no confía en el cliente).
 * Recalcula precios públicos ARS vigentes al momento del envío.
 */
export async function buildPublicInquiryItemSnapshots(
  items: InquiryItemSnapshotInput[],
  tx: Prisma.TransactionClient = prisma,
): Promise<PublicInquirySnapshotsResult> {
  const uniqueIds = [...new Set(items.map((i) => i.productId))]

  const products = await tx.product.findMany({
    where: {
      id: { in: uniqueIds },
      isActive: true,
      catalogVisible: true,
    },
    select: {
      id: true,
      sku: true,
      title: true,
      publicTitle: true,
      slug: true,
      showPrice: true,
      catalogPriceList: true,
    },
  })

  if (products.length !== uniqueIds.length) {
    const found = new Set(products.map((p) => p.id))
    const missing = uniqueIds.filter((id) => !found.has(id))
    throw new InquiryProductsUnavailableError(missing)
  }

  const needPrice = products.filter((p) => p.showPrice)
  const priceRows =
    needPrice.length === 0
      ? []
      : await tx.productPrice.findMany({
          where: {
            OR: needPrice.map((p) => ({
              productId: p.id,
              priceList: effectiveCatalogPriceList(p.catalogPriceList),
            })),
          },
          orderBy: { createdAt: 'desc' },
          select: {
            productId: true,
            priceList: true,
            currency: true,
            netPrice: true,
            taxRate: true,
            validFrom: true,
            validTo: true,
            createdAt: true,
          },
        })

  const pricesByProduct = new Map<number, typeof priceRows>()
  for (const row of priceRows) {
    const list = pricesByProduct.get(row.productId) ?? []
    list.push(row)
    pricesByProduct.set(row.productId, list)
  }

  const { usdArsRate } = await getUsdArsRateSettings(tx)

  const byId = new Map(products.map((p) => [p.id, p]))
  const qtyById = new Map<number, { quantity: number; comment: string | null }>()

  for (const item of items) {
    const prev = qtyById.get(item.productId)
    if (prev) {
      qtyById.set(item.productId, {
        quantity: Math.min(999, prev.quantity + item.quantity),
        comment: item.comment ?? prev.comment,
      })
    } else {
      qtyById.set(item.productId, {
        quantity: item.quantity,
        comment: item.comment,
      })
    }
  }

  const snapshots = uniqueIds.map((id, index) => {
    const product = byId.get(id)!
    const meta = qtyById.get(id)!
    const resolved = resolvePublicCatalogPrice(
      {
        showPrice: product.showPrice,
        catalogPriceList: product.catalogPriceList,
        prices: pricesByProduct.get(id) ?? [],
      },
      usdArsRate,
    )
    const priced = snapshotInquiryLinePrice(
      meta.quantity,
      resolved.price?.amount ?? null,
    )

    return {
      productId: product.id,
      sku: product.sku,
      title: (product.publicTitle?.trim() || product.title).trim(),
      slug: product.slug,
      quantity: meta.quantity,
      comment: meta.comment,
      unitPriceARS: priced.unitPriceARS,
      subtotalARS: priced.subtotalARS,
      sortOrder: index,
    }
  })

  const totals = computeInquiryEstimatedTotals(
    snapshots.map((s) => ({
      unitPriceARS: s.unitPriceARS,
      quantity: s.quantity,
    })),
  )

  return {
    snapshots,
    estimatedProductsTotalARS: totals.estimatedProductsTotalARS,
    pricedItemsCount: totals.pricedItemsCount,
    unpricedItemsCount: totals.unpricedItemsCount,
  }
}

export class InquiryProductsUnavailableError extends Error {
  readonly missingIds: number[]

  constructor(missingIds: number[]) {
    super('Uno o más productos no están disponibles en el catálogo')
    this.name = 'InquiryProductsUnavailableError'
    this.missingIds = missingIds
  }
}
