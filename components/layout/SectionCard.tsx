// components/layout/SectionCard.tsx
import type { ReactNode } from 'react'

type SectionCardProps = {
  title: string
  description?: string
  children: ReactNode
}

export function SectionCard({ title, description, children }: SectionCardProps) {
  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4">
      <header className="mb-3 space-y-1">
        <h2 className="text-sm font-semibold text-ifedel-black">
          {title}
        </h2>
        {description && (
          <p className="text-xs text-gray-500">{description}</p>
        )}
      </header>
      {children}
    </section>
  )
}

