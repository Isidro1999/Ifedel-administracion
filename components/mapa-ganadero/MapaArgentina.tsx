'use client'

import { useState } from 'react'
import { MapPin } from 'lucide-react'
import {
  getProvinciaTier,
  PROVINCIAS_DATA,
  TIER_CONFIG,
} from '@/lib/data/mapa-ganadero'
import {
  MAPA_VIEWBOX,
  PROVINCIAS_PATHS,
} from '@/lib/data/mapa-argentina-paths'

type MapaArgentinaProps = {
  selectedProvincia: string | null
  onSelect: (nombre: string) => void
}

export function MapaArgentina({
  selectedProvincia,
  onSelect,
}: MapaArgentinaProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const displayTooltip = hovered ?? null

  return (
    <div className="relative min-h-[320px] w-full lg:min-h-[540px]">
      {/* Fondo del mapa */}
      <div
        className="absolute inset-0 rounded-xl bg-gradient-to-br from-slate-100/90 via-white to-emerald-50/60"
        aria-hidden
      />

      <svg
        viewBox={`0 0 ${MAPA_VIEWBOX.width} ${MAPA_VIEWBOX.height}`}
        className="relative z-[1] h-full w-full drop-shadow-sm"
        role="img"
        aria-label="Mapa de Argentina por prioridad comercial ganadera"
      >
        <defs>
          <filter id="map-prov-shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.12" />
          </filter>
        </defs>

        {PROVINCIAS_PATHS.map((prov) => {
          const tier = getProvinciaTier(prov.name)
          const tierCfg = TIER_CONFIG[tier]
          const hasData = prov.name in PROVINCIAS_DATA
          const isActive = selectedProvincia === prov.name
          const isHover = hovered === prov.name
          const isDimmed =
            selectedProvincia != null && !isActive && !isHover

          return (
            <g key={prov.name} filter={isActive ? 'url(#map-prov-shadow)' : undefined}>
              <path
                data-name={prov.name}
                d={prov.d}
                fill={tierCfg.color}
                stroke={isActive ? tierCfg.text : '#ffffff'}
                strokeWidth={isActive ? 2.5 : 1.25}
                className={
                  hasData
                    ? 'cursor-pointer transition-all duration-200 ease-out'
                    : 'cursor-default'
                }
                style={{
                  opacity: isDimmed ? 0.45 : isHover && !isActive ? 0.88 : 1,
                  filter: isActive
                    ? 'saturate(1.2) brightness(1.08)'
                    : undefined,
                }}
                onMouseEnter={() => hasData && setHovered(prov.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => hasData && onSelect(prov.name)}
                aria-label={prov.name}
                aria-pressed={isActive}
                role="button"
                tabIndex={hasData ? 0 : -1}
                onKeyDown={(e) => {
                  if (hasData && (e.key === 'Enter' || e.key === ' ')) {
                    e.preventDefault()
                    onSelect(prov.name)
                  }
                }}
              />
              {prov.shortLabel && (
                <text
                  x={prov.labelX}
                  y={prov.labelY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  pointerEvents="none"
                  className="select-none fill-white text-[9px] font-bold"
                  style={{
                    fontSize: prov.name === 'Buenos Aires' ? 7.5 : 9,
                    paintOrder: 'stroke fill',
                    stroke: 'rgba(15,23,42,0.35)',
                    strokeWidth: 2.5,
                    strokeLinejoin: 'round',
                  }}
                >
                  {prov.shortLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {displayTooltip && (
        <div
          className="pointer-events-none absolute left-1/2 top-4 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/95 px-3.5 py-1.5 text-sm font-semibold text-slate-800 shadow-dashboard backdrop-blur-md"
          role="tooltip"
        >
          <MapPin className="h-3.5 w-3.5 text-ifedel-primary" strokeWidth={2.5} />
          {displayTooltip}
        </div>
      )}

      {selectedProvincia && !hovered && (
        <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden rounded-lg border border-slate-200/90 bg-white/90 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm backdrop-blur-sm sm:block">
          Seleccionada:{' '}
          <span className="font-semibold text-slate-900">{selectedProvincia}</span>
        </div>
      )}
    </div>
  )
}
