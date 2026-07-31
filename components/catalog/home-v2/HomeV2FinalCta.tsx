import Link from 'next/link'

type HomeV2FinalCtaProps = {
  productsHref: string
  inquiryHref: string
}

export function HomeV2FinalCta({
  productsHref,
  inquiryHref,
}: HomeV2FinalCtaProps) {
  return (
    <section
      aria-labelledby="home-v2-cta-heading"
      className="rounded-2xl border border-slate-200/80 bg-white px-5 py-10 text-center sm:px-8 sm:py-11"
    >
      <h2
        id="home-v2-cta-heading"
        className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
      >
        ¿Listo para armar tu consulta?
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-600">
        Explorá el catálogo, sumá productos a tu lista y envianos tu consulta
        por WhatsApp.
      </p>
      <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Link
          href={productsHref}
          className="inline-flex w-full items-center justify-center rounded-full bg-ifedel-primary px-6 py-3 text-sm font-semibold text-black transition hover:brightness-105 sm:w-auto"
        >
          Explorar productos
        </Link>
        <Link
          href={inquiryHref}
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:border-ifedel-primary hover:bg-ifedel-primary/10 sm:w-auto"
        >
          Armar consulta
        </Link>
      </div>
    </section>
  )
}
