import { headers } from 'next/headers'
import { permanentRedirect } from 'next/navigation'
import { catalogPath } from '@/lib/catalog-paths'

/**
 * Ruta experimental promocionada a home oficial.
 * Preferir HTTP 308 vía next.config.js redirects; este page es respaldo
 * (p.ej. rewrite de middleware en hosts no listados en config).
 * Domains: /catalogo/home-v2 → /catalogo ; ifedel.com/home-v2 → /
 */
export default function CatalogoHomeV2RedirectPage() {
  const onCatalogHost = headers().get('x-ifedel-catalog') === '1'
  permanentRedirect(catalogPath('', onCatalogHost))
}
