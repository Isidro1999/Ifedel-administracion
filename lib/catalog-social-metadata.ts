/**
 * Open Graph / Twitter metadata del catálogo público.
 * Fallback institucional: logo IFEDEL (no hay asset 1200×630 dedicado aún).
 */

import type { Metadata } from 'next'
import { HOME_CATEGORY_IMAGES } from '@/components/catalog/home/home-categories'
import { CATALOG_PUBLIC_ORIGIN } from '@/lib/catalog-paths'
import { IFEDelBrand } from '@/lib/ifedel-brand'

export const CATALOG_DEFAULT_OG_DESCRIPTION =
  'Catálogo online de productos y soluciones agropecuarias de IFEDEL.'

/** Mejor asset institucional existente (logo). Cuadrado 800×800 — no ideal OG. */
export const CATALOG_OG_FALLBACK = {
  path: IFEDelBrand.logo.src,
  width: 800,
  height: 800,
  alt: IFEDelBrand.companyName,
} as const

export function catalogPublicAbsoluteUrl(path: string = ''): string {
  const segment = (path || '').replace(/^\/+/, '')
  if (!segment) return `${CATALOG_PUBLIC_ORIGIN}/`
  return `${CATALOG_PUBLIC_ORIGIN}/${segment}`
}

/** Absoluta: Cloudinary/http tal cual; path local → apex público. */
export function catalogSocialImageUrl(pathOrUrl: string): string {
  const raw = pathOrUrl.trim()
  if (/^https?:\/\//i.test(raw)) return raw
  return catalogPublicAbsoluteUrl(raw.replace(/^\//, ''))
}

type OgImage = {
  url: string
  width?: number
  height?: number
  alt?: string
}

export function resolveCatalogOgImage(opts?: {
  image?: string | null
  alt?: string
}): OgImage {
  const custom = opts?.image?.trim()
  if (custom) {
    return {
      url: catalogSocialImageUrl(custom),
      alt: opts?.alt?.trim() || undefined,
    }
  }
  return {
    url: catalogSocialImageUrl(CATALOG_OG_FALLBACK.path),
    width: CATALOG_OG_FALLBACK.width,
    height: CATALOG_OG_FALLBACK.height,
    alt: opts?.alt?.trim() || CATALOG_OG_FALLBACK.alt,
  }
}

export function catalogCategorySocialImagePath(
  slug: string,
): string | null {
  return HOME_CATEGORY_IMAGES[slug] ?? null
}

/**
 * Open Graph + Twitter para una URL pública del catálogo.
 * `path`: "" | "productos" | "productos/slug" | "categorias/slug" | "nosotros"
 */
export function catalogSocialMetadata(opts: {
  title: string
  description: string
  path: string
  image?: string | null
  imageAlt?: string
}): Pick<Metadata, 'openGraph' | 'twitter'> {
  const ogImage = resolveCatalogOgImage({
    image: opts.image,
    alt: opts.imageAlt,
  })
  const url = catalogPublicAbsoluteUrl(opts.path)

  return {
    openGraph: {
      type: 'website',
      locale: 'es_AR',
      siteName: IFEDelBrand.companyName,
      title: opts.title,
      description: opts.description,
      url,
      images: [ogImage],
    },
    twitter: {
      card: 'summary_large_image',
      title: opts.title,
      description: opts.description,
      images: [ogImage.url],
    },
  }
}
