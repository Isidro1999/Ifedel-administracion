import type { ReactNode } from 'react'

type DataTableShellProps = {
  children: ReactNode
  className?: string
}

export function DataTableShell({ children, className = '' }: DataTableShellProps) {
  return (
    <div
      className={[
        'overflow-x-auto rounded-xl border border-slate-200/90 bg-white shadow-sm shadow-slate-900/[0.06] ring-1 ring-slate-900/[0.04]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </div>
  )
}
