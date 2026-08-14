'use client'

import Link from 'next/link'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

export function CatalogFooter() {
  const { path } = useCatalogPath()

  return (
    <footer className="mt-auto border-t border-black/10 bg-[#0a0a0a] text-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
        <div>
          <p className="text-lg font-semibold tracking-tight text-ifedel-primary">
            {IFEDelBrand.companyName}
          </p>
          <p className="mt-2 text-sm text-white/65">{IFEDelBrand.tagline}</p>
        </div>
        <div className="text-sm text-white/70">
          <p>{IFEDelBrand.address}</p>
          <p className="mt-1">{IFEDelBrand.phone}</p>
          <p className="mt-1">{IFEDelBrand.email}</p>
        </div>
        <div className="flex flex-col gap-2 text-sm">
          <Link
            href={path('nosotros')}
            className="text-white/80 hover:text-ifedel-primary"
          >
            Nosotros
          </Link>
          <Link
            href={path('productos')}
            className="text-white/80 hover:text-ifedel-primary"
          >
            Ver productos
          </Link>
          <Link
            href={path('consulta')}
            className="text-white/80 hover:text-ifedel-primary"
          >
            Armar consulta
          </Link>
          <a
            href={`https://${IFEDelBrand.website}`}
            className="text-white/80 hover:text-ifedel-primary"
            target="_blank"
            rel="noreferrer"
          >
            {IFEDelBrand.website}
          </a>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">
        © {new Date().getFullYear()} {IFEDelBrand.companyName}. Catálogo online.
      </div>
    </footer>
  )
}
