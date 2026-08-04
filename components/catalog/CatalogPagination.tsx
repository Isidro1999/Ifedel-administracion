import Link from 'next/link'

type CatalogPaginationProps = {
  /** Path base sin query, p.ej. `/catalogo/productos` o `/categorias/foo`. */
  basePath: string
  page: number
  totalPages: number
  /**
   * Query params a preservar (sin `page`).
   * Se reutiliza la misma estrategia que el listado general.
   */
  params?: Record<string, string>
}

/**
 * Paginación pública del catálogo (Server Component).
 * Misma UX que el listado `/productos`: Anterior / Página X de Y / Siguiente.
 * Oculta controles en extremos; no muestra nada si hay una sola página.
 */
export function CatalogPagination({
  basePath,
  page,
  totalPages,
  params = {},
}: CatalogPaginationProps) {
  if (totalPages <= 1) return null

  const hrefFor = (pageNum: number) => {
    const sp = new URLSearchParams({
      ...params,
      page: String(pageNum),
    })
    return `${basePath}?${sp.toString()}`
  }

  return (
    <div className="flex items-center justify-center gap-3 pt-4">
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Anterior
        </Link>
      ) : null}
      <span className="text-sm text-slate-500">
        Página {page} de {totalPages}
      </span>
      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Siguiente
        </Link>
      ) : null}
    </div>
  )
}
