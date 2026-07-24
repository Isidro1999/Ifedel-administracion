import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export type RequireApprovedResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse }

const NO_STORE = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
} as const

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE })
}

/**
 * Valida sesión NextAuth: usuario autenticado y APPROVED.
 * Usar en rutas internas (ej. /api/products*). Fail-closed: sin sesión → 401/403.
 * Nunca es bypass por flags de catálogo (esos solo afectan layout UI).
 */
export async function requireApprovedSession(): Promise<RequireApprovedResult> {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return { ok: false, response: jsonError('No autenticado', 401) }
  }

  const status = (user as { status?: string }).status
  const role = (user as { role?: string }).role ?? 'USER'
  const userId = (user as { id?: string }).id

  if (!userId) {
    return { ok: false, response: jsonError('Sesión inválida', 401) }
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
