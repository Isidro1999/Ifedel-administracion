import Image from 'next/image'
import { HOME_BRANDS } from '@/components/catalog/home/home-brands'

export function AboutBrandWall() {
  return (
    <section
      aria-labelledby="nosotros-marcas-heading"
      className="border-y border-slate-200/80 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <h2
          id="nosotros-marcas-heading"
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          Trabajamos con marcas del sector
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Seleccionamos productos de distintas marcas y líneas para ofrecer
          alternativas según cada necesidad.
        </p>

        <ul className="mt-8 grid grid-cols-2 border-t border-l border-slate-200 sm:grid-cols-3 lg:grid-cols-5">
          {HOME_BRANDS.map((brand) => (
            <li
              key={brand.logo}
              className="group relative flex min-h-[7.5rem] flex-col items-center justify-center gap-1.5 border-b border-r border-slate-200 px-2.5 py-2.5 sm:min-h-[8rem] sm:px-3 lg:min-h-[8.25rem]"
            >
              <Image
                src={brand.logo}
                alt={`Logo de ${brand.name}`}
                width={220}
                height={96}
                sizes="(max-width: 640px) 44vw, (max-width: 1024px) 28vw, 200px"
                className="h-auto max-h-[3.75rem] w-auto max-w-[94%] object-contain transition-opacity duration-200 sm:max-h-[4.35rem] lg:max-h-[4.85rem] sm:group-hover:opacity-70"
              />
              <span className="text-center text-[11px] font-medium leading-tight text-slate-500 sm:pointer-events-none sm:absolute sm:inset-x-2 sm:bottom-2 sm:translate-y-0.5 sm:text-xs sm:opacity-0 sm:transition-all sm:duration-200 sm:group-hover:translate-y-0 sm:group-hover:opacity-100">
                {brand.name}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
