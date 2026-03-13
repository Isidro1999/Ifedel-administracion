import type { Sale, SaleItem, Product } from '@prisma/client'
import { fmtNumberAR } from '@/lib/format-money'
import type { FinancialSettings } from '@/lib/financial-settings'

export type SaleMarginResult = {
  incomeARS: number
  estimatedCostARS: number
  grossMarginARS: number
  grossMarginPct: number
  operatingMarginARS: number
  operatingMarginPct: number
  estimatedIIBB: number
  estimatedBankCreditCost: number
  estimatedBankDebitCost: number
  hasMissingCosts: boolean
}

function computeUnitCostARS(
  product: Product | null,
  exchangeRateARS: number | null | undefined
): { unitCostARS: number; missingCost: boolean } {
  if (!product || product.cost == null) {
    return { unitCostARS: 0, missingCost: true }
  }

  const currency = product.costCurrency || 'USD'
  if (currency === 'ARS') {
    return { unitCostARS: product.cost, missingCost: false }
  }

  const rate = exchangeRateARS ?? 0
  if (!rate || rate <= 0) {
    return { unitCostARS: 0, missingCost: true }
  }

  return { unitCostARS: product.cost * rate, missingCost: false }
}

export function computeSaleMarginForSale(
  sale: Sale & { items: (SaleItem & { product: Product | null })[] },
  settings: FinancialSettings
): SaleMarginResult {
  const rate =
    sale.exchangeRateARS && sale.exchangeRateARS > 0
      ? sale.exchangeRateARS
      : settings.usdArsRate

  const incomeARS =
    sale.totalARS ??
    (rate && rate > 0 ? sale.totalWithDiscount * rate : sale.totalWithDiscount)

  let estimatedCostARS = 0
  let hasMissingCosts = false

  for (const item of sale.items) {
    const { unitCostARS, missingCost } = computeUnitCostARS(
      item.product,
      rate
    )

    if (missingCost) {
      hasMissingCosts = true
      continue
    }

    estimatedCostARS += unitCostARS * item.qty
  }

  const grossMarginARS = incomeARS - estimatedCostARS
  const grossMarginPct =
    incomeARS > 0 ? (grossMarginARS / incomeARS) * 100 : 0

  const estimatedIIBB = incomeARS * settings.ingresosBrutosRate
  const estimatedBankCreditCost = incomeARS * settings.bankCreditRate
  const estimatedBankDebitCost = incomeARS * settings.bankDebitRate

  const operatingMarginARS =
    grossMarginARS -
    estimatedIIBB -
    estimatedBankCreditCost -
    estimatedBankDebitCost -
    settings.fixedMonthlyOverheadARS

  const operatingMarginBase =
    incomeARS > 0 ? incomeARS : Math.abs(grossMarginARS) || 1
  const operatingMarginPct =
    (operatingMarginARS / operatingMarginBase) * 100

  return {
    incomeARS,
    estimatedCostARS,
    grossMarginARS,
    grossMarginPct,
    operatingMarginARS,
    operatingMarginPct,
    estimatedIIBB,
    estimatedBankCreditCost,
    estimatedBankDebitCost,
    hasMissingCosts,
  }
}

export function formatMarginPct(value: number): string {
  return `${fmtNumberAR(value)}%`
}

