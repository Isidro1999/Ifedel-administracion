import Link from 'next/link'
import { buildPageHref } from '@/lib/pagination'

type SearchParamsLike =
  | Record<string, string | string[] | undefined>
  | URLSearchParams

type PaginationNavProps = {
  pathname: string
  page: number
  totalPages: number
  total?: number
  /** Query params actuales (se conservan al cambiar de página). */
  searchParams?: SearchParamsLike
  className?: string
}

/**
 * Paginación simple Anterior / Página X de Y / Siguiente.
 * Para Server Components con navegación por URL.
 */
export function PaginationNav({
  pathname,
  page,
  totalPages,
  total,
  searchParams,
  className = '',
}: PaginationNavProps) {
  if (totalPages <= 1) return null

  const params = searchParams ?? {}
  const prevHref = buildPageHref(pathname, params, page - 1)
  const nextHref = buildPageHref(pathname, params, page + 1)
  const canPrev = page > 1
  const canNext = page < totalPages

  const btnBase =
    'rounded border border-ifedel-primary px-4 py-2 text-sm text-ifedel-primary transition hover:bg-ifedel-primary hover:text-white'
  const btnDisabled =
    'cursor-not-allowed rounded border border-gray-300 px-4 py-2 text-sm text-gray-500'

  return (
    <nav
      className={`mt-4 flex flex-wrap items-center justify-center gap-2 text-sm ${className}`}
      aria-label="Paginación"
    >
      {canPrev ? (
        <Link href={prevHref} className={btnBase} prefetch={false}>
          Anterior
        </Link>
      ) : (
        <span className={btnDisabled} aria-disabled="true">
          Anterior
        </span>
      )}

      <span className="px-3 py-2 text-slate-600">
        Página {page} de {totalPages}
        {typeof total === 'number' ? (
          <span className="text-slate-400"> · {total} total</span>
        ) : null}
      </span>

      {canNext ? (
        <Link href={nextHref} className={btnBase} prefetch={false}>
          Siguiente
        </Link>
      ) : (
        <span className={btnDisabled} aria-disabled="true">
          Siguiente
        </span>
      )}
    </nav>
  )
}
