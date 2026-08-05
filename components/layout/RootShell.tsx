'use client'

import { usePathname } from 'next/navigation'
import type { Session } from 'next-auth'
import type { ReactNode } from 'react'
import { AuthGuard } from '@/components/AuthGuard'
import { AppShell } from '@/components/layout/AppShell'

type RootShellProps = {
  session?: Session | null
  /** Host catálogo (ifedel.com / catalogo.localhost; middleware setea x-ifedel-catalog). */
  forceCatalog?: boolean
  children: ReactNode
}

/**
 * El catálogo público no usa AuthGuard ni AppShell interno.
 */
export function RootShell({
  session,
  forceCatalog = false,
  children,
}: RootShellProps) {
  const pathname = usePathname() ?? ''
  const isCatalogPath =
    pathname === '/catalogo' || pathname.startsWith('/catalogo/')
  const isCatalog = forceCatalog || isCatalogPath

  if (isCatalog) {
    return <>{children}</>
  }

  return (
    <AuthGuard session={session}>
      <AppShell>{children}</AppShell>
    </AuthGuard>
  )
}
