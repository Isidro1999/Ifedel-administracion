'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Map,
  FileSpreadsheet,
  LayoutDashboard,
  Package,
  Search,
  Settings,
  ShoppingCart,
  TrendingUp,
  Globe,
  Upload,
  Users,
  Wallet,
  MessageSquareText,
  Folders,
} from 'lucide-react'

import { COMMAND_PALETTE_EVENT } from './command-palette-constants'

export { COMMAND_PALETTE_EVENT }

type Entry = {
  id: string
  title: string
  href: string
  keywords: string
  group: string
  Icon: typeof LayoutDashboard
}

const ENTRIES: Entry[] = [
  { id: 'home', title: 'Panel general', href: '/', keywords: 'inicio dashboard', group: 'Resumen', Icon: LayoutDashboard },
  { id: 'finance', title: 'Finanzas', href: '/finance', keywords: 'dashboard financiero', group: 'Resumen', Icon: TrendingUp },
  { id: 'products', title: 'Productos', href: '/products', keywords: 'catálogo sku', group: 'Operación', Icon: Package },
  { id: 'quotes', title: 'Cotizaciones', href: '/quotes', keywords: 'presupuesto', group: 'Operación', Icon: FileSpreadsheet },
  { id: 'quotes-new', title: 'Nueva cotización', href: '/quotes/new', keywords: 'crear cotización', group: 'Operación', Icon: FileSpreadsheet },
  { id: 'sales', title: 'Ventas', href: '/sales', keywords: 'facturación', group: 'Operación', Icon: ShoppingCart },
  { id: 'purchases', title: 'Compras', href: '/purchases', keywords: 'proveedor', group: 'Operación', Icon: ShoppingCart },
  { id: 'purchases-new', title: 'Nueva compra', href: '/purchases/new', keywords: 'registrar compra', group: 'Operación', Icon: ShoppingCart },
  { id: 'receivables', title: 'Cuentas por cobrar', href: '/receivables', keywords: 'cxc cobranzas', group: 'Tesorería', Icon: Wallet },
  { id: 'payables', title: 'Cuentas por pagar', href: '/payables', keywords: 'cxp pagos proveedor', group: 'Tesorería', Icon: Banknote },
  { id: 'cash', title: 'Caja', href: '/cash', keywords: 'movimientos ingresos egresos', group: 'Tesorería', Icon: Banknote },
  { id: 'analytics-sales', title: 'Analytics — Ventas', href: '/analytics/sales', keywords: 'reporte', group: 'Analytics', Icon: BarChart3 },
  { id: 'analytics-products', title: 'Analytics — Productos', href: '/analytics/products', keywords: 'reporte', group: 'Analytics', Icon: BarChart3 },
  { id: 'analytics-period', title: 'Analytics — Períodos', href: '/analytics/period', keywords: 'reporte mes', group: 'Analytics', Icon: BarChart3 },
  { id: 'mapa-ganadero', title: 'Mapa ganadero', href: '/comercial/mapa', keywords: 'provincias stock bovino comercial', group: 'Analytics', Icon: Map },
  { id: 'admin-users', title: 'Admin — Usuarios', href: '/admin/users', keywords: 'usuarios roles', group: 'Admin', Icon: Users },
  { id: 'admin-categories', title: 'Admin — Categorías', href: '/admin/categories', keywords: 'taxonomía subcategoría jerarquía', group: 'Admin', Icon: Folders },
  { id: 'admin-catalog', title: 'Admin — Catálogo online', href: '/admin/catalog', keywords: 'publicar despublicar catálogo online', group: 'Admin', Icon: Globe },
  { id: 'admin-inquiries', title: 'Admin — Consultas comerciales', href: '/admin/catalog/inquiries', keywords: 'consulta lead catálogo ifd contacto', group: 'Admin', Icon: MessageSquareText },
  { id: 'admin-settings', title: 'Admin — Configuración', href: '/admin/settings', keywords: 'settings', group: 'Admin', Icon: Settings },
  { id: 'admin-financial', title: 'Admin — Parámetros financieros', href: '/admin/financial-settings', keywords: 'tasas overhead', group: 'Admin', Icon: Settings },
  { id: 'admin-import', title: 'Admin — Importar datos', href: '/admin/import', keywords: 'csv productos', group: 'Admin', Icon: Upload },
]

function normalize(s: string) {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function CommandPalette() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    const n = normalize(q.trim())
    if (!n) return ENTRIES
    return ENTRIES.filter(
      (e) =>
        normalize(e.title).includes(n) ||
        normalize(e.keywords).includes(n) ||
        normalize(e.group).includes(n)
    )
  }, [q])

  useEffect(() => {
    setActive(0)
  }, [q, open])

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      }
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])

  useEffect(() => {
    const onOpen = () => {
      setOpen(true)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen)
    return () => window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen)
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => inputRef.current?.focus(), 0)
    return () => clearTimeout(t)
  }, [open])

  const go = useCallback(
    (href: string) => {
      close()
      router.push(href)
    },
    [close, router]
  )

  const onPaletteKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[active]) {
      e.preventDefault()
      go(filtered[active].href)
    }
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Navegación rápida"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/20 ring-1 ring-slate-900/10"
        onKeyDown={onPaletteKeyDown}
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar pantalla o acción…"
            className="min-w-0 flex-1 border-0 bg-transparent py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-0"
            autoComplete="off"
          />
          <kbd className="hidden shrink-0 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-500 sm:inline-block">
            esc
          </kbd>
        </div>
        <ul className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <li className="px-3 py-8 text-center text-sm text-slate-500">Sin resultados</li>
          ) : (
            filtered.map((e, i) => {
              const Icon = e.Icon
              const selected = i === active
              return (
                <li key={e.id}>
                  <Link
                    href={e.href}
                    onClick={() => close()}
                    onMouseEnter={() => setActive(i)}
                    className={[
                      'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors',
                      selected
                        ? 'bg-ifedel-primary/15 text-ifedel-black'
                        : 'text-slate-700 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                        selected
                          ? 'border-ifedel-primary/30 bg-white text-ifedel-brown'
                          : 'border-slate-200 bg-slate-50 text-slate-600',
                      ].join(' ')}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{e.title}</span>
                      <span className="block truncate text-[11px] text-slate-500">{e.group}</span>
                    </span>
                    <ArrowRight
                      className={['h-4 w-4 shrink-0', selected ? 'text-ifedel-primary' : 'text-slate-300'].join(
                        ' '
                      )}
                      aria-hidden
                    />
                  </Link>
                </li>
              )
            })
          )}
        </ul>
        <div className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
          <span className="hidden sm:inline">↑↓ para mover · Enter para ir · </span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">⌘K</kbd>
          <span className="hidden sm:inline"> o </span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1 font-mono">Ctrl+K</kbd>
        </div>
      </div>
    </div>
  )
}
