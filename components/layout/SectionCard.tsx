// components/layout/SectionCard.tsx
import type { ReactNode } from 'react'

type SectionCardProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white/90 p-5 shadow-dashboard ring-1 ring-slate-900/[0.03] backdrop-blur-sm">
      <header className="mb-4 space-y-1">
        <h2 className="text-sm font-bold tracking-tight text-slate-900">{title}</h2>
        {description && <p className="text-xs leading-relaxed text-slate-500">{description}</p>}
      </header>
      {children}
    </section>
  )
}

