import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import {
  getInitialQuoteExchangeRate,
  InvalidQuoteExchangeRateError,
} from '@/lib/exchange-rate/get-initial-quote-exchange-rate'
import {
  computeQuoteLineTotals,
  computeQuoteTotals,
} from '@/lib/quotes/quote-totals'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const QuoteItemInputSchema = z.object({
  productId: z.number().int().positive(),
  sku: z.string().min(1),
  title: z.string().min(1),
  unitPriceUSD: z.number().nonnegative(),
  taxRate: z.number(), // puede ser 0
  qty: z.number().int().positive(),
  imageUrl: z.string().min(1).optional(),
})

const QuoteClientInputSchema = z.object({
  name: z.string().trim().optional(),
  company: z.string().trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().optional(),
})

/**
 * exchangeRateARS del cliente es opcional e IGNORADO en creación.
 * El snapshot se toma server-side desde Settings justo antes del create.
 */
const QuoteMetaInputSchema = z.object({
  validityDays: z.number().int().positive().default(7),
  exchangeRateARS: z.number().positive().optional(),
  discountPct: z.number().min(0).max(100).default(0),
  paymentTermCode: z.string().trim().min(1).default('CONTADO'),
})

const QuotePayloadSchema = z.object({
  items: z.array(QuoteItemInputSchema).min(1),
  client: QuoteClientInputSchema.default({}),
  meta: QuoteMetaInputSchema,
})

type QuotePayload = z.infer<typeof QuotePayloadSchema>

function hasMeaningfulClientData(client: QuotePayload['client']) {
  const hasName = !!client.name && client.name.trim().length > 0
  const hasCompany = !!client.company && client.company.trim().length > 0
  const hasEmail = !!client.email && client.email.trim().length > 0
  const hasPhone = !!client.phone && client.phone.trim().length > 0
  return hasName || hasCompany || hasEmail || hasPhone
}

async function getOrCreateCustomerId(
  payload: QuotePayload,
  tx: Prisma.TransactionClient,
): Promise<number | null> {
  const { client } = payload
  if (!hasMeaningfulClientData(client)) return null

  const email = client.email?.trim()
  const company = client.company?.trim()

  let existing = null

  if (email) {
    existing = await tx.customer.findFirst({
      where: {
        email,
        ...(company ? { company } : {}),
      },
    })

    if (!existing && !company) {
      existing = await tx.customer.findFirst({
        where: { email },
      })
    }
  }

  if (existing) {
    return existing.id
  }

  const created = await tx.customer.create({
    data: {
      name: client.name?.trim() || null,
      company: company || null,
      email: email || null,
      phone: client.phone?.trim() || null,
      isActive: true,
    },
  })

  return created.id
}

