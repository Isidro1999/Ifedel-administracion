import { AboutArgentinaMap } from '@/components/catalog/nosotros/AboutArgentinaMap'

const CHIPS = ['Cobertura nacional', 'Coordinación personalizada'] as const

export function AboutNationalCoverage() {
  return (
    <section
      aria-labelledby="nosotros-cobertura-heading"
      className="bg-[#0a0a0a] text-white"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-12 sm:px-6 sm:py-14 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] lg:gap-6 lg:py-16">
        <div className="order-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ifedel-primary">
            Cobertura nacional
          </p>
          <h2
            id="nosotros-cobertura-heading"
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl"
          >
            Envíos a todo el país
          </h2>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-white/75 sm:text-base">
            Coordinamos envíos a distintas localidades según el producto, el
            volumen y el destino. Armá tu consulta y te ayudamos a definir
            la modalidad de entrega.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {CHIPS.map((chip) => (
              <li
                key={chip}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/85"
              >
                {chip}
              </li>
            ))}
          </ul>
        </div>

        <div className="order-2 min-w-0 overflow-hidden">
          <AboutArgentinaMap />
        </div>
      </div>
    </section>
  )
}
