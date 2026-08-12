/**
 * POST /api/catalog/products/prices
 *
 * Rehidrata precios públicos vigentes por IDs.
 * No cachea. No expone USD, costos ni Settings.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { CatalogProductPricesRequestSchema } from '@/lib/catalog-inquiry-schemas'
import {
  checkInquiryRateLimit,
  getClientIp,
} from '@/lib/catalog-inquiry-rate-limit'
import { getPublicCatalogPricesByProductIds } from '@/lib/catalog-queries'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = checkInquiryRateLimit(`prices:${ip}`)
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'Demasiadas consultas. Probá de nuevo en unos minutos.' },
      {
        status: 429,
        headers: { 'Retry-After': String(rate.retryAfterSec) },
      },
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido o no parseable' },
      { status: 400 },
    )
  }

  try {
    const payload = CatalogProductPricesRequestSchema.parse(json)
    const items = await getPublicCatalogPricesByProductIds(payload.productIds)
    return NextResponse.json({ items })
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0]
      return NextResponse.json(
        {
          error: first?.message || 'Datos inválidos',
        },
        { status: 400 },
      )
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.products.prices]', error)
    }
    return NextResponse.json(
      { error: 'No pudimos obtener los precios.' },
      { status: 500 },
    )
  }
}
