'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireApprovedAction } from '@/lib/session-auth'

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

export type RegisterPayablePaymentResult =
  | { success: true; newBalance: number; newStatus: string }
  | { success: false; error: string }

export async function registerPayablePayment(
  payableId: number,
  amount: number,
  paidAt?: Date | string,
  reference?: string | null,
  notes?: string | null
): Promise<RegisterPayablePaymentResult> {
  const gate = await requireApprovedAction()
  if (!gate.ok) {
    return { success: false, error: gate.error }
  }
  const userId = gate.userId

  const payable = await prisma.payable.findUnique({
    where: { id: payableId },
  })

  if (!payable) {
    return { success: false, error: 'Cuenta por pagar no encontrada.' }
  }

  if (payable.status === 'CANCELLED') {
    return {
      success: false,
      error: 'No se pueden registrar pagos en una cuenta por pagar anulada.',
    }
  }

  const amountRounded = round2(Number(amount))
  if (!Number.isFinite(amountRounded) || amountRounded <= 0) {
    return { success: false, error: 'El monto debe ser mayor a cero.' }
  }

  const balance = round2(payable.balance)
  if (amountRounded > balance) {
    return {
      success: false,
      error: `El monto no puede superar el saldo pendiente (${balance.toFixed(2)} ARS).`,
    }
  }

  if (balance <= 0) {
    return {
      success: false,
      error: 'Esta cuenta por pagar ya está saldada.',
    }
  }

  const paidAtDate = paidAt
    ? typeof paidAt === 'string'
      ? new Date(paidAt)
      : paidAt
    : new Date()
  if (!Number.isFinite(paidAtDate.getTime())) {
    return { success: false, error: 'Fecha de pago inválida.' }
  }

  const result = await prisma.$transaction(async (tx) => {
    const newAmountPaid = round2(payable.amountPaid + amountRounded)
    const newBalance = round2(payable.totalAmount - newAmountPaid)
    const newStatus =
      newBalance <= 0 || newAmountPaid >= payable.totalAmount
        ? 'PAID'
        : 'PARTIAL'

    await tx.payable.update({
      where: { id: payableId },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance >= 0 ? newBalance : 0,
        status: newStatus,
      },
    })

    await tx.cashMovement.create({
      data: {
        type: 'OUT',
        amount: amountRounded,
        currency: 'ARS',
        occurredAt: paidAtDate,
        concept: `Pago cuenta por pagar #${payableId}`,
        category: 'PAGO_PROVEEDOR',
        createdByUserId: userId,
      },
    })

    return { newBalance: newBalance >= 0 ? newBalance : 0, newStatus }
  })

  revalidatePath(`/payables/${payableId}`)
  revalidatePath('/payables')
  revalidatePath('/cash')
  revalidatePath('/finance')

  return {
    success: true,
    newBalance: result.newBalance,
    newStatus: result.newStatus,
  }
}

