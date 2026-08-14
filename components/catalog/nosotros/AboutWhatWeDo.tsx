import { Headphones, MessageCircle, Package, Tags } from 'lucide-react'

const PRINCIPLES = [
  {
    title: 'Atención personalizada',
    line: 'Te orientamos según lo que necesitás.',
    Icon: Headphones,
  },
  {
    title: 'Productos especializados',
    line: 'Soluciones para el trabajo rural y el establecimiento.',
    Icon: Package,
  },
  {
    title: 'Marcas del sector',
    line: 'Distintas marcas disponibles en el catálogo.',
    Icon: Tags,
  },
  {
    title: 'Consulta comercial',
    line: 'Armá tu lista y te cotizamos por WhatsApp.',
    Icon: MessageCircle,
  },
] as const

export function AboutWhatWeDo() {
  return (
    <section
      aria-labelledby="nosotros-hacemos-heading"
      className="border-y border-slate-200/80 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-9">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ifedel-brown">
          Cómo trabajamos
        </p>
        <h2
          id="nosotros-hacemos-heading"
          className="mt-1 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          Principios de servicio
        </h2>

        <ul className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {PRINCIPLES.map((item) => {
            const Icon = item.Icon
            return (
              <li
                key={item.title}
                className="flex gap-3 lg:border-l lg:border-slate-200 lg:px-5 lg:first:border-l-0 lg:first:pl-0 lg:last:pr-0"
              >
                <span
                  className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center text-ifedel-brown"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {item.title}
                  </h3>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600 sm:text-[13px]">
                    {item.line}
                  </p>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
