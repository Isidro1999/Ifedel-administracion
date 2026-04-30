'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Inbox } from 'lucide-react'

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
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white/90 py-12 px-4 text-center shadow-dashboard ring-1 ring-slate-900/[0.02]">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 [&>svg]:h-6 [&>svg]:w-6">
        {icon ?? <Inbox strokeWidth={1.75} aria-hidden />}
      </div>
      <h2 className="text-sm font-bold text-slate-900">{title}</h2>
      {description && (
        <p className="max-w-md text-xs leading-relaxed text-slate-500">{description}</p>
      )}
      {actionHref && actionLabel && (
        <Link
          href={actionHref}
          className="mt-2 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          {actionLabel}
        </Link>
      )}
    </div>
  )
}

