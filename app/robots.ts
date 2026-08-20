import type { MetadataRoute } from 'next'
import { headers } from 'next/headers'
import {
  isCatalogHostName,
  shouldDisallowRobotsCrawling,
} from '@/lib/catalog-paths'

/**
 * robots.txt host-aware.
 * - ifedel.com / catalogo.localhost → allow catálogo (sin Sitemap hasta P5.3).
 * - app.ifedel.com / *.vercel.app → Disallow: /
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
