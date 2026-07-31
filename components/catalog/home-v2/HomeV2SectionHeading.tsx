import type { ReactNode } from 'react'

type HomeV2SectionHeadingProps = {
  id: string
  title: string
  description?: string
  action?: ReactNode
}

/** Encabezado uniforme de secciones de la home V2. */
export function HomeV2SectionHeading({
  id,
  title,
  description,
  action,
}: HomeV2SectionHeadingProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4 sm:mb-6">
      <div className="min-w-0">
        <h2
          id={id}
          className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl"
        >
          {title}
        </h2>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  )
}
