'use client'

import { useState } from 'react'
import Image, { type ImageProps } from 'next/image'

export type CatalogCloudinaryImageProps = Omit<
  ImageProps,
  'unoptimized' | 'loader'
>

/**
 * Imágenes de producto alojadas en Cloudinary.
 *
 * Usa `next/image` con `unoptimized` para que el browser pida
 * `res.cloudinary.com` directo (sin `/_next/image` / Vercel Image Optimization).
 * Evita el 402 Hobby cuando Cloudinary ya aplica f_auto / q_auto / c_limit / w_*.
 *
 * Suposición: el caller pasa una URL Cloudinary ya transformada
 * (típicamente vía `getOptimizedImageUrl`). No pensado para `/public`.
 */
export function CatalogCloudinaryImage({
  onError,
  className,
  alt,
  ...props
}: CatalogCloudinaryImageProps) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    if (props.fill) {
      return (
        <span
          className="absolute inset-0 flex items-center justify-center bg-slate-100 text-xs text-slate-400"
          aria-hidden={alt === '' ? true : undefined}
          role={alt ? 'img' : undefined}
          aria-label={alt || undefined}
        >
          Sin imagen
        </span>
      )
    }
    return (
      <span
        className={[
          'inline-flex items-center justify-center bg-slate-100 text-xs text-slate-400',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      >
        Sin imagen
      </span>
    )
  }

  return (
    <Image
      {...props}
      alt={alt}
      className={className}
      unoptimized
      onError={(event) => {
        setFailed(true)
        onError?.(event)
      }}
    />
  )
}
