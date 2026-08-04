import type { HomeCategoryIconKey } from '@/components/catalog/home/home-categories'

type CategoryIconProps = {
  name: HomeCategoryIconKey
  className?: string
}

/** SVG decorativos de categoría (aria-hidden en el padre). */
export function HomeCategoryIcon({ name, className }: CategoryIconProps) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
    focusable: false as const,
  }

  switch (name) {
    case 'energizer':
      return (
        <svg {...common}>
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
        </svg>
      )
    case 'fence':
      return (
        <svg {...common}>
          <path d="M4 4v16M10 4v16M14 4v16M20 4v16M4 8h16M4 16h16" />
        </svg>
      )
    case 'scale':
      return (
        <svg {...common}>
          <path d="M12 3v18M5 8h14M7 8l-2 6h6L9 8M17 8l-2 6h6l-2-6" />
        </svg>
      )
    case 'reader':
      return (
        <svg {...common}>
          <path d="M8 4h8a2 2 0 0 1 2 2v14l-6-3-6 3V6a2 2 0 0 1 2-2z" />
          <path d="M10 9h4M10 13h4" />
        </svg>
      )
    case 'tag':
      return (
        <svg {...common}>
          <path d="M20 10V4h-6L3 15l6 6 11-11z" />
          <circle cx="15.5" cy="8.5" r="1.25" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'wire':
      return (
        <svg {...common}>
          <path d="M4 8c4 0 4 8 8 8s4-8 8-8M4 16c4 0 4-8 8-8s4 8 8 8" />
        </svg>
      )
    case 'post':
      return (
        <svg {...common}>
          <path d="M12 3v18M8 7h8M9 21h6M10 11h4" />
        </svg>
      )
    case 'shear':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="2.5" />
          <circle cx="6" cy="18" r="2.5" />
          <path d="M8 7.5 20 18M8 16.5 20 6" />
        </svg>
      )
    case 'clipper':
      return (
        <svg {...common}>
          <path d="M4 8h10l6 4-6 4H4V8zM8 8v8" />
        </svg>
      )
    case 'water':
      return (
        <svg {...common}>
          <path d="M12 3c0 0-6 7-6 11a6 6 0 0 0 12 0c0-4-6-11-6-11z" />
        </svg>
      )
    case 'farm':
      return (
        <svg {...common}>
          <path d="M3 20h18M5 20V10l7-5 7 5v10M10 20v-5h4v5" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M4 7h16v12H4zM8 7V5h8v2" />
        </svg>
      )
  }
}
