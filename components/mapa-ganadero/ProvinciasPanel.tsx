import { CheckCircle2, MapPinned, Sparkles } from 'lucide-react'
import { SectionCard } from '@/components/layout/SectionCard'
import {
  PROVINCIAS_DATA,
  TIER_CONFIG,
  type ProvinciaData,
} from '@/lib/data/mapa-ganadero'
import { RankingBar } from './RankingBar'
import { TierLeyenda } from './TierLeyenda'

type ProvinciasPanelProps = {
  selectedProvincia: string | null
  onSelect: (nombre: string) => void
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200/90 bg-white/95 p-3 shadow-dashboard ring-1 ring-slate-900/[0.02] before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-r before:bg-ifedel-primary/70">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold leading-snug text-slate-900">{value}</p>
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
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">
            {nombre}
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">{data.ciudad}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset"
          style={{
            backgroundColor: tierCfg.bg,
            color: tierCfg.text,
            boxShadow: `inset 0 0 0 1px ${tierCfg.color}33`,
          }}
        >
          Tier {data.tier}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <StatTile label="Stock bovino" value={data.stock} />
        <StatTile label="% nacional" value={data.pct} />
        <StatTile label="Establecimientos" value={data.estab} />
        <StatTile label="Hub principal" value={data.ciudad} />
      </div>

      <div>
        <h3 className="mb-2.5 text-xs font-bold uppercase tracking-wide text-slate-500">
          Productos clave
        </h3>
        <ul className="space-y-2">
          {data.productos.map((p) => (
            <li
              key={p}
              className="flex items-start gap-2 rounded-lg bg-slate-50/80 px-2.5 py-2 text-sm text-slate-700 ring-1 ring-slate-100"
            >
              <CheckCircle2
                className="mt-0.5 h-4 w-4 shrink-0 text-ifedel-primary"
                strokeWidth={2.25}
                aria-hidden
              />
              <span className="leading-snug">{p}</span>
            </li>
          ))}
        </ul>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border-l-4 px-4 py-3.5 shadow-dashboard ring-1 ring-slate-900/[0.03]"
        style={{
          borderLeftColor: tierCfg.color,
          backgroundColor: tierCfg.bg,
        }}
      >
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide opacity-90" style={{ color: tierCfg.text }}>
          <Sparkles className="h-3.5 w-3.5" strokeWidth={2.25} aria-hidden />
          Acción recomendada
        </div>
        <p className="mt-1.5 text-sm font-medium leading-relaxed" style={{ color: tierCfg.text }}>
          {data.accion}
        </p>
      </div>
    </div>
  )
}

function EmptyDetalle() {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 px-4 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-ifedel-primary shadow-dashboard ring-1 ring-slate-200/80">
        <MapPinned className="h-5 w-5" strokeWidth={2} aria-hidden />
      </div>
      <div>
        <p className="text-sm font-bold text-slate-900">
          Seleccioná una provincia
        </p>
        <p className="mt-1 max-w-xs text-xs leading-relaxed text-slate-500">
          Hacé clic en el mapa o en el ranking para ver stock, productos clave y
          la acción comercial sugerida.
        </p>
      </div>
    </div>
  )
}

export function ProvinciasPanel({
  selectedProvincia,
  onSelect,
}: ProvinciasPanelProps) {
  const data = selectedProvincia
    ? PROVINCIAS_DATA[selectedProvincia]
    : null

  return (
    <div className="flex flex-col gap-4 lg:sticky lg:top-[4.5rem] lg:max-h-[calc(100vh-5.5rem)] lg:overflow-y-auto lg:pr-0.5">
      <SectionCard
        title="Prioridad comercial"
        description="Colores del mapa según volumen ganadero y urgencia de cobertura."
      >
        <TierLeyenda />
      </SectionCard>

      <SectionCard
        title="Top 7 por stock"
        description="Provincias con mayor parque bovino. Clic para ver detalle."
      >
        <RankingBar
          selectedProvincia={selectedProvincia}
          onSelect={onSelect}
        />
      </SectionCard>

      <SectionCard
        title="Detalle provincial"
        description={
          selectedProvincia
            ? `Información comercial para ${selectedProvincia}.`
            : 'Sin provincia seleccionada.'
        }
      >
        {data && selectedProvincia ? (
          <ProvinciaDetalle nombre={selectedProvincia} data={data} />
        ) : (
          <EmptyDetalle />
        )}
      </SectionCard>
    </div>
  )
}
