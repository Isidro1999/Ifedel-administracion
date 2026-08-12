/**
 * POST /api/catalog/inquiries
 *
 * API PÚBLICA: crea una consulta comercial desde el catálogo.
 * Sin auth. No lista ni expone consultas existentes.
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { CreateCatalogInquirySchema } from '@/lib/catalog-inquiry-schemas'
import {
  checkInquiryRateLimit,
  getClientIp,
} from '@/lib/catalog-inquiry-rate-limit'
import { sendNewInquiryNotification } from '@/lib/catalog-inquiry-notify'
import {
  InquiryProductsUnavailableError,
  buildPublicInquiryItemSnapshots,
  nextCommercialInquiryReference,
} from '@/lib/catalog-inquiry-service'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rate = checkInquiryRateLimit(ip)
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

  let payload: ReturnType<typeof CreateCatalogInquirySchema.parse>
  try {
    payload = CreateCatalogInquirySchema.parse(json)
  } catch (error) {
    if (error instanceof ZodError) {
      const first = error.issues[0]
      return NextResponse.json(
        {
          error: first?.message || 'Datos inválidos',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      )
    }
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  }

  // Honeypot: respuesta genérica sin crear registro (no revelar el truco).
  if (payload.website) {
    return NextResponse.json({
      success: true,
      inquiry: { referenceNumber: 'IFD-000000' },
    })
  }

  const userAgent = request.headers.get('user-agent')?.slice(0, 300) ?? null

  try {
    const created = await prisma.$transaction(async (tx) => {
      const { snapshots, estimatedProductsTotalARS, pricedItemsCount, unpricedItemsCount } =
        await buildPublicInquiryItemSnapshots(payload.items, tx)
      const referenceNumber = await nextCommercialInquiryReference(tx)

      const inquiry = await tx.commercialInquiry.create({
        data: {
          referenceNumber,
          status: 'NEW',
          source: 'CATALOG_WEB',
          customerName: payload.customerName,
          companyName: payload.companyName,
          phone: payload.phone,
          email: payload.email,
          location: payload.location,
          clientType: payload.clientType,
          message: payload.message,
          deliveryAddress: payload.deliveryAddress,
          deliveryCity: payload.deliveryCity,
          deliveryProvince: payload.deliveryProvince,
          deliveryPostalCode: payload.deliveryPostalCode,
          deliveryNotes: payload.deliveryNotes,
          estimatedProductsTotalARS,
          pricedItemsCount,
          unpricedItemsCount,
          submitterIp: ip === 'unknown' ? null : ip,
          submitterUserAgent: userAgent,
          items: {
            create: snapshots.map((s) => ({
              productId: s.productId,
              sku: s.sku,
              title: s.title,
              slug: s.slug,
              quantity: s.quantity,
              comment: s.comment,
              unitPriceARS: s.unitPriceARS,
              subtotalARS: s.subtotalARS,
              sortOrder: s.sortOrder,
            })),
          },
        },
        select: {
          id: true,
          referenceNumber: true,
        },
      })

      return inquiry
    })

    // Notificación Brevo: secundaria. No hace rollback ni altera la respuesta.
    // Await con timeout interno para no cortar el envío en Vercel al responder.
    try {
      await sendNewInquiryNotification(created.id)
    } catch (notifyError) {
      console.warn(
        '[catalog.inquiries.notify] unexpected error after save',
        {
          inquiryId: created.id,
          referenceNumber: created.referenceNumber,
          detail:
            notifyError instanceof Error
              ? notifyError.message.slice(0, 200)
              : 'unknown_error',
        },
      )
    }

    return NextResponse.json({
      success: true,
      inquiry: {
        referenceNumber: created.referenceNumber,
      },
    })
  } catch (error) {
    if (error instanceof InquiryProductsUnavailableError) {
      return NextResponse.json(
        {
          error:
            'Uno o más productos ya no están disponibles en el catálogo. Revisá tu lista e intentá de nuevo.',
        },
        { status: 400 },
      )
    }

    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.inquiries]', error)
    }

    return NextResponse.json(
      { error: 'No pudimos registrar tu consulta. Intentá de nuevo.' },
      { status: 500 },
    )
  }
}
