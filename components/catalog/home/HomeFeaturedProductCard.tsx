'use client'

import Link from 'next/link'
import type { CatalogProductListItem } from '@/lib/catalog-client'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { CatalogCloudinaryImage } from '@/components/catalog/CatalogCloudinaryImage'
import { CatalogPriceDisplay } from '@/components/catalog/CatalogPriceDisplay'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

type HomeFeaturedProductCardProps = {
  product: CatalogProductListItem
  /** Solo para la primera card above-the-fold. */
  priority?: boolean
}

export function HomeFeaturedProductCard({
  product,
  priority = false,
}: HomeFeaturedProductCardProps) {
  const { path } = useCatalogPath()
  const detailHref = path(`productos/${product.slug}`)
  const img = product.primaryImage?.url
  const src = img ? getOptimizedImageUrl(img, 400) : null

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white transition hover:border-ifedel-primary/35 hover:shadow-sm">
      <Link
        href={detailHref}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-50"
      >
        {src ? (
          <CatalogCloudinaryImage
            src={src}
            alt={product.title}
            fill
            className="object-contain p-3 transition duration-300 group-hover:scale-[1.02] sm:p-3.5"
            sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 25vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-slate-400">
            Sin imagen
          </div>
        )}
        {product.isFeatured ? (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ifedel-primary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-black">
            Destacado
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-2 px-3 pb-3 pt-2.5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-ifedel-brown/75">
          {product.brand?.name ?? 'Sin marca'}
        </p>

        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
          <Link href={detailHref} className="hover:text-ifedel-brown">
            {product.title}
          </Link>
        </h3>

        <div className="mt-auto space-y-2 pt-1">
          <CatalogPriceDisplay
            amount={product.price?.amount ?? null}
            priceLabel={product.priceLabel}
            variant="inline"
          />
          <Link
            href={detailHref}
            className="inline-flex text-sm font-medium text-ifedel-brown transition hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-brown"
          >
            Ver producto
          </Link>
        </div>
      </div>
    </article>
  )
}
