import { NextResponse } from 'next/server'
import { auth } from '@/auth'

export type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

/**
 * Valida sesión NextAuth: usuario autenticado, APPROVED y role ADMIN.
 * Usar en rutas `app/api/admin/**`.
 */
export async function requireAdminSession(): Promise<RequireAdminResult> {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autenticado' }, { status: 401 }),
    }
  }

  const status = (user as { status?: string }).status
  const role = (user as { role?: string }).role
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

  if (role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'No autorizado' }, { status: 403 }),
    }
  }

  return { ok: true, userId }
}

/** Respuesta genérica cuando falla una comprobación manual (poco usada). */
export function forbiddenAdminResponse() {
  return NextResponse.json(
    { error: 'No autorizado. Se requiere sesión de administrador.' },
    { status: 403 }
  )
}
