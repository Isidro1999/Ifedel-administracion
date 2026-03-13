// components/layout/Sidebar.tsx
'use client'

import Link from 'next/link'

type SidebarProps = {
  activePath: string | null
  isOpen?: boolean
  onClose?: () => void
}

type Item = {
  href: string
  label: string
}

type Section = {
  title: string
  items: Item[]
}

const SECTIONS: Section[] = [
  {
    title: 'Resumen',
    items: [
      { href: '/', label: 'Panel general' },
      { href: '/finance', label: 'Finanzas' },
    ],
  },
  {
    title: 'Operación',
    items: [
      { href: '/products', label: 'Productos' },
      { href: '/quotes', label: 'Cotizaciones' },
      { href: '/sales', label: 'Ventas' },
      { href: '/purchases', label: 'Compras' },
    ],
  },
  {
    title: 'Tesorería',
    items: [
      { href: '/receivables', label: 'Cuentas por cobrar' },
      { href: '/payables', label: 'Cuentas por pagar' },
      { href: '/cash', label: 'Caja' },
    ],
  },
  {
    title: 'Analytics',
    items: [
      { href: '/analytics/sales', label: 'Ventas' },
      { href: '/analytics/products', label: 'Productos' },
      { href: '/analytics/period', label: 'Períodos' },
    ],
  },
  {
    title: 'Admin',
    items: [
      { href: '/admin/users', label: 'Usuarios' },
      { href: '/admin/settings', label: 'Configuración' },
      { href: '/admin/financial-settings', label: 'Parámetros financieros' },
      { href: '/admin/import', label: 'Importar datos' },
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

export function Sidebar({ activePath, isOpen, onClose }: SidebarProps) {
  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 border-r bg-white/90 pt-4 md:block">
        <div className="space-y-6 px-3 pb-6">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <div className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                {section.title}
              </div>
              <nav className="mt-2 space-y-1">
                {section.items.map((item) => {
                  const active = isActive(activePath, item.href)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                        active
                          ? 'bg-ifedel-primary/10 text-ifedel-black font-semibold border-l-2 border-ifedel-primary'
                          : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <span>{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          ))}
        </div>
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div className="w-64 border-r bg-white pt-4 shadow-lg">
            <div className="space-y-6 px-3 pb-6">
              {SECTIONS.map((section) => (
                <div key={section.title}>
                  <div className="px-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {section.title}
                  </div>
                  <nav className="mt-2 space-y-1">
                    {section.items.map((item) => {
                      const active = isActive(activePath, item.href)
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          className={cn(
                            'flex items-center justify-between rounded-md px-2 py-1.5 text-sm transition-colors',
                            active
                              ? 'bg-ifedel-primary/10 text-ifedel-black font-semibold border-l-2 border-ifedel-primary'
                              : 'text-gray-700 hover:bg-gray-100'
                          )}
                        >
                          <span>{item.label}</span>
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              ))}
            </div>
          </div>
          <button
            type="button"
            className="flex-1 bg-black/20"
            aria-label="Cerrar menú"
            onClick={onClose}
          />
        </div>
      )}
    </>
  )
}

