import {
  formatPublicCatalogPriceLabel,
  PUBLIC_PRICE_LABEL,
} from '@/lib/catalog-public-price'
import { CATALOG_MONEY_NUMERIC_CLASS } from '@/components/catalog/catalog-money-numeric'

const money = CATALOG_MONEY_NUMERIC_CLASS

export type CatalogPriceDisplayVariant = 'card' | 'detail' | 'inquiry' | 'inline'

type CatalogPriceDisplayProps = {
  amount?: number | null
  priceLabel?: string | null
  variant?: CatalogPriceDisplayVariant
  /** Sufijo “c/u” junto al precio (lista de consulta). */
  unitSuffix?: boolean
  /** Subtotal de línea (solo variante inquiry). */
  subtotalAmount?: number | null
  className?: string
}

const pricedModuleClass: Record<CatalogPriceDisplayVariant, string> = {
  card: 'rounded-xl border border-ifedel-primary/20 bg-[#f4f8ef] px-3 py-2.5',
  detail: 'rounded-xl border border-ifedel-primary/20 bg-[#f4f8ef] px-4 py-3 sm:max-w-sm',
  inquiry: 'rounded-lg border border-ifedel-primary/15 bg-[#f4f8ef] px-3 py-2',
  inline: '',
}

const unpricedModuleClass: Record<CatalogPriceDisplayVariant, string> = {
  card: 'rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5',
  detail: 'rounded-xl border border-slate-200/80 bg-slate-50/90 px-4 py-3 sm:max-w-sm',
  inquiry: 'rounded-lg border border-slate-200/80 bg-slate-50/90 px-3 py-2',
  inline: '',
}

const labelClass: Record<CatalogPriceDisplayVariant, string> = {
  card: 'text-[10px] font-semibold uppercase tracking-wider text-ifedel-brown/75',
  detail: 'text-[11px] font-semibold uppercase tracking-wider text-ifedel-brown/75',
  inquiry: 'text-[10px] font-semibold uppercase tracking-wider text-ifedel-brown/70',
  inline: 'text-[10px] font-medium uppercase tracking-wide text-slate-500',
}

const amountClass: Record<CatalogPriceDisplayVariant, string> = {
  card: `mt-0.5 text-lg font-semibold leading-tight ${money} tracking-normal text-slate-900`,
  detail: `mt-1 text-2xl font-semibold leading-tight ${money} tracking-normal text-slate-900 sm:text-[1.75rem]`,
  inquiry: `mt-0.5 text-base font-semibold leading-tight ${money} tracking-normal text-slate-900`,
  inline: `text-sm font-semibold ${money} text-slate-900`,
}

const ivaClass: Record<CatalogPriceDisplayVariant, string> = {
  card: 'mt-0.5 text-[11px] text-slate-500',
  detail: 'mt-1 text-xs text-slate-500',
  inquiry: 'mt-0.5 text-[11px] text-slate-500',
  inline: 'mt-0.5 text-[10px] text-slate-500',
}

const consultClass: Record<CatalogPriceDisplayVariant, string> = {
  card: 'mt-0.5 text-sm font-semibold leading-snug text-slate-700',
  detail: 'mt-1 text-base font-semibold leading-snug text-slate-700',
  inquiry: 'mt-0.5 text-sm font-semibold text-slate-700',
  inline: 'text-sm font-medium text-slate-600',
}

function formatAmountLine(amount: number, unitSuffix: boolean): string {
  const formatted = formatPublicCatalogPriceLabel(amount)
  return unitSuffix ? `${formatted}\u00a0c/u` : formatted
}

export function CatalogPriceDisplay({
  amount,
  priceLabel,
  variant = 'card',
  unitSuffix = false,
  subtotalAmount = null,
  className,
}: CatalogPriceDisplayProps) {
  const hasPrice =
    typeof amount === 'number' && Number.isFinite(amount) && amount >= 0

  const hasSubtotal =
    variant === 'inquiry' &&
    typeof subtotalAmount === 'number' &&
    Number.isFinite(subtotalAmount) &&
    subtotalAmount >= 0

  if (!hasPrice) {
    const label =
      priceLabel?.trim() ||
      (variant === 'inquiry' ? 'Precio a cotizar' : PUBLIC_PRICE_LABEL)

    if (variant === 'inline') {
      return (
        <div className={className}>
          <p className={consultClass.inline}>{label}</p>
        </div>
      )
    }

    return (
      <div className={className}>
        <div className={unpricedModuleClass[variant]}>
          <p className={labelClass[variant]}>Precio</p>
          <p className={consultClass[variant]}>{label}</p>
        </div>
      </div>
    )
  }

  const priceModule = (
    <div className={pricedModuleClass[variant] || undefined}>
      <p className={labelClass[variant]}>Precio final</p>
      <p className={`${amountClass[variant]} whitespace-nowrap`}>
        {formatAmountLine(amount, unitSuffix)}
      </p>
      <p className={ivaClass[variant]}>IVA incluido</p>
    </div>
  )

  if (variant === 'inline') {
    return (
      <div className={className}>
        <p className={`${amountClass.inline} whitespace-nowrap`}>
          {formatAmountLine(amount, unitSuffix)}
        </p>
        <p className={ivaClass.inline}>IVA incluido</p>
      </div>
    )
  }

  return (
    <div className={className}>
      {priceModule}
      {hasSubtotal ? (
        <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/90 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Subtotal
          </p>
          <p className={`mt-0.5 text-sm font-semibold ${money} text-slate-900`}>
            {formatPublicCatalogPriceLabel(subtotalAmount)}
          </p>
        </div>
      ) : null}
    </div>
  )
}
