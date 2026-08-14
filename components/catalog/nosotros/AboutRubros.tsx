import Link from 'next/link'
import type { CatalogCategory } from '@/lib/catalog-client'
import {
  HOME_CATEGORY_ICONS,
  type HomeCategoryIconKey,
} from '@/components/catalog/home/home-categories'
import { HomeCategoryIcon } from '@/components/catalog/home/HomeCategoryIcon'

type RubroGroup = {
  title: string
  description: string
  slugs: readonly string[]
}

const RUBRO_GROUPS: readonly RubroGroup[] = [
  {
    title: 'Electrificación rural',
    description:
      'Energizadores y accesorios para alambrado eléctrico.',
    slugs: ['electrificacin-energizadores', 'electrificacin-accesorios'],
  },
  {
    title: 'Ganadería e identificación',
    description: 'Pesaje, lectores y caravanas para el manejo del rodeo.',
    slugs: ['pesaje-e-ide', 'lectores', 'identificacion'],
  },
  {
    title: 'Alambrados y equipamiento',
    description:
      'Cierres, postes y soluciones para el trabajo en el establecimiento.',
    slugs: ['gripple', 'postes-y-varillas'],
  },
]

export type AboutRubroItem = {
  title: string
  description: string
  href: string | null
  icon: HomeCategoryIconKey
}

export function selectAboutRubros(
  categories: CatalogCategory[],
  hrefForSlug: (slug: string) => string,
): AboutRubroItem[] {
  const bySlug = new Map(categories.map((c) => [c.slug, c]))

  return RUBRO_GROUPS.map((group) => {
    const match = group.slugs
      .map((slug) => bySlug.get(slug))
      .find((cat) => cat != null)

    return {
      title: group.title,
      description: group.description,
      href: match ? hrefForSlug(match.slug) : null,
      icon: match
        ? (HOME_CATEGORY_ICONS[match.slug] ?? 'default')
        : 'default',
    }
  })
}

type AboutRubrosProps = {
  rubros: AboutRubroItem[]
  productsHref: string
}

export function AboutRubros({ rubros, productsHref }: AboutRubrosProps) {
  return (
    <section aria-labelledby="nosotros-rubros-heading">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ifedel-brown">
            Rubros
          </p>
          <h2
            id="nosotros-rubros-heading"
            className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            En qué trabajamos
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
            Tres líneas representativas de la oferta. El catálogo completo
            está en productos.
          </p>
        </div>
        <Link
          href={productsHref}
          className="shrink-0 text-sm font-semibold text-ifedel-brown underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
        >
          Ver todos los productos
        </Link>
      </div>

      <ol className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
        {rubros.map((item, index) => {
          const inner = (
            <>
              <span className="w-10 shrink-0 font-mono text-sm text-slate-400">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span
                className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center text-ifedel-brown"
                aria-hidden
              >
                <HomeCategoryIcon name={item.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold text-slate-900">
                  {item.title}
                </span>
                <span className="mt-0.5 block text-sm leading-relaxed text-slate-600">
                  {item.description}
                </span>
              </span>
            </>
          )

          if (item.href) {
            return (
              <li key={item.title}>
                <Link
                  href={item.href}
                  className="flex items-start gap-3 py-5 transition-colors hover:bg-[#eef6e3]/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary sm:gap-4"
                >
                  {inner}
                </Link>
              </li>
            )
          }

          return (
            <li
              key={item.title}
              className="flex items-start gap-3 py-5 sm:gap-4"
            >
              {inner}
            </li>
          )
        })}
      </ol>
    </section>
  )
}
