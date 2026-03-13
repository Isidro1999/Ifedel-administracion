// components/layout/PageHeader.tsx
import type { ReactNode } from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ifedel-black">
          {title}
        </h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2">
          {actions}
        </div>
      )}
    </div>
  )
}

