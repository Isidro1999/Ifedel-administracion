import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import {
  CATALOG_PUBLIC_ORIGIN,
  isCatalogHostName,
  shouldDisallowRobotsCrawling,
} from '@/lib/catalog-paths'

/**
 * robots.txt host-aware.
 * - ifedel.com / catalogo.localhost → allow catálogo + Sitemap público.
 * - app.ifedel.com / *.vercel.app → Disallow: / (sin Sitemap).
 * Complementa metadata noindex del backoffice; no es la única defensa.
 */
export default function robots(): MetadataRoute.Robots {
  const host = headers().get('host') || ''

  if (isCatalogHostName(host)) {
    return {
      rules: {
        userAgent: '*',
        allow: '/',
      },
      sitemap: `${CATALOG_PUBLIC_ORIGIN}/sitemap.xml`,
    }
  }

  if (shouldDisallowRobotsCrawling(host)) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  // localhost / otros hosts de desarrollo: desalentar indexación accidental.
  return {
    rules: {
      userAgent: '*',
      disallow: '/',
    },
  }
}
