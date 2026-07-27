import { NextResponse } from 'next/server'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export type RequireAdminResult =
  | { ok: true; userId: string }
  | { ok: false; response: NextResponse }

const NO_STORE = {
  'Cache-Control': 'private, no-store, no-cache, must-revalidate',
} as const

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status, headers: NO_STORE })
}

/**
 * Valida sesión NextAuth: autenticado, APPROVED y role ADMIN.
 * Usar en rutas `app/api/admin/**`.
 */
export async function requireAdminSession(): Promise<RequireAdminResult> {
  const session = await auth()
  const user = session?.user

  if (!user) {
    return { ok: false, response: jsonError('No autenticado', 401) }
  }

  const status = (user as { status?: string }).status
  const role = (user as { role?: string }).role
  const userId = (user as { id?: string }).id

  if (!userId) {
    return { ok: false, response: jsonError('Sesión inválida', 401) }
  }

  if (status !== 'APPROVED') {
    return { ok: false, response: jsonError('Cuenta no aprobada', 403) }
  }

  if (role !== 'ADMIN') {
    return { ok: false, response: jsonError('No autorizado', 403) }
  }

  return { ok: true, userId }
}

/**
 * Para layouts/páginas admin. Sin sesión → /login.
 * No APPROVED → /pending. No ADMIN → /.
 */
export async function requireAdminPage(): Promise<{ userId: string }> {
  const session = await auth()
  const user = session?.user

  if (!user) {
    redirect('/login')
  }

  const userId = (user as { id?: string }).id
  const status = (user as { status?: string }).status
  const role = (user as { role?: string }).role

  if (!userId) {
    redirect('/login')
  }

  if (status !== 'APPROVED') {
    redirect('/pending')
  }

  if (role !== 'ADMIN') {
    redirect('/')
  }

  return { userId }
}

/**
 * Para server actions admin-only.
 */
export async function requireAdminAction(): Promise<
  | { ok: true; userId: string }
  | { ok: false; error: string }
> {
  const gate = await requireAdminSession()
  if (!gate.ok) {
    const status = gate.response.status
    if (status === 401) return { ok: false, error: 'No autenticado' }
    if (status === 403) {
      // Distinguir APPROVED vs ADMIN es irrelevante para el caller; mensaje genérico.
      return { ok: false, error: 'No autorizado' }
    }
    return { ok: false, error: 'No autorizado' }
  }
  return { ok: true, userId: gate.userId }
}

/** Respuesta genérica cuando falla una comprobación manual (poco usada). */
export function forbiddenAdminResponse() {
  return NextResponse.json(
    { error: 'No autorizado. Se requiere sesión de administrador.' },
    { status: 403, headers: NO_STORE },
  )
}
