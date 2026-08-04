import Link from 'next/link'
import type { HomeCategoryItem } from '@/components/catalog/home/home-categories'
import { HomeSectionHeading } from '@/components/catalog/home/HomeSectionHeading'
import { HomeCategoryCard } from '@/components/catalog/home/HomeCategoryCard'

type HomeCategoriesProps = {
  categories: HomeCategoryItem[]
  productsHref: string
}

export function HomeCategories({
  categories,
  productsHref,
}: HomeCategoriesProps) {
  const productsCta = (
    <Link
      href={productsHref}
      className="text-sm font-semibold text-ifedel-brown underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
    >
      Ver todos los productos
    </Link>
  )

  return (
    <section id="categorias" aria-labelledby="home-categorias-heading">
      <HomeSectionHeading
        id="home-categorias-heading"
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
        <ul className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
          {categories.map((cat) => (
            <li key={cat.id} className="min-w-0">
              <HomeCategoryCard category={cat} />
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
