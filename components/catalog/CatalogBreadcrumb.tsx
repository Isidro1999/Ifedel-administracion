import Link from 'next/link'

export type CatalogBreadcrumbItem = {
  label: string
  href?: string
}

type CatalogBreadcrumbProps = {
  items: CatalogBreadcrumbItem[]
  className?: string
}

export function CatalogBreadcrumb({
  items,
  className = '',
}: CatalogBreadcrumbProps) {
  return (
    <nav
      className={`text-sm text-slate-500 ${className}`}
      aria-label="Breadcrumb"
    >
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center">
              {index > 0 ? (
                <span className="mr-2 text-slate-400" aria-hidden>
                  →
                </span>
              ) : null}
              {item.href && !isLast ? (
                <Link href={item.href} className="hover:text-ifedel-brown">
                  {item.label}
                </Link>
              ) : (
                <span
                  className={isLast ? 'text-slate-800' : undefined}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export function buildCategoryRootBreadcrumbItems(input: {
  homeHref: string
  categoriasHref: string
  rootName: string
}): CatalogBreadcrumbItem[] {
  return [
    { label: 'Inicio', href: input.homeHref },
    { label: 'Categorías', href: input.categoriasHref },
    { label: input.rootName },
  ]
}

export function buildCategoryLeafBreadcrumbItems(input: {
  homeHref: string
  categoriasHref: string
  rootName: string
  rootHref: string
  leafName: string
}): CatalogBreadcrumbItem[] {
  return [
    { label: 'Inicio', href: input.homeHref },
    { label: 'Categorías', href: input.categoriasHref },
    { label: input.rootName, href: input.rootHref },
    { label: input.leafName },
  ]
}
