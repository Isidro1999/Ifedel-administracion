// components/layout/AppShell.tsx
'use client'

import type { ReactNode } from 'react'
import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Topbar } from './Topbar'
import { Sidebar } from './Sidebar'

type AppShellProps = {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const toggleSidebar = () => setSidebarOpen((prev) => !prev)
  const closeSidebar = () => setSidebarOpen(false)

  return (
    <div className="min-h-screen bg-gray-50">
      <Topbar onToggleSidebar={toggleSidebar} />
      <div className="flex">
        <Sidebar activePath={pathname} isOpen={sidebarOpen} onClose={closeSidebar} />
        <main className="flex-1 px-4 py-6 md:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}


