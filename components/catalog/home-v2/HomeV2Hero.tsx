import Link from 'next/link'
import Image from 'next/image'
import { IFEDelBrand } from '@/lib/ifedel-brand'

type HomeV2HeroProps = {
  productsHref: string
  inquiryHref: string
}

export function HomeV2Hero({ productsHref, inquiryHref }: HomeV2HeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#0a0a0a] text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 70% 20%, rgba(141,198,64,0.45), transparent 55%), radial-gradient(ellipse 50% 40% at 10% 80%, rgba(131,80,41,0.35), transparent 50%)',
        }}
      />
      <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-ifedel-primary">
            {IFEDelBrand.companyName}
          </p>
          <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Catálogo de soluciones agropecuarias
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 sm:text-lg">
            Explorá productos de {IFEDelBrand.companyName}, armá tu lista de
            consulta y contactanos. Sin compra online: te acompañamos por
            WhatsApp con atención personalizada.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href={productsHref}
              className="inline-flex items-center justify-center rounded-full bg-ifedel-primary px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105"
            >
              Ver productos
            </Link>
            <Link
              href={inquiryHref}
              className="inline-flex items-center justify-center rounded-full border border-white/25 px-6 py-3 text-sm font-semibold text-white transition hover:border-ifedel-primary hover:text-ifedel-primary"
            >
              Armar consulta / WhatsApp
            </Link>
          </div>
        </div>
        <div className="relative mx-auto w-full max-w-md">
          <div className="aspect-[4/3] overflow-hidden rounded-3xl border border-white/10 bg-black/40 shadow-2xl">
            <Image
              src={IFEDelBrand.logo.src}
              alt={IFEDelBrand.companyName}
              width={640}
              height={480}
              className="h-full w-full object-contain p-12"
              priority
            />
          </div>
        </div>
      </div>
    </section>
  )
}
