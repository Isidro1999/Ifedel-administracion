import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { auth } from '@/auth'
import { PAYABLE_DEFAULT_DUE_DAYS } from '@/lib/payable-config'

const PurchaseItemInputSchema = z.object({
  productId: z.number().int().positive().optional(),
  sku: z.string().min(1),
  title: z.string().min(1),
  unitCost: z.number().nonnegative(),
  taxRate: z.number(), // puede ser 0
  qty: z.number().int().positive(),
})

const SupplierInputSchema = z.object({
  name: z.string().trim().optional(),
  company: z.string().trim().optional(),
  email: z.string().email().optional(),
  phone: z.string().trim().optional(),
})

const PurchaseMetaInputSchema = z.object({
  currency: z.enum(['USD', 'ARS']).default('USD'),
  exchangeRateARS: z.number().positive().optional(),
  discountPct: z.number().min(0).max(100).default(0),
  issuedAt: z.string().optional(), // ISO date
})

const PurchasePayloadSchema = z.object({
  items: z.array(PurchaseItemInputSchema).min(1),
  supplier: SupplierInputSchema.default({}),
  meta: PurchaseMetaInputSchema,
  notes: z.string().trim().optional(),
})

type PurchasePayload = z.infer<typeof PurchasePayloadSchema>

function normalizeNumber(value: number | undefined, fallback: number): number {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function computePurchaseTotals(payload: PurchasePayload) {
  const currency = payload.meta.currency

  const subtotal = payload.items.reduce(
    (acc, item) => acc + item.unitCost * item.qty,
    0
  )

  const total = payload.items.reduce((acc, item) => {
    const lineBase = item.unitCost * item.qty
    return acc + lineBase * (1 + item.taxRate / 100)
  }, 0)

  const exchangeRate = normalizeNumber(payload.meta.exchangeRateARS, 1000)
  const discountPct = normalizeNumber(payload.meta.discountPct, 0)
  const clampedDiscountPct = Math.min(100, Math.max(0, discountPct))

  const discountAmount = total * (clampedDiscountPct / 100)
  const totalWithDiscount = total - discountAmount
  const totalARS =
    currency === 'ARS' ? totalWithDiscount : totalWithDiscount * exchangeRate

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

function computeLineTotals(item: z.infer<typeof PurchaseItemInputSchema>) {
  const subtotal = item.unitCost * item.qty
  const taxAmount = subtotal * (item.taxRate / 100)
  const total = subtotal + taxAmount
  return { subtotal, taxAmount, total }
}

function hasMeaningfulSupplierData(s: PurchasePayload['supplier']) {
  const hasName = !!s.name && s.name.trim().length > 0
  const hasCompany = !!s.company && s.company.trim().length > 0
  const hasEmail = !!s.email && s.email.trim().length > 0
  const hasPhone = !!s.phone && s.phone.trim().length > 0
  return hasName || hasCompany || hasEmail || hasPhone
}

async function getOrCreateSupplierId(
  payload: PurchasePayload,
  tx: Prisma.TransactionClient
): Promise<number | null> {
  const { supplier } = payload
  if (!hasMeaningfulSupplierData(supplier)) return null

  const email = supplier.email?.trim()
  const company = supplier.company?.trim()

  let existing = null

  if (email) {
    existing = await tx.supplier.findFirst({
      where: {
        email,
        ...(company ? { company } : {}),
      },
    })

    if (!existing && !company) {
      existing = await tx.supplier.findFirst({
        where: { email },
      })
    }
  }

  if (existing) {
    return existing.id
  }

  const created = await tx.supplier.create({
    data: {
      name: supplier.name?.trim() || null,
      company: supplier.company?.trim() || null,
      email: supplier.email?.trim() || null,
      phone: supplier.phone?.trim() || null,
      isActive: true,
    },
  })

  return created.id
}

async function generatePurchaseNumber(tx: Prisma.TransactionClient): Promise<string> {
  const year = new Date().getFullYear()
  const prefix = `P-${year}-`

  const count = await tx.purchase.count({
    where: {
      purchaseNumber: {
        startsWith: prefix,
      },
    },
  })

  const sequence = count + 1
  const seqStr = sequence.toString().padStart(4, '0')
  return `${prefix}${seqStr}`
}

export async function POST(request: NextRequest) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | null)?.id

  if (!userId) {
    return NextResponse.json(
      { error: 'No autenticado' },
      { status: 401 }
    )
  }

  let payload: PurchasePayload

  try {
    const json = await request.json()
    payload = PurchasePayloadSchema.parse(json)
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
      { error: 'La compra debe tener al menos un ítem' },
      { status: 400 }
    )
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const supplierId = await getOrCreateSupplierId(payload, tx)
      const totals = computePurchaseTotals(payload)

      const issuedAt =
        payload.meta.issuedAt && payload.meta.issuedAt.length > 0
          ? new Date(payload.meta.issuedAt)
          : new Date()
      if (!Number.isFinite(issuedAt.getTime())) {
        throw new Error('issuedAt inválido')
      }

      const dueDate = new Date(issuedAt)
      dueDate.setDate(dueDate.getDate() + PAYABLE_DEFAULT_DUE_DAYS)

      const purchaseNumber = await generatePurchaseNumber(tx)

      const created = await tx.purchase.create({
        data: {
          purchaseNumber,
          status: 'CONFIRMED',
          currency: totals.currency,
          exchangeRateARS: totals.exchangeRateARS,
          discountPct: totals.discountPct,
          subtotal: totals.subtotal,
          taxAmount: totals.total - totals.subtotal,
          total: totals.total,
          discountAmount: totals.discountAmount,
          totalWithDiscount: totals.totalWithDiscount,
          totalARS: totals.totalARS,

          issuedAt,
          notes: payload.notes?.trim() || null,

          supplierId,
          supplierName: payload.supplier.name?.trim() || null,
          supplierCompany: payload.supplier.company?.trim() || null,
          supplierEmail: payload.supplier.email?.trim() || null,
          supplierPhone: payload.supplier.phone?.trim() || null,

          createdByUserId: userId,

          items: {
            create: payload.items.map((item, index) => {
              const lineTotals = computeLineTotals(item)
              return {
                productId: item.productId,
                sku: item.sku,
                title: item.title,
                description: null,
                imageUrl: null,
                currency: totals.currency,
                unitCost: item.unitCost,
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

      // Crear cuenta por pagar en ARS
      const totalAmountARS =
        typeof totals.totalARS === 'number' && Number.isFinite(totals.totalARS)
          ? totals.totalARS
          : totals.totalWithDiscount

      await tx.payable.create({
        data: {
          purchaseId: created.id,
          supplierId,
          supplierName: created.supplierCompany || created.supplierName,
          supplierCompany: created.supplierCompany,
          totalAmount: totalAmountARS,
          currency: 'ARS',
          amountPaid: 0,
          balance: totalAmountARS,
          issuedAt,
          dueDate,
          status: 'PENDING',
        },
      })

      return {
        id: created.id,
        purchaseNumber: created.purchaseNumber,
      }
    })

    const response = NextResponse.json(
      {
        success: true,
        purchaseId: result.id,
        purchaseNumber: result.purchaseNumber,
      },
      { status: 201 }
    )
    revalidatePath('/purchases')
    revalidatePath('/payables')
    return response
  } catch (error: any) {
    console.error('Error creando la compra:', error)
    return NextResponse.json(
      {
        error: 'Error al crear la compra',
        details: error?.message ?? 'Error desconocido',
      },
      { status: 500 }
    )
  }
}

