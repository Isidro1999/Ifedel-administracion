const STYLE: Record<string, string> = {
  PENDING: 'bg-amber-50 text-amber-900 ring-amber-500/25',
  PARTIAL: 'bg-sky-50 text-sky-900 ring-sky-500/25',
  PAID: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
  CANCELLED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  DRAFT: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  SENT: 'bg-violet-50 text-violet-900 ring-violet-500/25',
  ACCEPTED: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
  REJECTED: 'bg-rose-50 text-rose-900 ring-rose-500/25',
  SAVED: 'bg-sky-50 text-sky-900 ring-sky-500/25',
  CONFIRMED: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
  OPEN: 'bg-amber-50 text-amber-900 ring-amber-500/25',
  CLOSED: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  IN: 'bg-emerald-50 text-emerald-900 ring-emerald-500/25',
  OUT: 'bg-rose-50 text-rose-900 ring-rose-500/25',
}

const LABEL: Record<string, string> = {
  PENDING: 'Pendiente',
  PARTIAL: 'Parcial',
  PAID: 'Pagado',
  CANCELLED: 'Anulado',
  DRAFT: 'Borrador',
  SENT: 'Enviada',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  SAVED: 'Guardada',
  CONFIRMED: 'Confirmada',
  OPEN: 'Abierta',
  CLOSED: 'Cerrada',
  IN: 'Ingreso',
  OUT: 'Egreso',
}

type StatusBadgeProps = {
  status: string
  className?: string
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  const key = status.trim().toUpperCase()
  const tone = STYLE[key] ?? 'bg-slate-100 text-slate-700 ring-slate-500/15'
  const label = LABEL[key] ?? status

  return (
    <span
      className={[
        'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset',
        tone,
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label}
    </span>
  )
}
