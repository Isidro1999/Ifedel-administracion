import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

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

const QuoteMetaInputSchema = z.object({
  validityDays: z.number().int().positive().default(7),
  exchangeRateARS: z.number().positive(),
  discountPct: z.number().min(0).max(100).default(0),
  paymentTermCode: z.string().trim().min(1).default('CONTADO'),
})

const QuotePayloadSchema = z.object({
  items: z.array(QuoteItemInputSchema).min(1),
  client: QuoteClientInputSchema.default({}),
  meta: QuoteMetaInputSchema,
})

type QuotePayload = z.infer<typeof QuotePayloadSchema>

function normalizeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function computeTotals(payload: QuotePayload) {
  const currency = 'USD'

  const subtotal = payload.items.reduce(
    (acc, item) => acc + item.unitPriceUSD * item.qty,
    0
  )

  const total = payload.items.reduce((acc, item) => {
    const lineBase = item.unitPriceUSD * item.qty
    return acc + lineBase * (1 + item.taxRate / 100)
  }, 0)

  const exchangeRate = normalizeNumber(payload.meta.exchangeRateARS, 1000)
  const discountPct = normalizeNumber(payload.meta.discountPct, 0)
  const clampedDiscountPct = Math.min(100, Math.max(0, discountPct))

  const discountAmount = total * (clampedDiscountPct / 100)
  const totalWithDiscount = total - discountAmount
  const totalARS = totalWithDiscount * exchangeRate

  return {
    currency,
    subtotal,
    total,
    discountPct: clampedDiscountPct,
    discountAmount,
    totalWithDiscount,
    totalARS,
    exchangeRateARS: exchangeRate,
  }
}

function computeLineTotals(item: z.infer<typeof QuoteItemInputSchema>) {
  const subtotal = item.unitPriceUSD * item.qty
  const taxAmount = subtotal * (item.taxRate / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

function hasMeaningfulClientData(client: QuotePayload['client']) {
  const hasName = !!client.name && client.name.trim().length > 0
  const hasCompany = !!client.company && client.company.trim().length > 0
  const hasEmail = !!client.email && client.email.trim().length > 0
  const hasPhone = !!client.phone && client.phone.trim().length > 0
  return hasName || hasCompany || hasEmail || hasPhone
}

async function getOrCreateCustomerId(
  payload: QuotePayload,
  tx: Prisma.TransactionClient
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
  tx: Prisma.TransactionClient
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
        }))
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
      }))
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
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Body inválido o no parseable' },
      { status: 400 }
    )
  }

  if (payload.items.length === 0) {
    return NextResponse.json(
      { error: 'La cotización no tiene ítems' },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const customerId = await getOrCreateCustomerId(payload, tx)

      const totals = computeTotals(payload)

      const now = new Date()
      const validityDays = payload.meta.validityDays > 0 ? payload.meta.validityDays : 7
      const expiresAt = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000)

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
              const lineTotals = computeLineTotals(item)
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
      }
    })

    const response = NextResponse.json(
      {
        success: true,
        quoteId: result.id,
        quoteNumber: result.quoteNumber,
      },
      { status: 201 }
    )

    revalidatePath('/quotes')
    return response
  } catch (error: any) {
    console.error('Error creando la cotización:', error)
    return NextResponse.json(
      {
        error: 'Error al crear la cotización',
        details: error?.message ?? 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

