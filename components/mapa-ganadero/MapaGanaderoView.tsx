'use client'

import { useState } from 'react'
import { Map } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { RANKING_TOP7, TIER_CONFIG } from '@/lib/data/mapa-ganadero'
import { MapaArgentina } from './MapaArgentina'
import { ProvinciasPanel } from './ProvinciasPanel'

export function MapaGanaderoView() {
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(
    null,
  )

  const tier1Count = 2
  const topStock = RANKING_TOP7[0]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa ganadero"
        description="Prioridad comercial por provincia según stock bovino. Planificá cobertura, visitas y mix de productos para el equipo de ventas."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 shadow-sm">
              <Map className="h-3.5 w-3.5 text-ifedel-primary" strokeWidth={2.25} />
              23 provincias
            </span>
            <span
              className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: TIER_CONFIG[1].bg,
                color: TIER_CONFIG[1].text,
              }}
            >
              {tier1Count} Tier 1 · arrancar ya
            </span>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-dashboard ring-1 ring-slate-900/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Líder nacional
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">{topStock.nombre}</p>
          <p className="text-xs text-ifedel-brown">{topStock.stock} cabezas</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-dashboard ring-1 ring-slate-900/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Participación BA
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">37%</p>
          <p className="text-xs text-slate-500">del stock nacional</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-dashboard ring-1 ring-slate-900/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Tier 1
          </p>
          <p className="mt-1 text-base font-bold leading-tight text-slate-900">
            Buenos Aires + Santa Fe
          </p>
          <p className="text-xs text-slate-500">máxima prioridad</p>
        </div>
        <div className="rounded-2xl border border-slate-200/90 bg-white/95 p-4 shadow-dashboard ring-1 ring-slate-900/[0.03]">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Top 7 concentración
          </p>
          <p className="mt-1 text-lg font-bold text-slate-900">~88%</p>
          <p className="text-xs text-slate-500">stock en 7 provincias</p>
        </div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="w-full lg:w-[65%] lg:shrink-0">
          <SectionCard
            title="Mapa de Argentina"
            description="Clic en una provincia para ver el detalle comercial. El resto del mapa se atenúa al seleccionar."
          >
            <MapaArgentina
              selectedProvincia={selectedProvincia}
              onSelect={setSelectedProvincia}
            />
          </SectionCard>
        </div>

        <div className="w-full lg:w-[35%] lg:min-w-0">
          <ProvinciasPanel
            selectedProvincia={selectedProvincia}
            onSelect={setSelectedProvincia}
          />
        </div>
      </div>
    </div>
  )
}
