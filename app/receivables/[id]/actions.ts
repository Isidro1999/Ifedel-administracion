'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export type RegisterPaymentResult =
  | { success: true; newBalance: number; newStatus: string }
  | { success: false; error: string }

export async function registerReceivablePayment(
  receivableId: number,
  amount: number,
  paidAt?: Date | string,
  reference?: string | null,
  notes?: string | null
): Promise<RegisterPaymentResult> {
  const session = await auth()
  const userId = (session?.user as { id?: string } | null)?.id ?? null

  const receivable = await prisma.receivable.findUnique({
    where: { id: receivableId },
  })

  if (!receivable) {
    return { success: false, error: 'Cuenta por cobrar no encontrada.' }
  }

  if (receivable.status === 'CANCELLED') {
    return {
      success: false,
      error: 'No se pueden registrar cobros en una cuenta por cobrar anulada.',
    }
  }

  const amountRounded = round2(Number(amount))
  if (!Number.isFinite(amountRounded) || amountRounded <= 0) {
    return { success: false, error: 'El monto debe ser mayor a cero.' }
  }

  const balance = round2(receivable.balance)
  if (amountRounded > balance) {
    return {
      success: false,
      error: `El monto no puede superar el saldo pendiente (${balance.toFixed(2)} ARS).`,
    }
  }

  if (balance <= 0) {
    return {
      success: false,
      error: 'Esta cuenta por cobrar ya está saldada.',
    }
  }

  const paidAtDate = paidAt
    ? typeof paidAt === 'string'
      ? new Date(paidAt)
      : paidAt
    : new Date()
  if (!Number.isFinite(paidAtDate.getTime())) {
    return { success: false, error: 'Fecha de cobro inválida.' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const newAmountPaid = round2(receivable.amountPaid + amountRounded)
    const newBalance = round2(receivable.totalAmount - newAmountPaid)
    const newStatus =
      newBalance <= 0 || newAmountPaid >= receivable.totalAmount
        ? 'PAID'
        : 'PARTIAL'

    await tx.receivablePayment.create({
      data: {
        receivableId,
        amount: amountRounded,
        paidAt: paidAtDate,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        createdByUserId: userId,
      },
    })

    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance >= 0 ? newBalance : 0,
        status: newStatus,
      },
    })

    return { newBalance: newBalance >= 0 ? newBalance : 0, newStatus }
  })

  revalidatePath(`/receivables/${receivableId}`)
  revalidatePath('/receivables')

  return {
    success: true,
    newBalance: result.newBalance,
    newStatus: result.newStatus,
  }
}
