import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  DEFAULT_CATALOG_PRICE_LIST,
  PUBLIC_PRICE_LABEL,
  effectiveCatalogPriceList,
  formatPublicCatalogPriceLabel,
  resolvePublicCatalogPrice,
} from './catalog-public-price'

const baseUsd = {
  showPrice: true,
  catalogPriceList: null as string | null,
  prices: [
    {
      priceList: 'minorista',
      currency: 'USD',
      netPrice: 100,
      taxRate: 21,
      createdAt: '2026-01-01T00:00:00.000Z',
    },
  ],
}

describe('effectiveCatalogPriceList', () => {
  it('usa catalogPriceList si existe', () => {
    assert.equal(effectiveCatalogPriceList('PUBLICO'), 'PUBLICO')
  })

  it('fallback minorista si null/vacío', () => {
    assert.equal(effectiveCatalogPriceList(null), DEFAULT_CATALOG_PRICE_LIST)
    assert.equal(effectiveCatalogPriceList('  '), DEFAULT_CATALOG_PRICE_LIST)
  })
})

describe('resolvePublicCatalogPrice', () => {
  it('USD + IVA 21 + TC 1520 → 183920', () => {
    const r = resolvePublicCatalogPrice(baseUsd, 1520)
    assert.equal(r.showPrice, true)
    assert.ok(r.price)
    assert.equal(r.price!.currency, 'ARS')
    assert.equal(r.price!.amount, 183920)
    assert.equal(r.price!.netPrice, 183920)
    assert.equal(r.price!.includesTax, true)
    assert.equal(r.priceLabel, formatPublicCatalogPriceLabel(183920))
  })

  it('USD sin IVA', () => {
    const r = resolvePublicCatalogPrice(
      {
        ...baseUsd,
        prices: [{ ...baseUsd.prices[0], taxRate: 0 }],
      },
      1520,
    )
    assert.equal(r.price!.amount, 152000)
  })

  it('ARS + IVA', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'minorista',
            currency: 'ARS',
            netPrice: 100000,
            taxRate: 21,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      1520,
    )
    assert.equal(r.price!.amount, 121000)
  })

  it('ARS sin IVA', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'minorista',
            currency: 'ARS',
            netPrice: 100000,
            taxRate: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      null,
    )
    assert.equal(r.price!.amount, 100000)
  })

  it('redondeo 13262.81 → 13263', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'minorista',
            currency: 'ARS',
            netPrice: 10961,
            taxRate: 21,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      null,
    )
    // 10961 * 1.21 = 13262.81 → Math.round = 13263
    assert.equal(r.price!.amount, 13263)
  })

  it('showPrice false → Consultar precio', () => {
    const r = resolvePublicCatalogPrice(
      { ...baseUsd, showPrice: false },
      1520,
    )
    assert.equal(r.showPrice, false)
    assert.equal(r.price, null)
    assert.equal(r.priceLabel, PUBLIC_PRICE_LABEL)
  })

  it('USD con TC inválido → Consultar precio', () => {
    for (const rate of [null, 0, -1, Number.NaN]) {
      const r = resolvePublicCatalogPrice(baseUsd, rate as number | null)
      assert.equal(r.price, null)
      assert.equal(r.priceLabel, PUBLIC_PRICE_LABEL)
    }
  })

  it('moneda desconocida → Consultar precio', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'minorista',
            currency: 'EUR',
            netPrice: 100,
            taxRate: 21,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      1520,
    )
    assert.equal(r.price, null)
    assert.equal(r.priceLabel, PUBLIC_PRICE_LABEL)
  })

  it('respeta catalogPriceList específica', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: 'PUBLICO',
        prices: [
          {
            priceList: 'minorista',
            currency: 'USD',
            netPrice: 50,
            taxRate: 0,
            createdAt: '2026-02-01T00:00:00.000Z',
          },
          {
            priceList: 'PUBLICO',
            currency: 'USD',
            netPrice: 100,
            taxRate: 0,
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
      1000,
    )
    assert.equal(r.price!.amount, 100000)
    assert.equal(r.sourcePriceList, 'PUBLICO')
  })

  it('catalogPriceList null → minorista', () => {
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'mayorista',
            currency: 'USD',
            netPrice: 80,
            taxRate: 0,
            createdAt: '2026-02-01T00:00:00.000Z',
          },
          {
            priceList: 'minorista',
            currency: 'USD',
            netPrice: 100,
            taxRate: 0,
            createdAt: '2026-02-01T00:00:00.000Z',
          },
        ],
      },
      1000,
    )
    assert.equal(r.price!.amount, 100000)
    assert.equal(r.sourcePriceList, 'minorista')
  })

  it('precio fuera de vigencia → no usar', () => {
    const now = new Date('2026-06-15T12:00:00.000Z')
    const r = resolvePublicCatalogPrice(
      {
        showPrice: true,
        catalogPriceList: null,
        prices: [
          {
            priceList: 'minorista',
            currency: 'USD',
            netPrice: 100,
            taxRate: 0,
            validFrom: '2026-01-01T00:00:00.000Z',
            validTo: '2026-01-31T23:59:59.000Z',
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
      1520,
      now,
    )
    assert.equal(r.price, null)
    assert.equal(r.priceLabel, PUBLIC_PRICE_LABEL)
  })
})
