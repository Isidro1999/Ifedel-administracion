import Link from 'next/link'
import type { CatalogBrand } from '@/lib/catalog-client'

type CatalogBrandChipsProps = {
  brands: CatalogBrand[]
  /** Path de la categoría sin query (respeta prefijo / subdominio). */
  basePath: string
  /** Slug de marca activo; vacío = Todas. */
  activeBrandSlug?: string
}

/**
 * Filtro por marca en páginas de categoría (Server Component).
 * Links compartibles; al cambiar marca siempre vuelve a página 1.
 */
export function CatalogBrandChips({
  brands,
  basePath,
  activeBrandSlug = '',
}: CatalogBrandChipsProps) {
  if (brands.length === 0) return null

  const active = activeBrandSlug.trim()

  const chipClass = (isActive: boolean) =>
    [
      'inline-flex shrink-0 items-center rounded-full border px-3.5 py-2 text-sm font-medium transition',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary',
      isActive
        ? 'border-ifedel-primary bg-ifedel-primary text-black'
        : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50',
    ].join(' ')

  return (
    <nav aria-label="Filtrar por marca" className="min-w-0">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:overflow-visible sm:px-0">
        <ul className="flex w-max gap-2 sm:w-auto sm:flex-wrap">
          <li>
            <Link
              href={basePath}
              className={chipClass(!active)}
              aria-current={!active ? 'page' : undefined}
            >
              Todas
            </Link>
          </li>
          {brands.map((brand) => {
            const isActive = active === brand.slug
            return (
              <li key={brand.id}>
                <Link
                  href={`${basePath}?brand=${encodeURIComponent(brand.slug)}`}
                  className={chipClass(isActive)}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {brand.name}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>
    </nav>
  )
}
