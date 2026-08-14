import { IFEDelBrand } from '@/lib/ifedel-brand'

export function AboutHero() {
  return (
    <section
      aria-labelledby="nosotros-hero-heading"
      className="border-b border-black/10 bg-[#f4f7f0]"
    >
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-ifedel-brown">
          Nosotros
        </p>

        <div className="mt-6 grid items-end gap-8 lg:mt-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,0.75fr)] lg:gap-16">
          <div>
            <h1
              id="nosotros-hero-heading"
              className="text-[2.75rem] font-bold leading-[0.95] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl"
            >
              {IFEDelBrand.companyName}
            </h1>
            <div
              className="mt-5 h-1 w-14 bg-ifedel-primary sm:mt-6 sm:w-16"
              aria-hidden
            />
          </div>

          <div className="max-w-sm lg:border-l lg:border-ifedel-primary/50 lg:pl-10">
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ifedel-brown">
              {IFEDelBrand.tagline}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-[15px]">
              Atención personalizada para elegir el producto adecuado.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
