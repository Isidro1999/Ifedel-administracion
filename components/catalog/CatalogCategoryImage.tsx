import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { CatalogCloudinaryImage } from '@/components/catalog/CatalogCloudinaryImage'
import { HomeCategoryIcon } from '@/components/catalog/home/HomeCategoryIcon'
import type { HomeCategoryIconKey } from '@/components/catalog/home/home-categories'

type CatalogCategoryImageProps = {
  imageUrl: string | null
  alt: string
  /** Ancho objetivo para Cloudinary. */
  width?: number
  className?: string
  /** Contenedor con aspect ratio (hero). */
  variant?: 'inline' | 'hero' | 'card'
  icon?: HomeCategoryIconKey
}

function isCloudinaryUrl(url: string): boolean {
  return url.includes('res.cloudinary.com') && url.includes('/upload/')
}

function CategoryImageFallback({
  className,
  icon,
  alt,
}: {
  className: string
  icon: HomeCategoryIconKey
  alt: string
}) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border border-slate-200/70',
        'bg-gradient-to-br from-[#f4f7ef] via-white to-ifedel-primary/10',
        className,
      ].join(' ')}
      aria-hidden={alt === '' ? true : undefined}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 70% 60% at 85% 20%, rgba(141,198,64,0.22), transparent 55%), radial-gradient(ellipse 50% 45% at 10% 90%, rgba(131,80,41,0.08), transparent 50%)',
        }}
      />
      <div className="relative flex h-full w-full items-center justify-center">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/70 text-ifedel-brown/65 ring-1 ring-ifedel-primary/15 sm:h-11 sm:w-11">
          <HomeCategoryIcon name={icon} className="h-5 w-5" />
        </span>
      </div>
    </div>
  )
}

export function CatalogCategoryImage({
  imageUrl,
  alt,
  width = 720,
  className = '',
  variant = 'inline',
  icon = 'default',
}: CatalogCategoryImageProps) {
  const url = imageUrl?.trim()

  if (!url) {
    return (
      <CategoryImageFallback className={className} icon={icon} alt={alt} />
    )
  }

  if (isCloudinaryUrl(url)) {
    const src = getOptimizedImageUrl(url, width)
    if (variant === 'hero' || variant === 'card') {
      return (
        <div
          className={`relative overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 ${className}`}
        >
          <CatalogCloudinaryImage
            src={src}
            alt={alt}
            fill
            className="object-cover"
            sizes={
              variant === 'hero'
                ? '(max-width: 1024px) 100vw, 42vw'
                : '(max-width: 640px) 100vw, (max-width: 1280px) 33vw, 25vw'
            }
          />
        </div>
      )
    }

    return (
      <CatalogCloudinaryImage
        src={src}
        alt={alt}
        width={width}
        height={Math.round(width * 0.75)}
        className={`rounded-2xl border border-slate-200/70 object-cover ${className}`}
        sizes="(max-width: 768px) 100vw, 320px"
      />
    )
  }

  if (variant === 'hero' || variant === 'card') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl border border-slate-200/70 bg-slate-100 ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className={`rounded-2xl border border-slate-200/70 object-cover ${className}`}
    />
  )
}
