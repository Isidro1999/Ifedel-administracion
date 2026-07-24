import { RANKING_TOP7, TIER_CONFIG } from '@/lib/data/mapa-ganadero'

type RankingBarProps = {
  selectedProvincia: string | null
  onSelect?: (nombre: string) => void
}

export function RankingBar({ selectedProvincia, onSelect }: RankingBarProps) {
  return (
    <ul className="space-y-2.5">
      {RANKING_TOP7.map((row, index) => {
        const color = TIER_CONFIG[row.tier].color
        const isActive = selectedProvincia === row.nombre
        const clickable = Boolean(onSelect)

        return (
          <li key={row.nombre}>
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onSelect?.(row.nombre)}
              className={[
                'group w-full rounded-xl border px-3 py-2 text-left transition-all',
                clickable
                  ? 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/80'
                  : '',
                isActive
                  ? 'border-ifedel-primary/40 bg-ifedel-primary/5 ring-1 ring-ifedel-primary/20'
                  : 'border-transparent bg-slate-50/50',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="flex min-w-0 items-center gap-2 text-xs">
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm"
                    style={{ backgroundColor: color }}
                  >
                    {index + 1}
                  </span>
                  <span
                    className={`truncate font-semibold ${isActive ? 'text-ifedel-brown' : 'text-slate-800'}`}
                  >
                    {row.nombre}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-medium tabular-nums text-slate-600">
                  {row.stock}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full rounded-full transition-all duration-300 group-hover:brightness-105"
                  style={{
                    width: `${row.pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
