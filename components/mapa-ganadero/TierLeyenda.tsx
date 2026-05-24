import { TIER_CONFIG, type Tier } from '@/lib/data/mapa-ganadero'

const TIERS: Tier[] = [1, 2, 3, 4]

export function TierLeyenda() {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        Prioridad comercial
      </h3>
      <ul className="space-y-2">
        {TIERS.map((tier) => {
          const cfg = TIER_CONFIG[tier]
          return (
            <li key={tier} className="flex items-start gap-2.5 text-sm">
              <span
                className="mt-0.5 h-4 w-4 shrink-0 rounded-sm ring-1 ring-black/10"
                style={{ backgroundColor: cfg.color }}
                aria-hidden
              />
              <div>
                <p className="font-medium text-slate-900">{cfg.label}</p>
                <p className="text-xs text-slate-500">{cfg.desc}</p>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
