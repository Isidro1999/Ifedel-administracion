'use client'

import Image from 'next/image'
import Link from 'next/link'
import type { CatalogProductListItem } from '@/lib/catalog-client'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { AddToInquiryButton } from '@/components/catalog/AddToInquiryButton'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

type ProductCardProps = {
  product: CatalogProductListItem
  /** Solo para las primeras cards above-the-fold. */
  priority?: boolean
}

export function ProductCard({ product, priority = false }: ProductCardProps) {
  const { path } = useCatalogPath()
  const img = product.primaryImage?.url
  // Cards ~320–400px CSS; 480 cubre retina 1.5–2x sin pedir original.
  const src = img ? getOptimizedImageUrl(img, 480) : null
  const detailHref = path(`productos/${product.slug}`)
  const hasPublicPrice = Boolean(product.price)

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-ifedel-primary/40 hover:shadow-md">
      <Link
        href={detailHref}
        className="relative block aspect-[4/3] overflow-hidden bg-slate-100"
      >
        {src ? (
          <Image
            src={src}
            alt={product.title}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            priority={priority}
            loading={priority ? undefined : 'lazy'}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            Sin imagen
          </div>
        )}
        {product.isFeatured ? (
          <span className="absolute left-3 top-3 rounded-full bg-ifedel-primary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-black">
            Destacado
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-ifedel-brown/80">
            {product.brand?.name ?? 'Sin marca'}
            {product.category?.name ? ` · ${product.category.name}` : ''}
          </p>
          <h3 className="mt-1 text-base font-semibold leading-snug text-slate-900">
            <Link href={detailHref} className="hover:text-ifedel-brown">
              {product.title}
            </Link>
          </h3>
          {product.shortDescription ? (
            <p className="mt-2 line-clamp-2 text-sm text-slate-600">
              {product.shortDescription}
            </p>
          ) : null}
        </div>

        <div className="mt-auto">
          <p className="text-sm font-semibold text-slate-900">
            {product.priceLabel}
          </p>
          {hasPublicPrice ? (
            <p className="mt-0.5 text-xs font-normal text-slate-500">
              IVA incluido
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Link
            href={detailHref}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-ifedel-primary px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-105"
          >
            Ver detalle
          </Link>
          <AddToInquiryButton
            product={{
              productId: product.id,
              slug: product.slug,
              sku: product.sku,
              title: product.title,
              primaryImage: product.primaryImage?.url ?? null,
            }}
          />
        </div>
      </div>
    </article>
  )
}
