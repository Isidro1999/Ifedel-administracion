import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type ApprovedUser = {
  userId: string
  role: string
  status: string
}

export type RequireApprovedResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse }

const NO_STORE = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
} as const

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE })
}

async function readSessionUser(): Promise<{
  userId: string | null
  role: string
  status: string | null
  authenticated: boolean
}> {
  const session = await auth()
  const user = session?.user
  if (!user) {
    return { userId: null, role: 'USER', status: null, authenticated: false }
  }
  const userId = (user as { id?: string }).id ?? null
  const role = (user as { role?: string }).role ?? 'USER'
  const status = (user as { status?: string }).status ?? null
  return { userId, role, status, authenticated: true }
}

/**
 * Valida sesión NextAuth: usuario autenticado y APPROVED.
 * Usar en Route Handlers internos (ej. /api/products*).
 */
export async function requireApprovedSession(): Promise<RequireApprovedResult> {
  const { userId, role, status, authenticated } = await readSessionUser()

  if (!authenticated || !userId) {
    return { ok: false, response: jsonError('No autenticado', 401) }
  }

  if (status !== 'APPROVED') {
    return { ok: false, response: jsonError('Cuenta no aprobada', 403) }
  }

  return { ok: true, userId, role }
}

/** Headers anti-caché para respuestas autenticadas con datos internos. */
export function privateApiHeaders(): Record<string, string> {
  return { ...NO_STORE }
}

/**
 * Para Server Components / layouts del backoffice.
 * Sin sesión → /login. Autenticado pero no APPROVED → /pending.
 */
export async function requireApprovedPage(): Promise<ApprovedUser> {
  const { userId, role, status, authenticated } = await readSessionUser()

  if (!authenticated || !userId) {
    redirect('/login')
  }

  if (status !== 'APPROVED') {
    redirect('/pending')
  }

  return { userId, role, status: status! }
}

/**
 * Para server actions. No toca DB; el caller debe abortar si ok=false.
 */
export async function requireApprovedAction(): Promise<
  | { ok: true; userId: string; role: string }
  | { ok: false; error: string }
> {
  const { userId, role, status, authenticated } = await readSessionUser()

  if (!authenticated || !userId) {
    return { ok: false, error: 'No autenticado' }
  }

  if (status !== 'APPROVED') {
    return { ok: false, error: 'Cuenta no aprobada' }
  }

  return { ok: true, userId, role }
}
