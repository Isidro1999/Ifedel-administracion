'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

type EmptyStateProps = {
  title: string
  description?: string
  actionLabel?: string
  actionHref?: string
  icon?: ReactNode
}

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  icon,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-gray-200 bg-white py-10 px-4 text-center">
      {icon && <div className="text-3xl text-gray-300">{icon}</div>}
      <h2 className="text-sm font-semibold text-ifedel-black">{title}</h2>
      {description && (
        <p className="max-w-md text-xs text-gray-500">{description}</p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center justify-center rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

