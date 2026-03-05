import { signIn } from '@/auth'

export const dynamic = 'force-dynamic'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>
}) {
  const { callbackUrl = '/' } = await searchParams

  async function signInWithGoogle(formData: FormData) {
    'use server'
    const url = (formData.get('callbackUrl') as string) || '/'
    await signIn('google', { redirectTo: url })
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-2 text-center text-xl font-semibold text-gray-900">
          Iniciar sesión
        </h1>
        <p className="mb-6 text-center text-sm text-gray-500">
          Usá tu cuenta de Google para acceder.
        </p>
        <form action={signInWithGoogle} className="flex flex-col gap-3">
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button
            type="submit"
            className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50"
          >
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  )
}
