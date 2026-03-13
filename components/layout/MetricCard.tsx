// components/layout/MetricCard.tsx
import type { ReactNode } from 'react'

type MetricCardProps = {
  label: string
  value: ReactNode
  helper?: string
  tone?: 'default' | 'danger' | 'warning'
}

const toneClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'border-gray-200 bg-white',
  danger: 'border-red-200 bg-red-50',
  warning: 'border-amber-200 bg-amber-50',
}

const labelClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-gray-500',
  danger: 'text-red-700',
  warning: 'text-amber-700',
}

const valueClasses: Record<NonNullable<MetricCardProps['tone']>, string> = {
  default: 'text-ifedel-black',
  danger: 'text-red-700',
  warning: 'text-amber-700',
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
        'rounded-lg border p-4',
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

