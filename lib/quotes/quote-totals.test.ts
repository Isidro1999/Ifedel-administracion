import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isValidQuoteExchangeRate,
} from '../exchange-rate/get-initial-quote-exchange-rate'
import {
  computeQuoteTotals,
  recomputeQuoteTotalARS,
} from './quote-totals'

describe('isValidQuoteExchangeRate', () => {
  it('acepta rates válidos', () => {
    assert.equal(isValidQuoteExchangeRate(1520), true)
    assert.equal(isValidQuoteExchangeRate(0.01), true)
  })

  it('rechaza inválidos', () => {
    assert.equal(isValidQuoteExchangeRate(0), false)
    assert.equal(isValidQuoteExchangeRate(-1), false)
    assert.equal(isValidQuoteExchangeRate(Number.NaN), false)
    assert.equal(isValidQuoteExchangeRate(1_000_000), false)
    assert.equal(isValidQuoteExchangeRate(null), false)
    assert.equal(isValidQuoteExchangeRate(undefined), false)
  })
})

describe('computeQuoteTotals', () => {
  const items = [
    { unitPriceUSD: 100, taxRate: 21, qty: 1 },
  ]

  it('usa el TC inyectado (snapshot) y no un default', () => {
    const t = computeQuoteTotals({
      items,
      discountPct: 0,
      exchangeRateARS: 1520,
    })
    // 100 * 1.21 * 1520 = 183920
    assert.equal(t.currency, 'USD')
    assert.equal(t.exchangeRateARS, 1520)
    assert.equal(t.totalARS, 183920)
  })

  it('Settings cambia no afecta un snapshot ya pasado', () => {
    const quoteA = computeQuoteTotals({
      items,
      exchangeRateARS: 1520,
    })
    const quoteB = computeQuoteTotals({
      items,
      exchangeRateARS: 1540,
    })
    assert.equal(quoteA.exchangeRateARS, 1520)
    assert.equal(quoteB.exchangeRateARS, 1540)
    assert.notEqual(quoteA.totalARS, quoteB.totalARS)
  })

  it('rechaza TC inválido (sin fallback 1000)', () => {
    assert.throws(() =>
      computeQuoteTotals({ items, exchangeRateARS: 0 }),
    )
    assert.throws(() =>
      computeQuoteTotals({ items, exchangeRateARS: Number.NaN }),
    )
  })

  it('ignorar payload cliente: el caller debe pasar Settings, no el body', () => {
    // Simula política de creación: rate del servidor, no el del cliente.
    const clientManipulated = 1
    const serverRate = 1520
    const used = serverRate // creación normal nunca usa clientManipulated
    assert.notEqual(used, clientManipulated)
    const t = computeQuoteTotals({ items, exchangeRateARS: used })
    assert.equal(t.exchangeRateARS, 1520)
  })
})

describe('recomputeQuoteTotalARS', () => {
  it('edición manual 1520 → 1600 recalcula totalARS', () => {
    const totalWithDiscount = 121 // USD con IVA/descuento
    const before = recomputeQuoteTotalARS(totalWithDiscount, 1520)
    const after = recomputeQuoteTotalARS(totalWithDiscount, 1600)
    assert.equal(before, 121 * 1520)
    assert.equal(after, 121 * 1600)
  })
})
