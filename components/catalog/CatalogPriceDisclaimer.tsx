/**
 * Disclaimer comercial de precios del catálogo (una vez por vista, no en cada card).
 */
export function CatalogPriceDisclaimer({
  variant = 'list',
}: {
  variant?: 'list' | 'detail'
}) {
  if (variant === 'detail') {
    return (
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Precio sujeto a confirmación al momento de la consulta.
      </p>
    )
  }

  return (
    <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
      Precios expresados en pesos argentinos, IVA incluido. Sujetos a
      actualización y confirmación al momento de la consulta.
    </p>
  )
}
