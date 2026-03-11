'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { RECEIVABLE_DEFAULT_DUE_DAYS } from '@/lib/receivable-config'

export async function convertQuoteToSale(quoteId: number) {
  const session = await auth()
  const userId = (session?.user as { id?: string } | null)?.id ?? null

  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { items: { orderBy: { sortOrder: 'asc' } }, sale: true },
  })

  if (!quote) {
    return { error: 'Cotización no encontrada' }
  }

  if (quote.sale) {
    return { error: 'Esta cotización ya fue convertida en venta' }
  }

  if (quote.items.length === 0) {
    return { error: 'La cotización no tiene ítems para convertir en venta' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const year = new Date().getFullYear()
    const prefix = `S-${year}-`
    const count = await tx.sale.count({
      where: { saleNumber: { startsWith: prefix } },
    })
    const saleNumber = `${prefix}${(count + 1).toString().padStart(4, '0')}`

    const sale = await tx.sale.create({
      data: {
        saleNumber,
        status: 'CONFIRMED',
        quoteId: quote.id,
        customerId: quote.customerId,
        customerName: quote.customerName,
        customerCompany: quote.customerCompany,
        customerEmail: quote.customerEmail,
        customerPhone: quote.customerPhone,
        currency: quote.currency,
        exchangeRateARS: quote.exchangeRateARS,
        discountPct: quote.discountPct,
        subtotal: quote.subtotal,
        taxAmount: quote.taxAmount,
        total: quote.total,
        discountAmount: quote.discountAmount,
        totalWithDiscount: quote.totalWithDiscount,
        totalARS: quote.totalARS,
        notes: quote.notes,
        issuedAt: quote.issuedAt,
        createdByUserId: userId,
        items: {
          create: quote.items.map((item, index) => ({
            productId: item.productId,
            sku: item.sku,
            title: item.title,
            description: item.description,
            imageUrl: item.imageUrl,
            currency: item.currency,
            unitPrice: item.unitPrice,
            taxRate: item.taxRate,
            qty: item.qty,
            subtotal: item.subtotal,
            taxAmount: item.taxAmount,
            total: item.total,
            sortOrder: index,
          })),
        },
      },
    })

    const issuedAt =
      quote.issuedAt instanceof Date
        ? quote.issuedAt
        : new Date(quote.issuedAt as string | number)
    const dueDate = new Date(issuedAt)
    dueDate.setDate(dueDate.getDate() + RECEIVABLE_DEFAULT_DUE_DAYS)

    // Determinar el monto exigible en ARS de forma robusta
    let totalAmountARS = sale.totalARS
    const rate = sale.exchangeRateARS
    if (totalAmountARS == null || !Number.isFinite(totalAmountARS)) {
      if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
        totalAmountARS = sale.totalWithDiscount * rate
      } else {
        // Fallback: asumimos que totalWithDiscount ya está en ARS
        totalAmountARS = sale.totalWithDiscount
      }
    }

    await tx.receivable.create({
      data: {
        saleId: sale.id,
        customerId: quote.customerId,
        customerName: quote.customerName ?? null,
        customerCompany: quote.customerCompany ?? null,
        totalAmount: totalAmountARS,
        currency: 'ARS',
        amountPaid: 0,
        balance: totalAmountARS,
        issuedAt: quote.issuedAt,
        dueDate,
        status: 'PENDING',
      },
    })

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: 'APPROVED' },
    })

    return { saleId: sale.id }
  })

  redirect(`/sales/${result.saleId}`)
}
