type CatalogCategoryContactCtaProps = {
  contactHref: string
  className?: string
}

export function CatalogCategoryContactCta({
  contactHref,
  className = '',
}: CatalogCategoryContactCtaProps) {
  return (
    <section
      className={`rounded-2xl border border-slate-200/80 bg-white/80 p-6 shadow-sm ${className}`}
    >
      <h2 className="text-lg font-semibold text-slate-900">
        ¿Necesitás ayuda para elegir?
      </h2>
      <p className="mt-2 text-sm text-slate-600">
        Nuestro equipo puede ayudarte a encontrar la mejor opción para tu
        campo.
      </p>
      <a
        href={contactHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-flex rounded-full bg-ifedel-primary px-5 py-2.5 text-sm font-semibold text-black transition hover:brightness-105"
      >
        Contactanos
      </a>
    </section>
  )
}
