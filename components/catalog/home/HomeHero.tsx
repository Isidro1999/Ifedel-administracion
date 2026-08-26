import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight } from 'lucide-react'
import { IFEDelBrand } from '@/lib/ifedel-brand'

type HomeHeroProps = {
  productsHref: string
  inquiryHref: string
}

const HERO_BG = '/catalog/home/ifedel-hero-bg.jpg'
const HERO_LOGO = '/brand/ifedel-hero-wordmark.png'

const BENEFITS = [
  {
    title: 'Marcas líderes',
    description: 'Trabajamos con las mejores marcas.',
  },
  {
    title: 'Asesoramiento',
    description: 'Te ayudamos a elegir la mejor solución.',
  },
  {
    title: 'Envíos a todo el país',
    description: 'Llevamos nuestros productos a donde los necesites.',
  },
] as const

export function HomeHero({ productsHref, inquiryHref }: HomeHeroProps) {
  return (
    <section
      aria-labelledby="home-hero-heading"
      className="relative overflow-hidden text-white"
    >
      <div className="relative isolate min-h-[24rem] sm:min-h-[25.5rem] lg:min-h-[27rem] xl:min-h-[28.5rem]">
        <Image
          src={HERO_BG}
          alt=""
          fill
          priority
          sizes="100vw"
          unoptimized
          className="z-0 object-cover object-[68%_center]"
          aria-hidden
        />

        {/* Scrim: más fuerte a la izquierda para legibilidad */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-black/85 via-black/55 to-black/25"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-black/50 via-transparent to-black/25"
          aria-hidden
        />

        <div className="relative z-[2] mx-auto flex h-full min-h-[24rem] max-w-[1400px] flex-col px-4 py-4 sm:min-h-[25.5rem] sm:px-6 sm:py-5 lg:min-h-[27rem] lg:px-8 lg:py-6 xl:min-h-[28.5rem]">
          {/* Top bar: logo + chip */}
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 shrink">
              <Image
                src={HERO_LOGO}
                alt={IFEDelBrand.companyName}
                width={972}
                height={128}
                priority
                unoptimized
                sizes="(max-width: 640px) 14rem, 16rem"
                className="h-8 w-auto max-w-[min(100%,14rem)] object-contain object-left sm:h-9 sm:max-w-[16rem]"
              />
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.2em] text-white/70 sm:text-[11px]">
                {IFEDelBrand.tagline}
              </p>
            </div>

            <p className="hidden shrink-0 items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] text-white/65 backdrop-blur-sm md:inline-flex">
              <span
                className="h-1 w-1 rounded-full bg-ifedel-primary/90"
                aria-hidden
              />
              Catálogo público · ifedel.com
            </p>
          </div>

          {/* Copy */}
          <div className="mt-5 max-w-xl sm:mt-6 lg:mt-7 lg:max-w-2xl">
            <h1
              id="home-hero-heading"
              className="text-[1.85rem] font-bold leading-[1.12] tracking-tight text-white sm:text-4xl sm:leading-[1.1] lg:text-[2.65rem] lg:leading-[1.08] xl:text-[2.85rem]"
            >
              Soluciones para el campo, en un solo lugar
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/80 sm:mt-3.5 sm:text-base">
              Explorá productos para electrificación rural, identificación
              animal, esquila, manejo ganadero y agua. Armá tu consulta y
              recibí asesoramiento comercial.
            </p>
          </div>

          {/* CTAs + trust bar: misma franja horizontal en desktop */}
          <div className="mt-5 flex w-full flex-col gap-4 sm:mt-5 lg:mt-6 lg:flex-row lg:items-center lg:justify-between lg:gap-6 xl:gap-8">
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Link
                href={productsHref}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-ifedel-primary px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
              >
                Explorar productos
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href={inquiryHref}
                className="inline-flex items-center justify-center rounded-full border border-white/35 bg-black/20 px-6 py-3 text-sm font-semibold text-white backdrop-blur-[2px] transition hover:border-white/55 hover:bg-black/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Armar consulta
              </Link>
            </div>

            <ul className="grid w-full min-w-0 grid-cols-1 gap-px overflow-hidden rounded-xl border border-white/15 bg-white/10 backdrop-blur-md sm:grid-cols-3 lg:ml-auto lg:w-auto lg:max-w-[32rem] xl:max-w-[34rem]">
              {BENEFITS.map((item) => (
                <li
                  key={item.title}
                  className="bg-black/45 px-3.5 py-2.5 sm:px-3 sm:py-2.5 lg:px-3"
                >
                  <p className="flex items-center gap-2 text-[13px] font-semibold leading-tight text-white">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full bg-ifedel-primary"
                      aria-hidden
                    />
                    {item.title}
                  </p>
                  <p className="mt-0.5 pl-3.5 text-[11px] leading-snug text-white/60">
                    {item.description}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
