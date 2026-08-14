'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { Menu, X } from 'lucide-react'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'
import { useCatalogInquiryStore } from '@/lib/catalog-inquiry-store'

export function CatalogHeader() {
  const pathname = usePathname() ?? ''
  const { path, onCatalogHost } = useCatalogPath()
  const [open, setOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const itemCount = useCatalogInquiryStore((s) => s.items.length)

  useEffect(() => {
    setHydrated(true)
  }, [])

  const nav = useMemo(
    () => [
      { href: path(), label: 'Inicio' },
      { href: path('productos'), label: 'Productos' },
      // Sección #categorias de la home (respeta /catalogo vs subdominio).
      { href: `${path()}#categorias`, label: 'Categorías' },
      { href: path('nosotros'), label: 'Nosotros' },
      { href: path('consulta'), label: 'Consulta' },
    ],
    [path],
  )

  function navActive(href: string) {
    // Anclas de sección (ej. #categorias) no compiten con "Inicio".
    if (href.includes('#')) return false
    const base = href.split('#')[0]
    const home = path()
    if (base === home || base === '/') {
      return (
        pathname === home ||
        pathname === '/' ||
        (!onCatalogHost && pathname === '/catalogo')
      )
    }
    return pathname === base || pathname.startsWith(`${base}/`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-black/10 bg-[#0a0a0a]/95 text-white backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href={path()}
          className="flex items-center gap-3"
          onClick={() => setOpen(false)}
        >
          <Image
            src={IFEDelBrand.logo.src}
            alt={IFEDelBrand.companyName}
            width={140}
            height={36}
            className="h-8 w-auto"
            priority
          />
          <span className="hidden text-sm font-medium tracking-wide text-white/70 sm:inline">
            Catálogo
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="hidden items-center gap-1 lg:flex">
            {nav.map((item) => {
              const active = navActive(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? 'bg-ifedel-primary/20 text-ifedel-primary'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <Link
            href={path('consulta')}
            className="relative inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm font-medium text-white transition hover:border-ifedel-primary/50 hover:bg-ifedel-primary/10"
            aria-label="Lista de consulta"
          >
            <span className="hidden sm:inline">Consulta</span>
            <span className="sm:hidden">Lista</span>
            {hydrated && itemCount > 0 ? (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-ifedel-primary px-1.5 py-0.5 text-[11px] font-bold text-black">
                {itemCount > 99 ? '99+' : itemCount}
              </span>
            ) : (
              <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-white/15 px-1.5 py-0.5 text-[11px] font-bold text-white/70">
                0
              </span>
            )}
          </Link>

          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md text-white lg:hidden"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <nav className="border-t border-white/10 px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-3 text-sm font-medium text-white/90 hover:bg-white/5"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  )
}