async function resolvePaymentTermForQuote(
  payload: QuotePayload,
  tx: Prisma.TransactionClient,
) {
  const code = payload.meta.paymentTermCode?.trim() || 'CONTADO'

  const term = await tx.paymentTerm.findFirst({
    where: {
      code,
      isActive: true,
    },
    include: {
      installments: {
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!term) {
    const fallback = await tx.paymentTerm.findFirst({
      where: { isDefault: true, isActive: true },
      include: { installments: { orderBy: { order: 'asc' } } },
    })
    if (!fallback) {
      return {
        paymentTermId: null as number | null,
        paymentTermCodeSnapshot: null as string | null,
        paymentTermLabelSnapshot: null as string | null,
        paymentTermInstallmentsRaw: null as string | null,
      }
    }
    return {
      paymentTermId: fallback.id,
      paymentTermCodeSnapshot: fallback.code,
      paymentTermLabelSnapshot: fallback.label,
      paymentTermInstallmentsRaw: JSON.stringify(
        fallback.installments.map((inst) => ({
          order: inst.order,
          offsetDays: inst.offsetDays,
          percentage: inst.percentage,
        })),
      ),
    }
  }

  return {
    paymentTermId: term.id,
    paymentTermCodeSnapshot: term.code,
    paymentTermLabelSnapshot: term.label,
    paymentTermInstallmentsRaw: JSON.stringify(
      term.installments.map((inst) => ({
        order: inst.order,
        offsetDays: inst.offsetDays,
        percentage: inst.percentage,
      })),
    ),
  }
}

async function generateQuoteNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `Q-${year}-`

  const count = await tx.quote.count({
    where: {
      quoteNumber: {
        startsWith: prefix,
      },
    },
  })

  const sequence = count + 1
  const seqStr = sequence.toString().padStart(4, '0')
  return `${prefix}${seqStr}`
}

/**
 * Crea Quote con snapshot de Settings.usdArsRate (server-side).
 * Ignora meta.exchangeRateARS del cliente.
 */
export async function POST(request: NextRequest) {
  const [{ prisma }, { requireApprovedSession }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/session-auth'),
  ])
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response
  const userId = gate.userId

  let payload: QuotePayload

  try {
    const json = await request.json()
    payload = QuotePayloadSchema.parse(json)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Payload inválido',
          details: error.issues.map((i) => ({
            path: i.path.join('.'),
            message: i.message,
          })),
        },
        { status: 400 },
      )
    }

    return NextResponse.json(
      { error: 'Body inválido o no parseable' },
      { status: 400 },
    )
  }

  if (payload.items.length === 0) {
    return NextResponse.json(
      { error: 'La cotización no tiene ítems' },
      { status: 400 },
    )
  }

  let exchangeRateARS: number
  try {
    // Snapshot inmediatamente antes de crear (no el valor del cliente).
    exchangeRateARS = await getInitialQuoteExchangeRate()
  } catch (error) {
    if (error instanceof InvalidQuoteExchangeRateError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    throw error
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customerId = await getOrCreateCustomerId(payload, tx)

      const totals = computeQuoteTotals({
        items: payload.items,
        discountPct: payload.meta.discountPct,
        exchangeRateARS,
      })

      const now = new Date()
      const validityDays =
        payload.meta.validityDays > 0 ? payload.meta.validityDays : 7
      const expiresAt = new Date(
        now.getTime() + validityDays * 24 * 60 * 60 * 1000,
      )

      const quoteNumber = await generateQuoteNumber(tx)

      const paymentTermData = await resolvePaymentTermForQuote(payload, tx)

      const created = await tx.quote.create({
        data: {
          quoteNumber,
          status: 'SAVED',
          currency: totals.currency,
          exchangeRateARS: totals.exchangeRateARS,
          validityDays,
          discountPct: totals.discountPct,
          subtotal: totals.subtotal,
          taxAmount: totals.total - totals.subtotal,
          total: totals.total,
          discountAmount: totals.discountAmount,
          totalWithDiscount: totals.totalWithDiscount,
          totalARS: totals.totalARS,

          issuedAt: now,
          createdAt: now,
          expiresAt,

          notes: null,

          customerId,
          customerName: payload.client.name?.trim() || null,
          customerCompany: payload.client.company?.trim() || null,
          customerEmail: payload.client.email?.trim() || null,
          customerPhone: payload.client.phone?.trim() || null,

          createdByUserId: userId,

          paymentTermId: paymentTermData.paymentTermId,
          paymentTermCodeSnapshot: paymentTermData.paymentTermCodeSnapshot,
          paymentTermLabelSnapshot: paymentTermData.paymentTermLabelSnapshot,
          paymentTermInstallmentsRaw:
            paymentTermData.paymentTermInstallmentsRaw,

          items: {
            create: payload.items.map((item, index) => {
              const lineTotals = computeQuoteLineTotals(item)
              return {
                productId: item.productId,
                sku: item.sku,
                title: item.title,
                description: null,
                imageUrl: item.imageUrl ?? null,
                currency: totals.currency,
                unitPrice: item.unitPriceUSD,
                taxRate: item.taxRate,
                qty: item.qty,
                subtotal: lineTotals.subtotal,
                taxAmount: lineTotals.taxAmount,
                total: lineTotals.total,
                sortOrder: index,
              }
            }),
          },
        },
      })

      return {
        id: created.id,
        quoteNumber: created.quoteNumber,
        exchangeRateARS: created.exchangeRateARS,
      }
    })

    const response = NextResponse.json(
      {
        success: true,
        quoteId: result.id,
        quoteNumber: result.quoteNumber,
        exchangeRateARS: result.exchangeRateARS,
      },
      { status: 201 },
    )

    revalidatePath('/quotes')
    return response
  } catch (error: unknown) {
    console.error('Error creando la cotización:', error)
    const message =
      error instanceof Error ? error.message : 'Error desconocido'
    return NextResponse.json(
      {
        error: 'Error al crear la cotización',
        details: message,
      },
      { status: 500 },
    )
  }
}
