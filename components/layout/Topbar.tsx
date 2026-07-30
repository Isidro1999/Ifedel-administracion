// components/layout/Topbar.tsx
'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Command, Menu, Search } from 'lucide-react'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { useCurrentUser } from '@/components/layout/UserContext'
import { SignOutButton } from '@/components/layout/SignOutButton'
import { COMMAND_PALETTE_EVENT } from './command-palette-constants'

type TopbarProps = {
  onToggleSidebar?: () => void
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const user = useCurrentUser()

  const displayName =
    (user && (user as any).name) ||
    (user && (user as any).email) ||
    'Usuario interno'

  const openPalette = () => {
    window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT))
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 shadow-sm shadow-slate-900/5 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 md:hidden"
          aria-label="Mostrar u ocultar menú"
        >
          <Menu className="h-5 w-5" strokeWidth={2} />
        </button>
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-lg pr-2 transition hover:bg-slate-50/80"
          aria-label={`${IFEDelBrand.companyName} — inicio`}
        >
          <span className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-black shadow-md ring-1 ring-slate-200/80">
            <Image
              src={IFEDelBrand.logo.src}
              alt=""
              width={36}
              height={36}
              className="object-contain p-0.5"
              priority
            />
          </span>
          <div className="hidden flex-col leading-tight sm:flex">
            <span className="text-sm font-bold tracking-tight text-slate-900">IFEDEL</span>
            <span className="text-[11px] font-medium text-slate-500">Gestión comercial y financiera</span>
          </div>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-2 md:px-6">
        <button
          type="button"
          onClick={openPalette}
          className="group flex w-full max-w-md min-w-0 items-center gap-2 rounded-xl border border-slate-200/90 bg-slate-50/80 px-3 py-2 text-left text-sm text-slate-500 shadow-inner transition hover:border-slate-300 hover:bg-white"
        >
          <Search className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-slate-500" strokeWidth={2} />
          <span className="min-w-0 flex-1 truncate">
            <span className="hidden sm:inline">Buscar o ir a…</span>
            <span className="sm:hidden">Buscar…</span>
          </span>
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 shadow-sm sm:inline-block">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={openPalette}
          className="hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 lg:inline-flex"
          aria-label="Abrir navegación rápida"
        >
          <Command className="h-4 w-4" strokeWidth={2} />
        </button>
        <div className="hidden text-right text-[11px] leading-tight sm:block">
          <div className="font-semibold text-slate-900">{displayName}</div>
        </div>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-[11px] font-bold text-slate-700 ring-2 ring-white shadow-sm"
          aria-hidden
        >
          {displayName.charAt(0).toUpperCase()}
        </div>
        <SignOutButton compact />
      </div>
    </header>
  )
}
