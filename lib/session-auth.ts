import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export type RequireApprovedResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse }

/**
 * Valida sesión NextAuth: usuario autenticado y APPROVED.
 * Usar en rutas internas que no son estrictamente admin (ej. listado de productos).
 */
export async function requireApprovedSession(): Promise<RequireApprovedResult> {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  const status = (user as { status?: string }).status
  const role = (user as { role?: string }).role ?? 'USER'
  const userId = (user as { id?: string }).id

  if (!userId) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Sesión inválida' }, { status: 401 }),
    }
  }

  if (status !== 'APPROVED') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Cuenta no aprobada' }, { status: 403 }),
    }
  }

  return { ok: true, userId, role }
}
