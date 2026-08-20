'use client'

import { useState } from 'react'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { CatalogCloudinaryImage } from '@/components/catalog/CatalogCloudinaryImage'

type GalleryImage = {
  id: number
  url: string
  isPrimary: boolean
  sortOrder: number
}

type ProductGalleryProps = {
  images: GalleryImage[]
  title: string
}

export function ProductGallery({ images, title }: ProductGalleryProps) {
  const [index, setIndex] = useState(0)
  const list = images.length > 0 ? images : []
  const current = list[index]

  if (!current) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400">
        Sin imagen
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-slate-100">
        <CatalogCloudinaryImage
          src={getOptimizedImageUrl(current.url, 1200)}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
        />
      </div>
      {list.length > 1 ? (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
          {list.map((img, i) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setIndex(i)}
              className={`relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                i === index
                  ? 'border-ifedel-primary'
                  : 'border-transparent opacity-80 hover:opacity-100'
              }`}
              aria-label={`Imagen ${i + 1}`}
            >
              <CatalogCloudinaryImage
                src={getOptimizedImageUrl(img.url, 200)}
                alt=""
                fill
                className="object-cover"
                sizes="80px"
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
