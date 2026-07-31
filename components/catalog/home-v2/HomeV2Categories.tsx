import Link from 'next/link'
import type { HomeCategoryItem } from '@/components/catalog/home-v2/home-categories'
import { HomeV2SectionHeading } from '@/components/catalog/home-v2/HomeV2SectionHeading'
import { HomeV2CategoryCard } from '@/components/catalog/home-v2/HomeV2CategoryCard'

type HomeV2CategoriesProps = {
  categories: HomeCategoryItem[]
  productsHref: string
}

export function HomeV2Categories({
  categories,
  productsHref,
}: HomeV2CategoriesProps) {
  const productsCta = (
    <Link
      href={productsHref}
      className="text-sm font-semibold text-ifedel-brown underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
    >
      Ver todos los productos
    </Link>
  )

  return (
    <section id="categorias" aria-labelledby="home-v2-categorias-heading">
      <HomeV2SectionHeading
        id="home-v2-categorias-heading"
        title="Categorías"
        description="Empezá por el rubro que te interesa."
        action={<span className="hidden sm:inline">{productsCta}</span>}
      />

      {categories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">
            Aún no hay categorías con productos publicados.
          </p>
          <div className="mt-4">{productsCta}</div>
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
          {categories.map((cat) => (
            <li key={cat.id} className="min-w-0">
              <HomeV2CategoryCard category={cat} />
            </li>
          ))}
        </ul>
      )}

      {categories.length > 0 ? (
        <div className="mt-5 text-center sm:hidden">{productsCta}</div>
      ) : null}
    </section>
  )
}
