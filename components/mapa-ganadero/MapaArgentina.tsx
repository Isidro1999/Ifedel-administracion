'use client'

import { useState } from 'react'
import {
  getProvinciaTier,
  PROVINCIAS_DATA,
  TIER_CONFIG,
  type Tier,
} from '@/lib/data/mapa-ganadero'
import {
  MAPA_VIEWBOX,
  PROVINCIAS_PATHS,
} from '@/lib/data/mapa-argentina-paths'

type MapaArgentinaProps = {
  selectedProvincia: string | null
  onSelect: (nombre: string) => void
}

function tierFill(tier: Tier, active: boolean): string {
  const base = TIER_CONFIG[tier].color
  if (!active) return base
  return base
}

export function MapaArgentina({
  selectedProvincia,
  onSelect,
}: MapaArgentinaProps) {
  const [hovered, setHovered] = useState<string | null>(null)

  const tooltipName = hovered ?? selectedProvincia

  return (
    <div className="relative h-full min-h-[320px] w-full lg:min-h-[520px]">
      <svg
        viewBox={`0 0 ${MAPA_VIEWBOX.width} ${MAPA_VIEWBOX.height}`}
        className="h-full w-full"
        role="img"
        aria-label="Mapa de Argentina por prioridad comercial ganadera"
      >
        {PROVINCIAS_PATHS.map((prov) => {
          const tier = getProvinciaTier(prov.name)
          const hasData = prov.name in PROVINCIAS_DATA
          const isActive = selectedProvincia === prov.name
          const isHover = hovered === prov.name
          const fill = tierFill(tier, isActive)

          return (
            <g key={prov.name}>
              <path
                data-name={prov.name}
                d={prov.d}
                fill={fill}
                stroke="#ffffff"
                strokeWidth={isActive ? 2.5 : 1}
                className={
                  hasData
                    ? 'cursor-pointer transition-[opacity,filter] duration-150'
                    : 'cursor-default'
                }
                style={{
                  opacity: isHover && !isActive ? 0.82 : 1,
                  filter: isActive
                    ? 'saturate(1.15) brightness(1.05)'
                    : undefined,
                }}
                onMouseEnter={() => hasData && setHovered(prov.name)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => hasData && onSelect(prov.name)}
                aria-label={prov.name}
                role="button"
                tabIndex={hasData ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    hasData &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
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
                  className="pointer-events-none select-none fill-white text-[9px] font-semibold drop-shadow-sm"
                  style={{ fontSize: prov.name === 'Buenos Aires' ? 8 : 9 }}
                >
                  {prov.shortLabel}
                </text>
              )}
            </g>
          )
        })}
      </svg>

      {tooltipName && (
        <div
          className="pointer-events-none absolute left-1/2 top-3 z-10 -translate-x-1/2 rounded-md bg-slate-900/90 px-3 py-1.5 text-sm font-medium text-white shadow-lg"
          role="tooltip"
        >
          {tooltipName}
        </div>
      )}
    </div>
  )
}
