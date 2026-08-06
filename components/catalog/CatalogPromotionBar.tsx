import type { LucideIcon } from 'lucide-react'
import { BadgePercent, CalendarClock, Truck } from 'lucide-react'
import styles from '@/components/catalog/CatalogPromotionBar.module.css'

const PROMOTION_MESSAGES: ReadonlyArray<{
  id: string
  text: string
  Icon: LucideIcon
}> = [
  {
    id: 'transfer',
    text: '10% OFF pagando por transferencia',
    Icon: BadgePercent,
  },
  {
    id: 'finance',
    text: 'Financiación y pagos a 30, 60 y 90 días',
    Icon: CalendarClock,
  },
  {
    id: 'shipping',
    text: 'Envíos a todo el país',
    Icon: Truck,
  },
]

/** Repeticiones por mitad del track: evita huecos en viewports anchos. */
const SEGMENT_REPEATS = 4

function MessageSegment() {
  const items = Array.from({ length: SEGMENT_REPEATS }, (_, repeat) =>
    PROMOTION_MESSAGES.map((item) => ({
      ...item,
      key: `${repeat}-${item.id}`,
    })),
  ).flat()

  return (
    <ul className={styles.group}>
      {items.map((item) => (
        <li key={item.key} className={styles.item}>
          <item.Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span>{item.text}</span>
          <span className={styles.divider} aria-hidden />
        </li>
      ))}
    </ul>
  )
}

/**
 * Cinta promocional del catálogo público.
 * Marquee CSS continuo (track duplicado); estático si prefers-reduced-motion.
 */
export function CatalogPromotionBar() {
  return (
    <aside
      role="region"
      aria-label="Promociones y beneficios"
      className="overflow-x-hidden bg-[#1f3d14] text-white"
    >
      {/*
        Lista canónica accesible: sr-only con animación activa;
        visible y estática si prefers-reduced-motion.
      */}
      <ul className={styles.accessibleList}>
        {PROMOTION_MESSAGES.map((item, index) => (
          <li key={item.id} className={styles.staticItem}>
            <item.Icon className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
            <span>{item.text}</span>
            {index < PROMOTION_MESSAGES.length - 1 ? (
              <span className={styles.divider} aria-hidden />
            ) : null}
          </li>
        ))}
      </ul>

      {/* Track decorativo: 2 mitades idénticas → translateX(-50%) sin saltos */}
      <div className={styles.marquee} aria-hidden>
        <div className={styles.track}>
          <MessageSegment />
          <MessageSegment />
        </div>
      </div>
    </aside>
  )
}
