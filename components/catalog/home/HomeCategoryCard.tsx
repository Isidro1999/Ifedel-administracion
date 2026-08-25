import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { HomeCategoryItem } from '@/components/catalog/home/home-categories'
import { HomeCategoryIcon } from '@/components/catalog/home/HomeCategoryIcon'
import { CatalogCategoryImage } from '@/components/catalog/CatalogCategoryImage'

type HomeCategoryCardProps = {
  category: HomeCategoryItem
}

export function HomeCategoryCard({ category }: HomeCategoryCardProps) {
  const count = category.count
  const countLabel = `${count} producto${count === 1 ? '' : 's'}`
  const hasImage = Boolean(category.imageUrl)

  return (
    <Link
      href={category.href}
      className={[
        'group relative flex h-full min-h-[9rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm outline-none transition duration-300',
        'hover:-translate-y-0.5 hover:border-ifedel-primary/50 hover:shadow-md',
        'focus-visible:border-ifedel-primary focus-visible:ring-2 focus-visible:ring-ifedel-primary/40',
      ].join(' ')}
      aria-label={`${category.name}. ${countLabel}. Ver categoría.`}
    >
      <span className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-50">
        <CatalogCategoryImage
          imageUrl={category.imageUrl}
          alt=""
          width={480}
          variant="card"
          icon={category.icon}
          className="absolute inset-0 h-full w-full rounded-none border-0"
        />
        {!hasImage ? null : (
          <span
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent opacity-80"
            aria-hidden
          />
        )}
      </span>

      <span className="relative z-10 flex flex-1 flex-col gap-1.5 p-4">
        <span className="flex items-start justify-between gap-2">
          <span className="min-w-0">
            <span className="block break-words text-sm font-semibold leading-snug text-slate-900 transition group-hover:text-ifedel-brown sm:text-base">
              {category.name}
            </span>
            {category.shortDescription ? (
              <span className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-500 sm:line-clamp-4">
                {category.shortDescription}
              </span>
            ) : null}
          </span>
          <ChevronRight
            className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ifedel-brown"
            aria-hidden
          />
        </span>
        <span className="mt-auto flex items-center gap-2 pt-1">
          <span
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-ifedel-primary/15 text-ifedel-brown ring-1 ring-ifedel-primary/15"
            aria-hidden
          >
            <HomeCategoryIcon name={category.icon} className="h-3.5 w-3.5" />
          </span>
          <span className="text-xs text-slate-500">{countLabel}</span>
        </span>
      </span>
    </Link>
  )
}
