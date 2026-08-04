import Link from 'next/link'
import Image from 'next/image'
import { IFEDelBrand } from '@/lib/ifedel-brand'

type HomeHeroProps = {
  productsHref: string
  inquiryHref: string
}

const RUBROS = [
  'Agro',
  'Ganadería',
  'Electrificación rural',
] as const

export function HomeHero({ productsHref, inquiryHref }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden bg-[#0a0a0a] text-white"
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 85% 15%, rgba(141,198,64,0.22), transparent 55%), radial-gradient(ellipse 45% 40% at 5% 90%, rgba(131,80,41,0.18), transparent 50%)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:gap-10 sm:px-6 sm:py-14 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-ifedel-primary sm:text-sm">
            {IFEDelBrand.companyName} · {IFEDelBrand.tagline}
          </p>
          <h1
            id="home-hero-heading"
            className="mt-3 max-w-xl text-[1.85rem] font-bold leading-[1.15] tracking-tight sm:mt-4 sm:text-4xl sm:leading-[1.12] lg:text-[2.75rem] lg:leading-[1.1]"
          >
            Soluciones para el campo, en un solo lugar
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/75 sm:mt-5 sm:text-base">
            Explorá productos para electrificación rural, alambrados, pesaje,
            ganadería y más. Armá tu consulta y recibí asesoramiento por
            WhatsApp.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:items-center">
              <Link
              href={productsHref}
              className="inline-flex items-center justify-center rounded-full bg-ifedel-primary px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
            >
              Explorar productos
            </Link>
            <Link
              href={inquiryHref}
              className="inline-flex items-center justify-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:border-ifedel-primary hover:text-ifedel-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
            >
              Armar consulta
            </Link>
          </div>
        </div>

        {/* Panel gráfico temporal: solo assets locales (logo IFEDEL). */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent px-6 py-8 sm:px-8 sm:py-10">
            <div
              className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-ifedel-primary/50 to-transparent"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-ifedel-primary/10 blur-2xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-10 -left-6 h-28 w-28 rounded-full bg-ifedel-brown/20 blur-2xl"
              aria-hidden
            />

            <div className="relative flex flex-col items-start gap-6">
              <Image
                src={IFEDelBrand.logo.src}
                alt={IFEDelBrand.companyName}
                width={160}
                height={42}
                className="h-9 w-auto sm:h-10"
                priority
              />
              <p className="max-w-[16rem] text-sm leading-snug text-white/70">
                Catálogo online para consultas y cotizaciones del sector
                agropecuario.
              </p>
              <ul className="flex flex-wrap gap-2">
                {RUBROS.map((rubro) => (
                  <li
                    key={rubro}
                    className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-medium tracking-wide text-white/80"
                  >
                    {rubro}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
