// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  BarChart3,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  TrendingUp,
  Upload,
  Users,
  Wallet,
  FileSpreadsheet,
} from 'lucide-react'

type SidebarProps = {
  activePath: string | null
  isOpen?: boolean
  onClose?: () => void
}

type Item = {
  href: string
  label: string
  icon: LucideIcon
}

type Section = {
  title: string
  items: Item[]
}

const SECTIONS: Section[] = [
  {
    title: 'Resumen',
    items: [
      { href: '/', label: 'Panel general', icon: LayoutDashboard },
      { href: '/finance', label: 'Finanzas', icon: TrendingUp },
    ],
  },
  {
    title: 'Operación',
    items: [
      { href: '/products', label: 'Productos', icon: Package },
      { href: '/quotes', label: 'Cotizaciones', icon: FileSpreadsheet },
      { href: '/sales', label: 'Ventas', icon: ShoppingCart },
      { href: '/purchases', label: 'Compras', icon: ShoppingCart },
    ],
  },
  {
    title: 'Tesorería',
    items: [
      { href: '/receivables', label: 'Cuentas por cobrar', icon: Wallet },
      { href: '/payables', label: 'Cuentas por pagar', icon: Banknote },
      { href: '/cash', label: 'Caja', icon: Banknote },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/analytics/sales', label: 'Ventas', icon: BarChart3 },
      { href: '/analytics/products', label: 'Productos', icon: BarChart3 },
      { href: '/analytics/period', label: 'Períodos', icon: BarChart3 },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/users', label: 'Usuarios', icon: Users },
      { href: '/admin/settings', label: 'Configuración', icon: Settings },
      { href: '/admin/financial-settings', label: 'Parámetros financieros', icon: Settings },
      { href: '/admin/import', label: 'Importar datos', icon: Upload },
    ],
  },
]

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function isActive(pathname: string | null, href: string) {
  if (!pathname) return false
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}

function NavContent({
  activePath,
  onNavigate,
}: {
  activePath: string | null
  onNavigate?: () => void
}) {
  return (
    <div className="space-y-6 px-3 pb-8 pt-2">
      {SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
            {section.title}
          </div>
          <nav className="mt-2 space-y-0.5">
            {section.items.map((item) => {
              const active = isActive(activePath, item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-ifedel-primary/20 text-white shadow-sm shadow-black/10 ring-1 ring-ifedel-primary/40'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-ifedel-primary' : 'text-slate-400'
                    )}
                    strokeWidth={2}
                    aria-hidden
                  />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      ))}
    </div>
  )
}

export function Sidebar({ activePath, isOpen, onClose }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-60 shrink-0 border-r border-slate-800/80 bg-slate-900 pt-3 shadow-dashboard md:block">
        <div className="border-b border-slate-800/80 px-4 pb-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Navegación</p>
        </div>
        <NavContent activePath={activePath} />
      </aside>

      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-72 border-r border-slate-800 bg-slate-900 pt-3 shadow-dashboard-lg">
            <NavContent activePath={activePath} onNavigate={onClose} />
          </div>
          <button
            type="button"
            className="flex-1 bg-slate-950/40 backdrop-blur-sm"
            aria-label="Cerrar menú"
            onClick={onClose}
          />
        </div>
      )}
    </>
  )
}
