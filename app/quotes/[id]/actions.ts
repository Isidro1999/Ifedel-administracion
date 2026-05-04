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

  if (quote.status === 'CANCELLED') {
    return { error: 'La cotización está cancelada y no puede convertirse en venta.' }
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
        paymentTermId: quote.paymentTermId,
        paymentTermCodeSnapshot: quote.paymentTermCodeSnapshot,
        paymentTermLabelSnapshot: quote.paymentTermLabelSnapshot,
        paymentTermInstallmentsRaw: quote.paymentTermInstallmentsRaw,
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
    const baseDueDate = new Date(issuedAt)
    baseDueDate.setDate(baseDueDate.getDate() + RECEIVABLE_DEFAULT_DUE_DAYS)

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

    // Determinar cuotas a partir de la condición de pago (snapshot) si existe
    type SnapshotInstallment = {
      order: number
      offsetDays: number
      percentage: number
      label?: string
    }

    let snapshotInstallments: SnapshotInstallment[] | null = null
    if (sale.paymentTermInstallmentsRaw) {
      try {
        const parsed = JSON.parse(
          sale.paymentTermInstallmentsRaw
        ) as SnapshotInstallment[]
        if (Array.isArray(parsed) && parsed.length > 0) {
          snapshotInstallments = parsed
        }
      } catch {
        snapshotInstallments = null
      }
    }

    if (!snapshotInstallments) {
      snapshotInstallments = [
        {
          order: 0,
          offsetDays: 0,
          percentage: 1,
        },
      ]
    }

    const normalized = snapshotInstallments
      .slice()
      .sort((a, b) => a.order - b.order)

    const amounts: number[] = []
    let accumulated = 0

    for (let i = 0; i < normalized.length; i += 1) {
      const inst = normalized[i]
      const rawAmount = totalAmountARS * inst.percentage
      const rounded =
        i === normalized.length - 1
          ? Number((totalAmountARS - accumulated).toFixed(2))
          : Number(rawAmount.toFixed(2))
      amounts.push(rounded)
      accumulated += rounded
    }

    const receivable = await tx.receivable.create({
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
        dueDate: new Date(baseDueDate),
        status: 'PENDING',
        installments: {
          create: normalized.map((inst, index) => {
            const days = typeof inst.offsetDays === 'number' ? inst.offsetDays : 0
            const dueDate = new Date(issuedAt)
            dueDate.setDate(dueDate.getDate() + days)
            const amount = amounts[index]
            return {
              order: inst.order ?? index,
              dueDate,
              amount,
              amountPaid: 0,
              balance: amount,
              status: 'PENDING',
              label: inst.label ?? null,
            }
          }),
        },
      },
      include: {
        installments: true,
      },
    })

    // Ajustar header (totales/saldo/estado/dueDate) según cuotas generadas
    if (normalized.length > 0 && receivable.installments.length > 0) {
      const lastInst = normalized[normalized.length - 1]
      const lastDue = new Date(issuedAt)
      const days = typeof lastInst.offsetDays === 'number' ? lastInst.offsetDays : 0
      lastDue.setDate(lastDue.getDate() + days)

      const totalInstallments = Number(
        receivable.installments
          .reduce((acc, inst) => acc + inst.amount, 0)
          .toFixed(2)
      )
      const totalPaid = Number(
        receivable.installments
          .reduce((acc, inst) => acc + inst.amountPaid, 0)
          .toFixed(2)
      )
      const totalBalance = Number(
        receivable.installments
          .reduce((acc, inst) => acc + inst.balance, 0)
          .toFixed(2)
      )
      const headerStatus =
        totalBalance <= 0 ? 'PAID' : totalPaid > 0 ? 'PARTIAL' : 'PENDING'

      await tx.receivable.update({
        where: { id: receivable.id },
        data: {
          totalAmount: totalInstallments,
          amountPaid: totalPaid,
          balance: totalBalance,
          status: headerStatus,
          dueDate: lastDue,
        },
      })
    }

    await tx.quote.update({
      where: { id: quote.id },
      data: { status: 'APPROVED' },
    })

    return { saleId: sale.id }
  })

  redirect(`/sales/${result.saleId}`)
}
