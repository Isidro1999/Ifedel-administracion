'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import type { Session } from 'next-auth'
import { SessionProvider, useSession } from 'next-auth/react'
import { UserProvider } from '@/components/layout/UserContext'

const PUBLIC_PATHS = ['/api/auth', '/pending', '/login']
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))

type AuthGuardProps = {
  session?: Session | null
  children: ReactNode
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status: sessionStatus } = useSession()

  useEffect(() => {
    if (!pathname) return
    if (isPublicPath(pathname)) return

    if (!session?.user) {
      const callbackUrl = encodeURIComponent(pathname || '/')
      window.location.href = `/login?callbackUrl=${callbackUrl}`
      return
    }

    const status = (session.user as { status?: string }).status
    const role = (session.user as { role?: string }).role

    if (status !== 'APPROVED') {
      window.location.href = '/pending'
      return
    }

    if (pathname.startsWith('/admin') && role !== 'ADMIN') {
      router.replace('/')
    }
  }, [pathname, session, router])

  // En rutas públicas o si ya hay sesión válida, mostrar contenido
  if (isPublicPath(pathname)) {
    return <UserProvider user={session?.user ?? null}>{children}</UserProvider>
  }
  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Cargando sesión…</p>
      </div>
    )
  }
  if (!session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo a inicio de sesión…</p>
      </div>
    )
  }
  const approvalStatus = (session.user as { status?: string }).status
  const role = (session.user as { role?: string }).role
  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo…</p>
      </div>
    )
  }
  if (pathname?.startsWith('/admin') && role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo…</p>
      </div>
    )
  }

  return <UserProvider user={session.user}>{children}</UserProvider>
}

export function AuthGuard({ session = null, children }: AuthGuardProps) {
  return (
    <SessionProvider session={session}>
      <AuthGateInner>{children}</AuthGateInner>
    </SessionProvider>
  )
}
