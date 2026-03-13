// components/layout/Topbar.tsx
'use client'

import Link from 'next/link'
import { useCurrentUser } from '@/components/layout/UserContext'

type TopbarProps = {
  onToggleSidebar?: () => void
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  const user = useCurrentUser()

  const displayName =
    (user && (user as any).name) ||
    (user && (user as any).email) ||
    'Usuario interno'

  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleSidebar}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label="Mostrar u ocultar menú"
        >
          <span className="h-0.5 w-4 rounded bg-gray-700" />
          <span className="h-0.5 w-4 rounded bg-gray-700" />
          <span className="h-0.5 w-4 rounded bg-gray-700" />
        </button>
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ifedel-primary text-xs font-bold text-white">
            IF
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold text-ifedel-black">
              IFEDEL
            </span>
            <span className="text-[11px] text-gray-500">
              Gestión comercial &amp; financiera
            </span>
          </div>
        </Link>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-600">
        <div className="hidden text-right text-[11px] leading-tight sm:block">
          <div className="font-semibold text-ifedel-black">{displayName}</div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-700">
          {displayName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  )
}


