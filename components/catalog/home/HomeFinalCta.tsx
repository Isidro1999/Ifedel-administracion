import Link from 'next/link'

type HomeFinalCtaProps = {
  productsHref: string
  inquiryHref: string
}

export function HomeFinalCta({
  productsHref,
  inquiryHref,
}: HomeFinalCtaProps) {
  return (
    <section
      aria-labelledby="home-cta-heading"
      className="overflow-hidden rounded-2xl bg-ifedel-primary px-5 py-9 text-black sm:px-8 sm:py-10"
    >
      <div className="flex flex-col gap-7 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
        <div className="min-w-0 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/65">
            Tu consulta, en pocos pasos
          </p>
          <h2
            id="home-cta-heading"
            className="mt-2 text-xl font-bold tracking-tight text-black sm:text-2xl"
          >
            Encontrá lo que necesitás y armá tu consulta
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-black/75">
            Sumá productos a tu lista y envianos todo junto por WhatsApp.
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:shrink-0">
          <Link
            href={productsHref}
            className="inline-flex w-full items-center justify-center rounded-full bg-[#0a0a0a] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:w-auto"
          >
            Explorar productos
          </Link>
          <Link
            href={inquiryHref}
            className="inline-flex w-full items-center justify-center rounded-full border border-black/25 bg-white/90 px-6 py-3 text-sm font-semibold text-black transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black lg:w-auto"
          >
            Ver mi consulta
          </Link>
        </div>
      </div>
    </section>
  )
}
