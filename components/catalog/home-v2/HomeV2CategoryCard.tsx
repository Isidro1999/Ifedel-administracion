import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import type { HomeCategoryItem } from '@/components/catalog/home-v2/home-categories'
import { HomeV2CategoryIcon } from '@/components/catalog/home-v2/HomeV2CategoryIcon'

type HomeV2CategoryCardProps = {
  category: HomeCategoryItem
}

export function HomeV2CategoryCard({ category }: HomeV2CategoryCardProps) {
  const count = category.count
  const countLabel = `${count} producto${count === 1 ? '' : 's'}`
  const hasImage = Boolean(category.image)

  return (
    <Link
      href={category.href}
      className={[
        'group relative flex h-full min-h-[8.5rem] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm outline-none transition duration-300 sm:min-h-[9.5rem] sm:p-5',
        'hover:border-ifedel-primary/55 focus-visible:border-ifedel-primary focus-visible:ring-2 focus-visible:ring-ifedel-primary/40',
        hasImage
          ? 'md:hover:border-transparent md:focus-visible:border-transparent'
          : 'hover:bg-[#fbfef7]',
      ].join(' ')}
      aria-label={`${category.name}. ${countLabel}. Ver productos de esta categoría.`}
    >
      {hasImage && category.image ? (
        <span
          className="pointer-events-none absolute inset-0 hidden md:block"
          aria-hidden
        >
          <Image
            src={category.image}
            alt=""
            fill
            sizes="(max-width: 768px) 0px, (max-width: 1024px) 33vw, 280px"
            className="object-cover object-center opacity-0 grayscale transition duration-300 ease-out group-hover:scale-105 group-hover:opacity-100 group-focus-visible:scale-105 group-focus-visible:opacity-100 motion-reduce:transition-none motion-reduce:group-hover:scale-100 motion-reduce:group-focus-visible:scale-100"
          />
          <span className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/55 to-black/30 opacity-0 transition duration-300 ease-out group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none" />
        </span>
      ) : null}

      <span className="relative z-10 flex h-full flex-col gap-3">
        <span className="flex items-start justify-between gap-2">
          <span
            className={[
              'inline-flex h-10 w-10 items-center justify-center rounded-xl bg-ifedel-primary/15 text-ifedel-brown ring-1 ring-ifedel-primary/20 transition duration-300',
              hasImage
                ? 'md:group-hover:opacity-0 md:group-focus-visible:opacity-0'
                : 'group-hover:bg-ifedel-primary/25 group-focus-visible:bg-ifedel-primary/25',
            ].join(' ')}
            aria-hidden
          >
            <HomeV2CategoryIcon name={category.icon} className="h-5 w-5" />
          </span>
          <ChevronRight
            className={[
              'mt-1 h-4 w-4 shrink-0 text-slate-400 transition duration-300',
              hasImage
                ? 'md:group-hover:translate-x-0.5 md:group-hover:text-white md:group-focus-visible:translate-x-0.5 md:group-focus-visible:text-white motion-reduce:md:group-hover:translate-x-0 motion-reduce:md:group-focus-visible:translate-x-0'
                : 'group-hover:translate-x-0.5 group-hover:text-ifedel-brown group-focus-visible:translate-x-0.5 group-focus-visible:text-ifedel-brown motion-reduce:group-hover:translate-x-0',
            ].join(' ')}
            aria-hidden
          />
        </span>

        <span className="mt-auto min-w-0">
          <span
            className={[
              'block text-sm font-semibold leading-snug text-slate-900 transition-colors duration-300 sm:text-base',
              hasImage
                ? 'md:group-hover:text-white md:group-focus-visible:text-white'
                : '',
            ].join(' ')}
          >
            {category.name}
          </span>
          <span
            className={[
              'mt-1 block text-xs text-slate-500 transition-colors duration-300',
              hasImage
                ? 'md:group-hover:text-white/80 md:group-focus-visible:text-white/80'
                : '',
            ].join(' ')}
          >
            {countLabel}
          </span>
        </span>
      </span>
    </Link>
  )
}
