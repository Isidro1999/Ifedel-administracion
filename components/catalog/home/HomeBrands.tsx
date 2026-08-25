'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import {
  HOME_BRANDS,
  type HomeBrand,
} from '@/components/catalog/home/home-brands'
import { HomeSectionHeading } from '@/components/catalog/home/HomeSectionHeading'
import styles from '@/components/catalog/home/HomeBrands.module.css'

type HomeBrandsProps = {
  brands?: HomeBrand[]
  headingId?: string
  title?: string
  description?: string
}

const SCALE_CLASS: Record<NonNullable<HomeBrand['scale']>, string> = {
  sm: 'max-h-[4.5rem] sm:max-h-[5rem]',
  md: 'max-h-[5.25rem] sm:max-h-[5.75rem]',
  lg: 'max-h-[5.75rem] sm:max-h-[6.25rem]',
}

const TOUCH_RESUME_MS = 2200

function BrandCard({ brand }: { brand: HomeBrand }) {
  const scale = brand.scale ?? 'md'
  const card = (
    <span className="flex h-[108px] w-[176px] shrink-0 items-center justify-center rounded-3xl border border-slate-200/90 bg-white px-2 sm:h-[124px] sm:w-[212px] sm:px-2.5">
      <Image
        src={brand.logo}
        alt={`Logo de ${brand.name}`}
        width={220}
        height={110}
        sizes="(max-width: 640px) 168px, 208px"
        loading="lazy"
        className={`h-auto w-auto max-w-full object-contain ${SCALE_CLASS[scale]}`}
      />
    </span>
  )

  if (brand.href) {
    return (
      <a
        href={brand.href}
        className="block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ifedel-primary"
      >
        {card}
      </a>
    )
  }

  return card
}

function BrandList({
  brands,
  inertDuplicate = false,
}: {
  brands: HomeBrand[]
  inertDuplicate?: boolean
}) {
  return (
    <ul
      className={styles.list}
      aria-hidden={inertDuplicate ? true : undefined}
    >
      {brands.map((brand) => (
        <li
          key={`${inertDuplicate ? 'dup-' : ''}${brand.logo}`}
          className="shrink-0"
        >
          <BrandCard brand={brand} />
        </li>
      ))}
    </ul>
  )
}

/**
 * Franja de marcas con carrusel continuo (CSS).
 * Loop por track duplicado + translateX(-50%), 35s por vuelta.
 */
export function HomeBrands({
  brands = HOME_BRANDS,
  headingId = 'home-marcas-heading',
  title = 'Marcas con las que trabajamos',
  description = 'Productos y soluciones de marcas seleccionadas para el sector.',
}: HomeBrandsProps) {
  const viewportRef = useRef<HTMLDivElement>(null)
  const touchResumeTimer = useRef<number | null>(null)

  const [reducedMotion, setReducedMotion] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [touching, setTouching] = useState(false)
  const [tabHidden, setTabHidden] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncMotion = () => setReducedMotion(mq.matches)
    syncMotion()
    mq.addEventListener('change', syncMotion)

    const onVisibility = () => setTabHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      mq.removeEventListener('change', syncMotion)
      document.removeEventListener('visibilitychange', onVisibility)
      if (touchResumeTimer.current != null) {
        window.clearTimeout(touchResumeTimer.current)
      }
    }
  }, [])

  const paused =
    reducedMotion || hovered || focused || touching || tabHidden

  useEffect(() => {
    if (!paused && viewportRef.current) {
      viewportRef.current.scrollLeft = 0
    }
  }, [paused])

  if (brands.length === 0) {
    if (process.env.NODE_ENV !== 'development') {
      return null
    }

    return (
      <div className="border-b border-slate-200/70 bg-white/50">
        <p className="mx-auto max-w-[1400px] px-4 py-2 text-[11px] text-slate-400 sm:px-6 lg:px-8">
          Sección de marcas pendiente de configuración
        </p>
      </div>
    )
  }

  function clearTouchResume() {
    if (touchResumeTimer.current != null) {
      window.clearTimeout(touchResumeTimer.current)
      touchResumeTimer.current = null
    }
  }

  function handleTouchStart() {
    clearTouchResume()
    setTouching(true)
  }

  function handleTouchEnd() {
    clearTouchResume()
    touchResumeTimer.current = window.setTimeout(() => {
      setTouching(false)
      touchResumeTimer.current = null
    }, TOUCH_RESUME_MS)
  }

  return (
    <section
      aria-labelledby={headingId}
      className="border-b border-slate-200/80 bg-white/80"
    >
      <div className="mx-auto max-w-[1400px] px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
        <HomeSectionHeading
          id={headingId}
          title={title}
          description={description}
        />

        <div
          ref={viewportRef}
          className={[
            styles.viewport,
            paused || reducedMotion ? styles.viewportManual : '',
            paused ? styles.paused : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onFocusCapture={() => setFocused(true)}
          onBlurCapture={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
              setFocused(false)
            }
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
        >
          <div className={styles.track}>
            <BrandList brands={brands} />
            {!reducedMotion ? (
              <BrandList brands={brands} inertDuplicate />
            ) : null}
          </div>
        </div>
      </div>
    </section>
  )
}
