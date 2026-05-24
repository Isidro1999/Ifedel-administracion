import { RANKING_TOP7, TIER_CONFIG } from '@/lib/data/mapa-ganadero'

export function RankingBar() {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Top 7 por stock bovino
      </h3>
      <ul className="space-y-2">
        {RANKING_TOP7.map((row, index) => {
          const color = TIER_CONFIG[row.tier].color
          return (
            <li key={row.nombre}>
              <div className="mb-0.5 flex items-center justify-between gap-2 text-xs">
                <span className="font-medium text-slate-800">
                  <span className="text-slate-400">{index + 1}.</span> {row.nombre}
                </span>
                <span className="shrink-0 text-slate-600">{row.stock}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${row.pct}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
