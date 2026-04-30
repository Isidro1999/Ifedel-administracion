'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef, type ReactNode } from 'react'
import type { Session } from 'next-auth'
import { SessionProvider, useSession } from 'next-auth/react'
import { UserProvider } from '@/components/layout/UserContext'

const PUBLIC_PATHS = ['/api/auth', '/pending', '/login']
const isPublicPath = (path: string) =>
  PUBLIC_PATHS.some((p) => path === p || path.startsWith(p + '/'))

const DEBUG_AUTH =
  typeof process !== 'undefined' &&
  process.env.NEXT_PUBLIC_DEBUG_AUTH === '1'

function authGuardLog(reason: string, data: Record<string, unknown>) {
  if (!DEBUG_AUTH) return
  console.info('[AuthGuard]', reason, data)
}

/**
 * Evita loops: nunca devolver /login como destino post-login.
 */
function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '/'
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/'
  if (decoded === '/login') return '/'
  if (decoded.startsWith('/login?') || decoded.startsWith('/login/')) return '/'
  return decoded
}

type AuthGuardProps = {
  session?: Session | null
  children: ReactNode
}

function AuthGateInner({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status: sessionStatus } = useSession()
  const redirectGuardRef = useRef<string | null>(null)

  const rawCallback = searchParams.get('callbackUrl')
  const safeCallback = sanitizeCallbackUrl(rawCallback)

  useEffect(() => {
    if (!pathname) return

    authGuardLog('tick', {
      sessionStatus,
      email: session?.user?.email ?? null,
      role: (session?.user as { role?: string } | undefined)?.role ?? null,
      status: (session?.user as { status?: string } | undefined)?.status ?? null,
      pathname,
      rawCallbackUrl: rawCallback,
      safeCallbackUrl: safeCallback,
    })

    if (sessionStatus === 'loading') {
      authGuardLog('skip: loading', {})
      return
    }

    // Sesión confirmada por NextAuth: no mandar a /login aunque session.user tarde un tick.
    if (sessionStatus === 'authenticated') {
      const user = session?.user
      const approval = (user as { status?: string } | undefined)?.status
      const role = (user as { role?: string } | undefined)?.role

      if (pathname === '/login') {
        if (!user) {
          authGuardLog('wait: authenticated on /login without user yet', {})
          return
        }
        if (approval === 'APPROVED') {
          const key = `login-approved:${safeCallback}`
          if (redirectGuardRef.current !== key) {
            redirectGuardRef.current = key
            authGuardLog('redirect: /login + APPROVED -> safeCallback', {
              to: safeCallback,
            })
            router.replace(safeCallback)
          }
          return
        }
        if (approval === 'PENDING' || approval === 'REJECTED') {
          const key = 'login-pending'
          if (redirectGuardRef.current !== key) {
            redirectGuardRef.current = key
            authGuardLog('redirect: /login + PENDING|REJECTED -> /pending', {})
            window.location.href = '/pending'
          }
          return
        }
        if (user && approval == null) {
          authGuardLog('wait: /login authenticated sin status en sesión', {})
          return
        }
      }

      if (user && approval && approval !== 'APPROVED') {
        if (pathname !== '/pending') {
          const key = 'not-approved'
          if (redirectGuardRef.current !== key) {
            redirectGuardRef.current = key
            authGuardLog('redirect: not APPROVED -> /pending', { approval })
            window.location.href = '/pending'
          }
        }
        return
      }

      if (user && approval === 'APPROVED' && pathname.startsWith('/admin') && role !== 'ADMIN') {
        const key = 'admin-deny'
        if (redirectGuardRef.current !== key) {
          redirectGuardRef.current = key
          authGuardLog('redirect: admin route without ADMIN -> /', {})
          router.replace('/')
        }
        return
      }

      return
    }

    // Solo con sesión explícitamente ausente vamos a login.
    if (sessionStatus === 'unauthenticated') {
      if (isPublicPath(pathname)) {
        authGuardLog('skip: unauthenticated on public path', { pathname })
        return
      }
      const targetPath = pathname || '/'
      const cb = sanitizeCallbackUrl(targetPath)
      const key = `to-login:${cb}`
      if (redirectGuardRef.current !== key) {
        redirectGuardRef.current = key
        authGuardLog('redirect: unauthenticated -> /login', {
          callbackUrl: cb,
        })
        const q = encodeURIComponent(cb)
        window.location.href = `/login?callbackUrl=${q}`
      }
      return
    }

    authGuardLog('skip: unexpected sessionStatus', { sessionStatus })
  }, [
    pathname,
    session,
    sessionStatus,
    router,
    rawCallback,
    safeCallback,
  ])

  if (sessionStatus === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Cargando sesión…</p>
      </div>
    )
  }

  if (isPublicPath(pathname)) {
    if (pathname === '/login' && sessionStatus === 'authenticated') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <p className="text-ifedel-brown">Redirigiendo…</p>
        </div>
      )
    }
    return <UserProvider user={session?.user ?? null}>{children}</UserProvider>
  }

  if (sessionStatus === 'unauthenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo a inicio de sesión…</p>
      </div>
    )
  }

  if (sessionStatus === 'authenticated' && !session?.user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Cargando sesión…</p>
      </div>
    )
  }

  const approvalStatus = (session!.user as { status?: string }).status
  const role = (session!.user as { role?: string }).role

  if (approvalStatus !== 'APPROVED') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo…</p>
      </div>
    )
  }

  if (pathname.startsWith('/admin') && role !== 'ADMIN') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-ifedel-brown">Redirigiendo…</p>
      </div>
    )
  }

  return <UserProvider user={session!.user}>{children}</UserProvider>
}

export function AuthGuard({ session = null, children }: AuthGuardProps) {
  return (
    <SessionProvider
      session={session}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      <AuthGateInner>{children}</AuthGateInner>
    </SessionProvider>
  )
}
