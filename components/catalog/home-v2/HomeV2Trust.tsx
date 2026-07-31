import { IFEDelBrand } from '@/lib/ifedel-brand'

const POINTS = [
  'Atención personalizada para tu consulta.',
  'Asesoramiento para encontrar el producto adecuado.',
  'Consulta de disponibilidad y cotización por WhatsApp.',
] as const

export function HomeV2Trust() {
  return (
    <section
      aria-labelledby="home-v2-confianza-heading"
      className="rounded-2xl border border-ifedel-brown/15 bg-[#0a0a0a] px-5 py-8 text-white sm:px-8 sm:py-9"
    >
      <h2
        id="home-v2-confianza-heading"
        className="text-xl font-bold tracking-tight sm:text-2xl"
      >
        Trabajamos con vos
      </h2>
      <p className="mt-1 text-sm text-white/70">
        {IFEDelBrand.companyName} · {IFEDelBrand.tagline}
      </p>
      <ul className="mt-6 space-y-3">
        {POINTS.map((point) => (
          <li key={point} className="flex gap-3 text-sm leading-relaxed text-white/85">
            <span
              className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ifedel-primary"
              aria-hidden
            />
            {point}
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm text-white/55">
        {IFEDelBrand.phone} · {IFEDelBrand.email}
      </p>
    </section>
  )
}
