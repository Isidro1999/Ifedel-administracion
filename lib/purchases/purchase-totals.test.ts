import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  isValidUsdArsExchangeRate,
} from '../exchange-rate/get-initial-quote-exchange-rate'
import {
  computePurchaseTotals,
  resolvePurchaseExchangeRateForCreate,
} from './purchase-totals'

describe('resolvePurchaseExchangeRateForCreate', () => {
  it('Caso A — hereda TC global cuando el cliente no envía rate', () => {
    const rate = resolvePurchaseExchangeRateForCreate({
      clientRate: undefined,
      globalRate: 1325,
    })
    assert.equal(rate, 1325)
  })

  it('Caso B/C — snapshot histórico vs nueva compra (valores inyectados independientes)', () => {
    const purchase50 = resolvePurchaseExchangeRateForCreate({
      clientRate: undefined,
      globalRate: 1325,
    })
    // Settings cambia a 1340: la compra ya creada conserva su snapshot (no se re-resuelve).
    const purchase51 = resolvePurchaseExchangeRateForCreate({
      clientRate: undefined,
      globalRate: 1340,
    })
    assert.equal(purchase50, 1325)
    assert.equal(purchase51, 1340)
  })

  it('Caso F — override manual del cliente prevalece sobre el global', () => {
    const rate = resolvePurchaseExchangeRateForCreate({
      clientRate: 1300,
      globalRate: 1325,
    })
    assert.equal(rate, 1300)
  })

  it('Caso E — TC global inválido sin override: error (sin fallback 1000)', () => {
    assert.throws(() =>
      resolvePurchaseExchangeRateForCreate({
        clientRate: undefined,
        globalRate: 0,
      }),
    )
    assert.throws(() =>
      resolvePurchaseExchangeRateForCreate({
        clientRate: undefined,
        globalRate: Number.NaN,
      }),
    )
  })

  it('cliente envía 0/ inválido → cae al global', () => {
    assert.equal(
      resolvePurchaseExchangeRateForCreate({
        clientRate: 0,
        globalRate: 1325,
      }),
      1325,
    )
  })
})

describe('computePurchaseTotals', () => {
  const items = [{ unitCost: 100, taxRate: 21, qty: 1 }]

  it('USD: usa snapshot inyectado (no Settings dinámico)', () => {
    const t = computePurchaseTotals({
      items,
      currency: 'USD',
      discountPct: 0,
      exchangeRateARS: 1325,
    })
    assert.equal(t.exchangeRateARS, 1325)
    assert.equal(t.totalARS, 121 * 1325)
  })

  it('ARS: totalARS = totalWithDiscount; igual guarda el snapshot', () => {
    const t = computePurchaseTotals({
      items,
      currency: 'ARS',
      discountPct: 0,
      exchangeRateARS: 1325,
    })
    assert.equal(t.totalARS, 121)
    assert.equal(t.exchangeRateARS, 1325)
  })

  it('Settings cambia no afecta un snapshot ya pasado', () => {
    const a = computePurchaseTotals({
      items,
      currency: 'USD',
      exchangeRateARS: 1325,
    })
    const b = computePurchaseTotals({
      items,
      currency: 'USD',
      exchangeRateARS: 1340,
    })
    assert.equal(a.exchangeRateARS, 1325)
    assert.equal(b.exchangeRateARS, 1340)
  })

  it('rechaza TC inválido (sin fallback 1000)', () => {
    assert.throws(() =>
      computePurchaseTotals({
        items,
        currency: 'USD',
        exchangeRateARS: 0,
      }),
    )
    assert.throws(() =>
      computePurchaseTotals({
        items,
        currency: 'USD',
        exchangeRateARS: Number.NaN,
      }),
    )
  })
})

describe('isValidUsdArsExchangeRate (política sin TC)', () => {
  it('rechaza null/0/inválido — la API no debe inventar 1000', () => {
    assert.equal(isValidUsdArsExchangeRate(null), false)
    assert.equal(isValidUsdArsExchangeRate(0), false)
    assert.equal(isValidUsdArsExchangeRate(1000), true) // 1000 solo válido si Settings lo tiene de verdad
    assert.equal(isValidUsdArsExchangeRate(1325), true)
  })
})
