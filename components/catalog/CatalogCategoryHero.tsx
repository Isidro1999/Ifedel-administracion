import type { CatalogCategoryResolved } from '@/lib/catalog-category-public'
import { CatalogCategoryImage } from '@/components/catalog/CatalogCategoryImage'
import { CatalogPriceDisclaimer } from '@/components/catalog/CatalogPriceDisclaimer'
import type { HomeCategoryIconKey } from '@/components/catalog/home/home-categories'

/** Iconos reutilizables por slug de categoría principal V1. */
const ROOT_CATEGORY_ICONS: Record<string, HomeCategoryIconKey> = {
  'electrificacion-y-alambrados': 'fence',
  'identificacion-y-pesaje-animal': 'scale',
  'esquila-y-peladoras': 'shear',
  'manejo-ganadero': 'farm',
  'agua-y-manejo-hidrico': 'water',
  pasturas: 'farm',
}

type CatalogCategoryHeroProps = {
  category: Pick<
    CatalogCategoryResolved,
    'name' | 'shortDescription' | 'imageUrl' | 'slug'
  >
  description: string
  variant?: 'root' | 'leaf'
}

export function CatalogCategoryHero({
  category,
  description,
  variant = 'root',
}: CatalogCategoryHeroProps) {
  const isRoot = variant === 'root'
  const icon = ROOT_CATEGORY_ICONS[category.slug] ?? 'default'

  if (!isRoot) {
    return (
      <header className="max-w-3xl space-y-3">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">
          {category.name}
        </h1>
        <p className="text-sm leading-relaxed text-slate-600 sm:text-base">
          {description}
        </p>
        <CatalogPriceDisclaimer />
        {category.imageUrl ? (
          <CatalogCategoryImage
            imageUrl={category.imageUrl}
            alt={category.name}
            variant="hero"
            width={640}
            icon={icon}
            className="mt-2 aspect-[16/7] max-w-md"
          />
        ) : null}
      </header>
    )
  }

  return (
    <header className="grid items-center gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-8">
      <div className="min-w-0">
        <h1 className="text-[1.75rem] font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-[2.15rem]">
          {category.name}
        </h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:mt-2.5 sm:text-[0.95rem]">
          {description}
        </p>
        <div className="mt-3">
          <CatalogPriceDisclaimer />
        </div>
      </div>

      <CatalogCategoryImage
        imageUrl={category.imageUrl}
        alt={category.name}
        variant="hero"
        width={900}
        icon={icon}
        className="aspect-[16/8] w-full sm:aspect-[16/7]"
      />
    </header>
  )
}
