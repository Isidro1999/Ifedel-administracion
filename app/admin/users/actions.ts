'use server'

import { revalidatePath } from 'next/cache'

export async function approveUser(userId: string) {
  const [{ prisma }, { auth }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/auth'),
  ])
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'No autorizado' }
  }
  await prisma.user.update({
    where: { id: userId },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: session.user.id,
    },
  })
  revalidatePath('/admin/users')
  return { success: true }
}

export async function rejectUser(userId: string) {
  const [{ prisma }, { auth }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/auth'),
  ])
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    return { error: 'No autorizado' }
  }
  await prisma.user.update({
    where: { id: userId },
    data: { status: 'REJECTED' },
  })
  revalidatePath('/admin/users')
  return { success: true }
}
