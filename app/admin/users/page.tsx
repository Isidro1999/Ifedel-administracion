import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { UserActions } from './UserActions'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

export default async function AdminUsersPage() {
  const session = await auth()
  if (session?.user?.role !== 'ADMIN') {
    redirect('/')
  }

  const [pending, approved] = await Promise.all([
    prisma.user.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    }),
    prisma.user.findMany({
      where: { status: 'APPROVED' },
      orderBy: { approvedAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        approvedAt: true,
      },
    }),
  ])

  const pendingTable = (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-3 text-left font-semibold text-gray-700">
            Nombre / Email
          </th>
          <th className="p-3 text-left font-semibold text-gray-700">
            Fecha
          </th>
          <th className="p-3 text-right font-semibold text-gray-700">
            Acciones
          </th>
        </tr>
      </thead>
      <tbody>
        {pending.map((u) => (
          <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
            <td className="p-3">
              <div className="font-medium text-ifedel-black">
                {u.name || '—'}
              </div>
              <div className="text-gray-500">{u.email || '—'}</div>
            </td>
            <td className="p-3 text-gray-500">
              {u.createdAt
                ? new Date(u.createdAt).toLocaleDateString('es-AR')
                : '—'}
            </td>
            <td className="p-3 text-right">
              <UserActions userId={u.id} status="PENDING" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  const approvedTable = (
    <table className="w-full text-sm">
      <thead className="bg-gray-50">
        <tr>
          <th className="p-3 text-left font-semibold text-gray-700">
            Nombre / Email
          </th>
          <th className="p-3 text-left font-semibold text-gray-700">
            Rol
          </th>
          <th className="p-3 text-left font-semibold text-gray-700">
            Aprobado el
          </th>
        </tr>
      </thead>
      <tbody>
        {approved.map((u) => (
          <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
            <td className="p-3">
              <div className="font-medium text-ifedel-black">
                {u.name || '—'}
              </div>
              <div className="text-gray-500">{u.email || '—'}</div>
            </td>
            <td className="p-3">
              <span
                className={
                  u.role === 'ADMIN'
                    ? 'font-medium text-purple-600'
                    : 'text-gray-700'
                }
              >
                {u.role}
              </span>
            </td>
            <td className="p-3 text-gray-500">
              {u.approvedAt
                ? new Date(u.approvedAt).toLocaleDateString('es-AR')
                : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administración de usuarios"
        description="Aprobá o rechazá usuarios que solicitan acceso y revisá los usuarios ya aprobados."
        actions={
          <Link
            href="/"
            className="text-sm font-medium text-ifedel-primary hover:underline"
          >
            Volver al inicio
          </Link>
        }
      />

      <SectionCard
        title={`Pendientes de aprobación (${pending.length})`}
        description="Usuarios que solicitaron acceso y aún no fueron aprobados."
      >
        {pending.length === 0 ? (
          <p className="text-sm text-gray-600">
            No hay usuarios pendientes de aprobación.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            {pendingTable}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title={`Usuarios aprobados (${approved.length})`}
        description="Listado de usuarios con acceso aprobado al sistema."
      >
        {approved.length === 0 ? (
          <p className="text-sm text-gray-600">
            Todavía no hay usuarios aprobados.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-gray-200 bg-white">
            {approvedTable}
          </div>
        )}
      </SectionCard>
    </div>
  )
}

