'use client'

import { useState } from 'react'
import { PageHeader } from '@/components/layout/PageHeader'
import { MapaArgentina } from './MapaArgentina'
import { ProvinciasPanel } from './ProvinciasPanel'

export function MapaGanaderoView() {
  const [selectedProvincia, setSelectedProvincia] = useState<string | null>(
    null,
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa ganadero"
        description="Prioridad comercial por provincia según stock bovino. Herramienta interna para planificar cobertura y visitas del equipo de ventas."
      />

      <div className="flex flex-col gap-6 lg:flex-row lg:items-stretch">
        <section className="w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm md:p-4 lg:w-[65%] lg:shrink-0">
          <MapaArgentina
            selectedProvincia={selectedProvincia}
            onSelect={setSelectedProvincia}
          />
        </section>

        <section className="w-full lg:w-[35%] lg:min-w-0">
          <ProvinciasPanel selectedProvincia={selectedProvincia} />
        </section>
      </div>
    </div>
  )
}
