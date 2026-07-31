import Link from 'next/link'
import type { CatalogCategory } from '@/lib/catalog-client'
import { HomeV2SectionHeading } from '@/components/catalog/home-v2/HomeV2SectionHeading'

const MAX_CATEGORIES = 8

type HomeV2CategoriesProps = {
  categories: CatalogCategory[]
  categoryHref: (slug: string) => string
  productsHref: string
}

export function HomeV2Categories({
  categories,
  categoryHref,
  productsHref,
}: HomeV2CategoriesProps) {
  const visible = categories.slice(0, MAX_CATEGORIES)

  return (
    <section id="categorias" aria-labelledby="home-v2-categorias-heading">
      <HomeV2SectionHeading
        id="home-v2-categorias-heading"
        title="Categorías"
        description="Empezá por el rubro que te interesa."
        action={
          <Link
            href={productsHref}
            className="hidden text-sm font-semibold text-ifedel-brown hover:underline sm:inline"
          >
            Ver todos los productos
          </Link>
        }
      />

      {visible.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white/50 px-4 py-8 text-center text-sm text-slate-500">
          Aún no hay categorías con productos publicados.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((cat) => {
            const count = cat.count ?? 0
            return (
              <Link
                key={cat.id}
                href={categoryHref(cat.slug)}
                className="rounded-2xl border border-slate-200/80 bg-white px-4 py-5 shadow-sm transition hover:border-ifedel-primary/50 hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">{cat.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {count} producto{count === 1 ? '' : 's'}
                </p>
              </Link>
            )
          })}
        </div>
      )}

      <div className="mt-5 text-center sm:hidden">
        <Link
          href={productsHref}
          className="text-sm font-semibold text-ifedel-brown hover:underline"
        >
          Ver todos los productos
        </Link>
      </div>
    </section>
  )
}
