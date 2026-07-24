// components/layout/MetricCard.tsx
import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: ReactNode
  helper?: string
  tone?: 'default' | 'danger' | 'warning'
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default:
    'border-slate-200/90 bg-white/95 shadow-dashboard ring-1 ring-slate-900/[0.03] before:absolute before:inset-y-3 before:left-0 before:w-1 before:rounded-r before:bg-ifedel-primary/80',
  danger: 'border-red-200/90 bg-red-50/90 shadow-dashboard ring-1 ring-red-900/[0.04]',
  warning: 'border-amber-200/90 bg-amber-50/90 shadow-dashboard ring-1 ring-amber-900/[0.05]',
}

const labelClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-slate-500',
  danger: 'text-red-700',
  warning: 'text-amber-800',
}

const valueClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-slate-900',
  danger: 'text-red-800',
  warning: 'text-amber-900',
}

export function MetricCard({
  label,
  value,
  helper,
  tone = 'default',
}: MetricCardProps) {
  return (
    <div
      className={[
        'relative overflow-hidden rounded-2xl border p-5',
        toneClasses[tone],
      ].join(' ')}
    >
      <p className={`text-xs uppercase tracking-wide ${labelClasses[tone]}`}>
        {label}
      </p>
      <div
        className={`mt-1 text-2xl font-semibold ${valueClasses[tone]}`}
      >
        {value}
      </div>
      {helper && (
        <p className={`mt-1 text-xs ${labelClasses[tone]}`}>
          {helper}
        </p>
      )}
    </div>
  )
}

