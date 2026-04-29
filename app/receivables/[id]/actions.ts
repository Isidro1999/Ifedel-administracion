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
    let installments = await tx.receivableInstallment.findMany({
      where: { receivableId },
      orderBy: [{ dueDate: 'asc' }, { order: 'asc' }, { id: 'asc' }],
    })

    if (installments.length === 0) {
      // Backfill legacy receivables created before installments existed.
      await tx.receivableInstallment.create({
        data: {
          receivableId,
          order: 0,
          dueDate: receivable.dueDate,
          amount: receivable.totalAmount,
          amountPaid: receivable.amountPaid,
          balance: receivable.balance,
          status: receivable.status,
          label: 'Cuota única (legacy)',
        },
      })
      installments = await tx.receivableInstallment.findMany({
        where: { receivableId },
        orderBy: [{ dueDate: 'asc' }, { order: 'asc' }, { id: 'asc' }],
      })
    }

    let remaining = amountRounded
    for (const inst of installments) {
      if (remaining <= 0) break
      if (inst.status === 'PAID' || inst.balance <= 0) continue

      const applied = Math.min(remaining, inst.balance)
      const newAmountPaid = round2(inst.amountPaid + applied)
      const newBalance = round2(inst.amount - newAmountPaid)
      const newStatus = newBalance <= 0 ? 'PAID' : 'PARTIAL'

      await tx.receivableInstallment.update({
        where: { id: inst.id },
        data: {
          amountPaid: newAmountPaid,
          balance: newBalance <= 0 ? 0 : newBalance,
          status: newStatus,
        },
      })

      remaining = round2(remaining - applied)
    }

    if (remaining > 0) {
      return {
        success: false as const,
        error:
          'No se pudo imputar completamente el cobro en cuotas disponibles.',
      }
    }

    const payment = await tx.receivablePayment.create({
      data: {
        receivableId,
        amount: amountRounded,
        paidAt: paidAtDate,
        reference: reference?.trim() || null,
        notes: notes?.trim() || null,
        createdByUserId: userId,
      },
    })

    const refreshedInstallments = await tx.receivableInstallment.findMany({
      where: { receivableId },
    })

    const totalAmount = round2(
      refreshedInstallments.reduce((acc, inst) => acc + inst.amount, 0)
    )
    const totalAmountPaid = round2(
      refreshedInstallments.reduce((acc, inst) => acc + inst.amountPaid, 0)
    )
    const totalBalance = round2(
      refreshedInstallments.reduce((acc, inst) => acc + inst.balance, 0)
    )
    const newStatus =
      totalBalance <= 0
        ? 'PAID'
        : totalAmountPaid > 0
        ? 'PARTIAL'
        : 'PENDING'

    await tx.receivable.update({
      where: { id: receivableId },
      data: {
        totalAmount,
        amountPaid: totalAmountPaid,
        balance: totalBalance >= 0 ? totalBalance : 0,
        status: newStatus,
      },
    })

    // Movimiento de caja asociado (ingreso) - se crea sólo si aún no existe por seguridad.
    await tx.cashMovement.create({
      data: {
        type: 'IN',
        amount: amountRounded,
        currency: 'ARS',
        occurredAt: paidAtDate,
        concept: `Cobro cuenta por cobrar #${receivableId}`,
        category: 'COBRO_CLIENTE',
        receivablePaymentId: payment.id,
        createdByUserId: userId,
      },
    })

    return {
      success: true as const,
      newBalance: totalBalance >= 0 ? totalBalance : 0,
      newStatus,
    }
  })

  if (!result.success) {
    return { success: false, error: result.error }
  }

  revalidatePath(`/receivables/${receivableId}`)
  revalidatePath('/receivables')

  return {
    success: true,
    newBalance: result.newBalance,
    newStatus: result.newStatus,
  }
}
