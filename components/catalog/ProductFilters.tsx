'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FormEvent, useTransition } from 'react'
import type { CatalogBrand, CatalogCategory } from '@/lib/catalog-client'

type ProductFiltersProps = {
  categories: CatalogCategory[]
  brands: CatalogBrand[]
  basePath: string
}

export function ProductFilters({
  categories,
  brands,
  basePath,
}: ProductFiltersProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [pending, startTransition] = useTransition()

  const q = searchParams.get('q') ?? ''
  const category = searchParams.get('category') ?? ''
  const brand = searchParams.get('brand') ?? ''

  function apply(next: Record<string, string>) {
    const sp = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(next)) {
      if (!value) sp.delete(key)
      else sp.set(key, value)
    }
    sp.delete('page')
    const qs = sp.toString()
    const target = `${basePath || pathname}${qs ? `?${qs}` : ''}`
    startTransition(() => {
      router.push(target)
    })
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    apply({
      q: String(fd.get('q') || '').trim(),
      category: String(fd.get('category') || ''),
      brand: String(fd.get('brand') || ''),
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 shadow-sm sm:flex-row sm:flex-wrap sm:items-end"
    >
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Buscar</span>
        <input
          name="q"
          defaultValue={q}
          placeholder="Nombre o marca…"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
        />
      </label>

      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Categoría</span>
        <select
          name="category"
          defaultValue={category}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
        >
          <option value="">Todas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.slug}>
              {c.name} ({c.count ?? 0})
            </option>
          ))}
        </select>
      </label>

      <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Marca</span>
        <select
          name="brand"
          defaultValue={brand}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
        >
          <option value="">Todas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.slug}>
              {b.name} ({b.count ?? 0})
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105 disabled:opacity-60"
        >
          {pending ? 'Filtrando…' : 'Aplicar'}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(() => router.push(basePath))
          }}
          className="rounded-full border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
        >
          Limpiar
        </button>
      </div>
    </form>
  )
}
