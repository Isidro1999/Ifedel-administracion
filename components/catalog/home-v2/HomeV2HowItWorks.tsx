const STEPS = [
  {
    step: '1',
    title: 'Explorá productos',
    description:
      'Navegá por categorías o el listado completo y abrí la ficha de cada producto.',
  },
  {
    step: '2',
    title: 'Agregalos a tu consulta',
    description:
      'Sumá los productos que te interesan a tu lista de consulta, con la cantidad que necesitás.',
  },
  {
    step: '3',
    title: 'Enviala por WhatsApp',
    description:
      'Enviá la consulta y te respondemos con asesoramiento y cotización.',
  },
] as const

export function HomeV2HowItWorks() {
  return (
    <section
      aria-labelledby="home-v2-como-funciona-heading"
      className="rounded-3xl border border-slate-200/80 bg-white px-5 py-10 sm:px-8"
    >
      <h2
        id="home-v2-como-funciona-heading"
        className="text-2xl font-bold tracking-tight text-slate-900"
      >
        Cómo funciona la consulta
      </h2>
      <p className="mt-1 max-w-2xl text-sm text-slate-600">
        No hay compra online. Armá tu lista y escribinos para recibir
        acompañamiento comercial.
      </p>
      <ol className="mt-8 grid gap-6 sm:grid-cols-3">
        {STEPS.map((item) => (
          <li key={item.step} className="flex flex-col gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-ifedel-primary text-sm font-bold text-black">
              {item.step}
            </span>
            <h3 className="text-base font-semibold text-slate-900">
              {item.title}
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </section>
  )
}
