import { TIER_CONFIG, type Tier } from '@/lib/data/mapa-ganadero'

const TIERS: Tier[] = [1, 2, 3, 4]

export function TierLeyenda() {
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {TIERS.map((tier) => {
        const cfg = TIER_CONFIG[tier]
        return (
          <li
            key={tier}
            className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 px-3 py-2.5 ring-1 ring-slate-900/[0.02]"
            style={{ backgroundColor: cfg.bg }}
          >
            <span
              className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full shadow-sm ring-2 ring-white"
              style={{ backgroundColor: cfg.color }}
              aria-hidden
            />
            <div className="min-w-0">
              <p
                className="text-xs font-bold leading-tight"
                style={{ color: cfg.text }}
              >
                {cfg.label}
              </p>
              <p
                className="mt-0.5 text-[11px] leading-snug opacity-80"
                style={{ color: cfg.text }}
              >
                {cfg.desc}
              </p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
