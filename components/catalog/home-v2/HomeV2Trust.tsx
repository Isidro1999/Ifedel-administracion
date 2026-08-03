import { Headphones, PackageSearch, MessagesSquare } from 'lucide-react'
import { IFEDelBrand } from '@/lib/ifedel-brand'

const BENEFITS = [
  {
    title: 'Atención personalizada',
    description: 'Te orientamos según lo que necesitás.',
    Icon: Headphones,
  },
  {
    title: 'Consulta de disponibilidad',
    description: 'Confirmamos qué productos están disponibles.',
    Icon: PackageSearch,
  },
  {
    title: 'Cotización por WhatsApp',
    description: 'Recibís la cotización en el mismo canal de consulta.',
    Icon: MessagesSquare,
  },
] as const

function phoneHref(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  return digits ? `tel:+${digits}` : `tel:${phone}`
}

export function HomeV2Trust() {
  return (
    <section
      aria-labelledby="home-v2-confianza-heading"
      className="rounded-2xl border border-ifedel-primary/25 bg-[#eef6e3] px-5 py-8 sm:px-8 sm:py-9"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:items-start lg:gap-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ifedel-brown">
            Atención comercial
          </p>
          <h2
            id="home-v2-confianza-heading"
            className="mt-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
          >
            Te ayudamos a encontrar la opción adecuada
          </h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-700">
            Contanos qué necesitás y te orientamos entre los productos
            disponibles del catálogo.
          </p>

          <div className="mt-5 flex flex-col gap-1.5 text-sm text-slate-700 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-1">
            <a
              href={phoneHref(IFEDelBrand.phone)}
              className="font-medium text-ifedel-brown underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
            >
              {IFEDelBrand.phone}
            </a>
            <a
              href={`mailto:${IFEDelBrand.email}`}
              className="font-medium text-ifedel-brown underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary break-all sm:break-normal"
            >
              {IFEDelBrand.email}
            </a>
          </div>
        </div>

        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {BENEFITS.map((item) => {
            const Icon = item.Icon
            return (
              <li
                key={item.title}
                className="flex gap-3 rounded-xl border border-white/70 bg-white/70 px-3.5 py-3"
              >
                <span
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ifedel-primary/20 text-ifedel-brown"
                  aria-hidden
                >
                  <Icon className="h-4 w-4" strokeWidth={2} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-slate-900">
                    {item.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-600">
                    {item.description}
                  </span>
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
