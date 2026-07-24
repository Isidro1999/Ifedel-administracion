'use server'

import { revalidatePath } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { requireApprovedAction } from '@/lib/session-auth'

export type RegisterCashOutResult =
  | { success: true }
  | { success: false; error: string }

export async function registerCashOut(params: {
  amount: number
  occurredAt?: string
  concept: string
  category?: string
}): Promise<RegisterCashOutResult> {
  const gate = await requireApprovedAction()
  if (!gate.ok) {
    return { success: false, error: gate.error }
  }
  const userId = gate.userId

  const rawAmount = Number(params.amount)
  if (!Number.isFinite(rawAmount) || rawAmount <= 0) {
    return { success: false, error: 'El monto debe ser mayor a cero.' }
  }

  const concept = params.concept?.trim()
  if (!concept) {
    return { success: false, error: 'El concepto es obligatorio.' }
  }

  const occurredAt =
    params.occurredAt && params.occurredAt.length > 0
      ? new Date(params.occurredAt)
      : new Date()
  if (!Number.isFinite(occurredAt.getTime())) {
    return { success: false, error: 'La fecha es inválida.' }
  }

  await prisma.cashMovement.create({
    data: {
      type: 'OUT',
      amount: rawAmount,
      currency: 'ARS',
      occurredAt,
      concept,
      category: params.category?.trim() || null,
      createdByUserId: userId,
    },
  })

  revalidatePath('/cash')

  return { success: true }
}
