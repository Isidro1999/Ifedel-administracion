import Link from 'next/link'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { UserActions } from './UserActions'

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
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left p-3">Nombre / Email</th>
          <th className="text-left p-3">Fecha</th>
          <th className="text-right p-3">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {pending.map((u) => (
          <tr key={u.id} className="border-t border-gray-100">
            <td className="p-3">
              <div className="font-medium">{u.name || '—'}</div>
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
      <thead className="bg-gray-100">
        <tr>
          <th className="text-left p-3">Nombre / Email</th>
          <th className="text-left p-3">Rol</th>
          <th className="text-left p-3">Aprobado el</th>
        </tr>
      </thead>
      <tbody>
        {approved.map((u) => (
          <tr key={u.id} className="border-t border-gray-100">
            <td className="p-3">
              <div className="font-medium">{u.name || '—'}</div>
              <div className="text-gray-500">{u.email || '—'}</div>
            </td>
            <td className="p-3">
              <span
                className={
                  u.role === 'ADMIN' ? 'text-purple-600 font-medium' : ''
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Administración de usuarios</h1>
          <Link href="/" className="text-sm text-ifedel-primary hover:underline font-medium">
            ← Volver al inicio
          </Link>
        </div>
        <section className="mb-8">
          <h2 className="text-lg font-semibold mb-3 text-amber-700">
            Pendientes de aprobación ({pending.length})
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {pending.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">
                No hay usuarios pendientes.
              </p>
            ) : (
              pendingTable
            )}
          </div>
        </section>
        <section>
          <h2 className="text-lg font-semibold mb-3 text-green-700">
            Usuarios aprobados ({approved.length})
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {approved.length === 0 ? (
              <p className="p-4 text-gray-500 text-sm">
                No hay usuarios aprobados aún.
              </p>
            ) : (
              approvedTable
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
