// components/layout/AppShell.tsx
'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'
import { CommandPalette } from './CommandPalette'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen">
      <CommandPalette />
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className="flex min-h-[calc(100vh-3.5rem)]">
        <Sidebar activePath={pathname} isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 px-4 py-6 md:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl space-y-6">{children}</div>
        </main>
      </div>
    </div>
  )
}


