'use client'

import Link from 'next/link'
import { PackageOpen } from 'lucide-react'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

type EmptyCatalogStateProps = {
  title?: string
  description?: string
  showCta?: boolean
}

export function EmptyCatalogState({
  title = 'Todavía no hay productos publicados',
  description = 'Pronto vas a poder explorar el catálogo completo de IFEDEL. Volvé a visitar esta página más adelante.',
  showCta = true,
}: EmptyCatalogStateProps) {
  const { path } = useCatalogPath()

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-ifedel-brown/25 bg-white/60 px-6 py-16 text-center">
      <PackageOpen className="h-10 w-10 text-ifedel-brown/50" aria-hidden />
      <h2 className="mt-4 text-xl font-semibold text-slate-900">{title}</h2>
      <p className="mt-2 max-w-md text-sm text-slate-600">{description}</p>
      {showCta ? (
        <Link
          href={path()}
          className="mt-6 inline-flex rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105"
        >
          Volver al inicio
        </Link>
      ) : null}
    </div>
  )
}
