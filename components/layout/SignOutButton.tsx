'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { LogOut } from 'lucide-react'

type SignOutButtonProps = {
  className?: string
  /** Variante compacta para el topbar. */
  compact?: boolean
}

/**
 * Cierre de sesión oficial Auth.js (cliente).
 * Redirige a /login y evita clics repetidos mientras corre.
 */
export function SignOutButton({ className = '', compact = false }: SignOutButtonProps) {
  const [loading, setLoading] = useState(false)

  async function handleSignOut() {
    if (loading) return
    setLoading(true)
    try {
      await signOut({ callbackUrl: '/login', redirect: true })
    } catch {
      // Fallback duro si el redirect de Auth.js falla.
      window.location.assign('/login')
    }
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={loading}
      aria-busy={loading}
      className={
        className ||
        (compact
          ? 'inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60'
          : 'inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60')
      }
    >
      <LogOut className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} strokeWidth={2} aria-hidden />
      <span>{loading ? 'Cerrando…' : 'Cerrar sesión'}</span>
    </button>
  )
}
