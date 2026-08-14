import Image from 'next/image'
import { IFEDelBrand } from '@/lib/ifedel-brand'

const FOCUS = [
  'Electrificación rural',
  'Ganadería',
  'Alambrados',
  'Pesaje',
] as const

export function AboutWhoWeAre() {
  return (
    <section
      aria-labelledby="nosotros-quienes-heading"
      className="grid items-stretch gap-8 lg:grid-cols-2 lg:gap-12"
    >
      <div className="flex flex-col justify-center py-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-ifedel-brown">
          Quiénes somos
        </p>
        <h2
          id="nosotros-quienes-heading"
          className="mt-2 max-w-md text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem] sm:leading-snug"
        >
          Soluciones y equipamiento para el trabajo en el campo
        </h2>
        <div className="mt-5 max-w-lg space-y-4 text-sm leading-relaxed text-slate-700 sm:text-base">
          <p>
            {IFEDelBrand.companyName} comercializa productos y soluciones
            para electrificación rural, ganadería, alambrados, pesaje y
            otras necesidades del establecimiento.
          </p>
          <p>
            La atención y el asesoramiento son parte central de la
            propuesta: te ayudamos a elegir según cada necesidad, sin
            una compra online automática.
          </p>
        </div>
      </div>

      <div className="relative min-h-[18rem] overflow-hidden rounded-2xl bg-[#0a0a0a] sm:min-h-[22rem] lg:min-h-[26rem]">
        <Image
          src="/catalog/categories/pexels-seba-763269.jpg"
          alt=""
          fill
          sizes="(max-width: 1024px) 100vw, 50vw"
          className="object-cover object-center opacity-60"
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/45 to-black/20"
          aria-hidden
        />
        <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-ifedel-primary">
            {IFEDelBrand.companyName}
          </p>
          <ul className="mt-4 space-y-2">
            {FOCUS.map((item) => (
              <li
                key={item}
                className="border-l-2 border-ifedel-primary pl-3 text-sm font-medium text-white sm:text-base"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
