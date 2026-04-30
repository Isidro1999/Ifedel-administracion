export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PendingPage() {
  const { auth, signOut } = await import('@/auth')
  const session = await auth()

  async function handleSignOut() {
    'use server'
    await signOut({ redirectTo: '/' })
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8 text-center">
        <h1 className="text-xl font-semibold text-gray-800 mb-4">
          Cuenta pendiente de aprobación
        </h1>
        <p className="text-gray-600 mb-6">
          Tu cuenta fue creada pero está pendiente de aprobación por un
          administrador.
        </p>
        {session?.user?.email && (
          <p className="text-sm text-gray-500 mb-6">
            Conectado como: <strong>{session.user.email}</strong>
          </p>
        )}
        <form action={handleSignOut}>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-ifedel-primary border border-ifedel-primary rounded-md hover:opacity-90 transition"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  )
}
