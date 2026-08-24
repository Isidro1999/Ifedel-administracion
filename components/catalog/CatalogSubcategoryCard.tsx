import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { CatalogCategoryNode } from '@/lib/catalog-category-public'
import { CatalogCategoryImage } from '@/components/catalog/CatalogCategoryImage'
import type { HomeCategoryIconKey } from '@/components/catalog/home/home-categories'

type CatalogSubcategoryCardProps = {
  category: CatalogCategoryNode
  href: string
  icon?: HomeCategoryIconKey
}

export function CatalogSubcategoryCard({
  category,
  href,
  icon = 'default',
}: CatalogSubcategoryCardProps) {
  const countLabel = `${category.count} producto${category.count === 1 ? '' : 's'}`

  return (
    <Link
      href={href}
      className={[
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm',
        'transition duration-200 hover:-translate-y-0.5 hover:border-ifedel-primary/40 hover:shadow-md',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary',
      ].join(' ')}
      aria-label={`${category.name}. ${countLabel}`}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden bg-slate-50">
        <CatalogCategoryImage
          imageUrl={category.imageUrl}
          alt=""
          width={480}
          variant="card"
          icon={icon}
          className="absolute inset-0 h-full w-full rounded-none border-0"
        />
      </div>

      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold leading-snug text-slate-900 transition group-hover:text-ifedel-brown sm:text-base">
            {category.name}
          </p>
          <p className="mt-1 text-xs text-slate-500 sm:text-[0.8rem]">
            {countLabel}
          </p>
        </div>
        <ChevronRight
          className="mt-0.5 h-4 w-4 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-ifedel-brown"
          aria-hidden
        />
      </div>
    </Link>
  )
}
