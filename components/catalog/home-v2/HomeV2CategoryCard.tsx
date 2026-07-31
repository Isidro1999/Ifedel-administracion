import Link from 'next/link'
import type { HomeCategoryItem } from '@/components/catalog/home-v2/home-categories'
import { HomeV2CategoryIcon } from '@/components/catalog/home-v2/HomeV2CategoryIcon'

type HomeV2CategoryCardProps = {
  category: HomeCategoryItem
}

export function HomeV2CategoryCard({ category }: HomeV2CategoryCardProps) {
  const count = category.count
  const countLabel = `${count} producto${count === 1 ? '' : 's'}`

  return (
    <Link
      href={category.href}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm outline-none transition hover:border-ifedel-primary/55 hover:bg-[#fbfef7] focus-visible:border-ifedel-primary focus-visible:ring-2 focus-visible:ring-ifedel-primary/40 sm:p-5"
      aria-label={`${category.name}. ${countLabel}. Ver productos de esta categoría.`}
    >
      <span
        className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ifedel-primary/15 text-ifedel-brown ring-1 ring-ifedel-primary/20 transition group-hover:bg-ifedel-primary/25 group-focus-visible:bg-ifedel-primary/25"
        aria-hidden
      >
        <HomeV2CategoryIcon name={category.icon} className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold leading-snug text-slate-900 sm:text-base">
          {category.name}
        </span>
        <span className="mt-1 block text-xs text-slate-500">{countLabel}</span>
      </span>
    </Link>
  )
}
