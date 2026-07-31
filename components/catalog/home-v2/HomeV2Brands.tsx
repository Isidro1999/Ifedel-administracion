import Image from 'next/image'
import {
  HOME_BRANDS,
  type HomeBrand,
} from '@/components/catalog/home-v2/home-brands'
import { HomeV2SectionHeading } from '@/components/catalog/home-v2/HomeV2SectionHeading'

type HomeV2BrandsProps = {
  brands?: HomeBrand[]
}

/**
 * Franja compacta de marcas (logos).
 * Sin datos: no renderiza en producción; en desarrollo, una línea técnica.
 */
export function HomeV2Brands({ brands = HOME_BRANDS }: HomeV2BrandsProps) {
  if (brands.length === 0) {
    if (process.env.NODE_ENV !== 'development') {
      return null
    }

    return (
      <div className="border-b border-slate-200/70 bg-white/50">
        <p className="mx-auto max-w-6xl px-4 py-2 text-[11px] text-slate-400 sm:px-6">
          Sección de marcas pendiente de configuración
        </p>
      </div>
    )
  }

  return (
    <section
      aria-labelledby="home-v2-marcas-heading"
      className="border-b border-slate-200/80 bg-white/70"
    >
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-6">
        <HomeV2SectionHeading
          id="home-v2-marcas-heading"
          title="Marcas con las que trabajamos"
          description="Productos y soluciones de marcas seleccionadas para el sector."
        />
        <ul className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 snap-x snap-mandatory [scrollbar-width:thin]">
          {brands.map((brand) => {
            const inner = (
              <span className="flex h-14 w-[7.5rem] shrink-0 snap-start items-center justify-center rounded-xl border border-slate-200/90 bg-white px-3 sm:h-16 sm:w-32">
                <Image
                  src={brand.logo}
                  alt={brand.name}
                  width={120}
                  height={48}
                  className="max-h-8 w-auto object-contain sm:max-h-10"
                />
              </span>
            )

            return (
              <li key={brand.name} className="shrink-0">
                {brand.href ? (
                  <a
                    href={brand.href}
                    className="block rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
                  >
                    {inner}
                  </a>
                ) : (
                  inner
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
