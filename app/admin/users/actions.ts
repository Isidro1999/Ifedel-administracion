'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminAction } from '@/lib/admin-auth'

export async function approveUser(userId: string) {
  const gate = await requireAdminAction()
  if (!gate.ok) {
    return { error: gate.error }
  }

  const { prisma } = await import('@/lib/prisma')
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: gate.userId,
    },
  })
  revalidatePath('/admin/users')
  return { success: true }
}

export async function rejectUser(userId: string) {
  const gate = await requireAdminAction()
  if (!gate.ok) {
    return { error: gate.error }
  }

  const { prisma } = await import('@/lib/prisma')
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'REJECTED' },
  })
  revalidatePath('/admin/users')
  return { success: true }
}
