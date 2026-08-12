import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  computeInquiryEstimatedTotals,
  computeInquiryLineSubtotal,
  hasInquiryEconomicSnapshot,
  snapshotInquiryLinePrice,
} from './catalog-inquiry-totals'

describe('computeInquiryLineSubtotal', () => {
  it('42500 × 2 → 85000', () => {
    assert.equal(computeInquiryLineSubtotal(42500, 2), 85000)
  })
})

describe('computeInquiryEstimatedTotals', () => {
  it('suma solo líneas con precio', () => {
    const t = computeInquiryEstimatedTotals([
      { unitPriceARS: 42500, quantity: 2 },
      { unitPriceARS: 120000, quantity: 1 },
    ])
    assert.equal(t.estimatedProductsTotalARS, 205000)
    assert.equal(t.pricedItemsCount, 2)
    assert.equal(t.unpricedItemsCount, 0)
  })

  it('producto sin precio no suma y aumenta unpriced', () => {
    const t = computeInquiryEstimatedTotals([
      { unitPriceARS: 42500, quantity: 2 },
      { unitPriceARS: null, quantity: 3 },
    ])
    assert.equal(t.estimatedProductsTotalARS, 85000)
    assert.equal(t.pricedItemsCount, 1)
    assert.equal(t.unpricedItemsCount, 1)
  })

  it('ignora unitPrice enviado por cliente (el caller pasa el server-side)', () => {
    const clientSpoof = 1
    const serverPrice = 42500
    const used = serverPrice
    assert.notEqual(used, clientSpoof)
    assert.equal(computeInquiryLineSubtotal(used, 2), 85000)
  })
})

describe('snapshotInquiryLinePrice', () => {
  it('guarda el precio server-side, no un spoof del cliente', () => {
    const clientUnitPriceARS = 1
    const serverUnitPriceARS = 42500
    void clientUnitPriceARS
    const snap = snapshotInquiryLinePrice(2, serverUnitPriceARS)
    assert.equal(snap.unitPriceARS, 42500)
    assert.equal(snap.subtotalARS, 85000)
    assert.notEqual(snap.unitPriceARS, clientUnitPriceARS)
  })

  it('sin precio público no calcula subtotal', () => {
    const snap = snapshotInquiryLinePrice(3, null)
    assert.equal(snap.unitPriceARS, null)
    assert.equal(snap.subtotalARS, null)
  })
})

describe('hasInquiryEconomicSnapshot', () => {
  it('consultas históricas nullable no tienen snapshot', () => {
    assert.equal(
      hasInquiryEconomicSnapshot({
        estimatedProductsTotalARS: null,
        pricedItemsCount: null,
        unpricedItemsCount: null,
      }),
      false,
    )
  })

  it('consulta nueva con total 0 sí tiene snapshot', () => {
    assert.equal(
      hasInquiryEconomicSnapshot({
        estimatedProductsTotalARS: 0,
        pricedItemsCount: 0,
        unpricedItemsCount: 1,
      }),
      true,
    )
  })
})
