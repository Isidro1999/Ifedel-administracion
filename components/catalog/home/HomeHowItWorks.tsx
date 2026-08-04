import { LayoutGrid, ListChecks, MessageCircle } from 'lucide-react'

const STEPS = [
  {
    step: '1',
    title: 'Explorá el catálogo',
    description:
      'Buscá por categoría o recorré todos los productos disponibles.',
    Icon: LayoutGrid,
  },
  {
    step: '2',
    title: 'Armá tu lista',
    description:
      'Agregá los productos que te interesan y ajustá las cantidades.',
    Icon: ListChecks,
  },
  {
    step: '3',
    title: 'Enviala por WhatsApp',
    description:
      'Recibimos tu consulta y te respondemos con disponibilidad, asesoramiento y cotización.',
    Icon: MessageCircle,
  },
] as const

export function HomeHowItWorks() {
  return (
    <section
      aria-labelledby="home-como-funciona-heading"
      className="rounded-2xl border border-slate-200/80 bg-white px-5 py-8 sm:px-8 sm:py-9"
    >
      <h2
        id="home-como-funciona-heading"
        className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
      >
        Cómo funciona la consulta
      </h2>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
        Elegí los productos que necesitás y envianos tu consulta por WhatsApp.
      </p>

      <ol className="mt-8 grid gap-5 sm:grid-cols-3 sm:gap-4 lg:gap-6">
        {STEPS.map((item, index) => {
          const Icon = item.Icon
          return (
            <li key={item.step} className="relative flex h-full flex-col">
              {index < STEPS.length - 1 ? (
                <span
                  className="pointer-events-none absolute left-[calc(50%+2.5rem)] right-[-0.75rem] top-7 hidden h-px bg-gradient-to-r from-ifedel-primary/50 to-slate-200 sm:block lg:left-[calc(50%+3rem)]"
                  aria-hidden
                />
              ) : null}

              <div className="flex h-full flex-col rounded-2xl border border-slate-100 bg-[#fbfef7] px-4 py-5 sm:px-5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ifedel-primary text-sm font-bold text-black">
                    {item.step}
                  </span>
                  <span
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-ifedel-brown ring-1 ring-ifedel-primary/25"
                    aria-hidden
                  >
                    <Icon className="h-4 w-4" strokeWidth={2} />
                  </span>
                </div>
                <h3 className="mt-4 text-base font-semibold text-slate-900">
                  {item.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  {item.description}
                </p>
              </div>
            </li>
          )
        })}
      </ol>

      <p className="mt-6 text-xs leading-relaxed text-slate-500">
        La consulta no implica una compra ni una reserva automática.
      </p>
    </section>
  )
}
