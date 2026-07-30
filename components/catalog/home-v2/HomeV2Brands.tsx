export type HomeBrand = {
  name: string
  logo: string
  href?: string
}

type HomeV2BrandsProps = {
  brands?: HomeBrand[]
}

/**
 * Sección preparada para un carrusel/logos de marcas (Etapa posterior).
 * Sin datos: no renderiza en producción; en desarrollo muestra un placeholder.
 */
export function HomeV2Brands({ brands = [] }: HomeV2BrandsProps) {
  if (brands.length === 0) {
    if (process.env.NODE_ENV !== 'development') {
      return null
    }

    return (
      <section aria-label="Marcas" className="border-b border-dashed border-slate-300/80 bg-white/40">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Marcas con las que trabajamos
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Próximamente vas a ver aquí las marcas disponibles en el catálogo.
          </p>
          <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            Placeholder de marcas (solo visible en desarrollo)
          </div>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Marcas" className="border-b border-slate-200/80 bg-white/40">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
          Marcas con las que trabajamos
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Algunas de las marcas disponibles en el catálogo.
        </p>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {brands.map((brand) => (
            <li
              key={brand.name}
              className="flex items-center justify-center rounded-2xl border border-slate-200/80 bg-white px-3 py-6 text-center text-sm font-medium text-slate-700"
            >
              {brand.href ? (
                <a href={brand.href} className="hover:text-ifedel-brown">
                  {brand.name}
                </a>
              ) : (
                brand.name
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
