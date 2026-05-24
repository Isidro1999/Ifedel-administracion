import {
  PROVINCIAS_DATA,
  TIER_CONFIG,
  type ProvinciaData,
} from '@/lib/data/mapa-ganadero'
import { RankingBar } from './RankingBar'
import { TierLeyenda } from './TierLeyenda'

type ProvinciasPanelProps = {
  selectedProvincia: string | null
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-200/80">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  )
}

function ProvinciaDetalle({
  nombre,
  data,
}: {
  nombre: string
  data: ProvinciaData
}) {
  const tierCfg = TIER_CONFIG[data.tier]

  return (
    <div className="space-y-4 border-t border-slate-200 pt-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{nombre}</h2>
        <span
          className="mt-2 inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset"
          style={{
            backgroundColor: tierCfg.bg,
            color: tierCfg.text,
            borderColor: tierCfg.color,
          }}
        >
          {tierCfg.label}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatCard label="Stock bovino" value={data.stock} />
        <StatCard label="% stock nacional" value={data.pct} />
        <StatCard label="Establecimientos" value={data.estab} />
        <StatCard label="Hub principal" value={data.ciudad} />
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Productos clave
        </h3>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          {data.productos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>

      <div
        className="rounded-lg px-3 py-3 text-sm leading-relaxed ring-1 ring-inset"
        style={{
          backgroundColor: tierCfg.bg,
          color: tierCfg.text,
          borderColor: `${tierCfg.color}40`,
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
          Acción recomendada
        </p>
        <p className="mt-1 font-medium">{data.accion}</p>
      </div>
    </div>
  )
}

export function ProvinciasPanel({ selectedProvincia }: ProvinciasPanelProps) {
  const data = selectedProvincia
    ? PROVINCIAS_DATA[selectedProvincia]
    : null

  return (
    <aside className="flex h-full flex-col gap-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
      <TierLeyenda />
      <RankingBar />

      {data && selectedProvincia ? (
        <ProvinciaDetalle nombre={selectedProvincia} data={data} />
      ) : (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center">
          <p className="text-sm font-medium text-slate-700">
            Seleccioná una provincia para ver el detalle
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Hacé clic en el mapa o pasá el cursor para ver el nombre.
          </p>
        </div>
      )}
    </aside>
  )
}
