import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  composeInquiryLocation,
  CreateCatalogInquirySchema,
} from './catalog-inquiry-schemas'

describe('composeInquiryLocation', () => {
  it('une localidad y provincia', () => {
    assert.equal(composeInquiryLocation('Pergamino', 'Buenos Aires'), 'Pergamino, Buenos Aires')
  })

  it('devuelve null si ambos vacíos', () => {
    assert.equal(composeInquiryLocation('  ', null), null)
  })
})

describe('CreateCatalogInquirySchema — entrega', () => {
  const base = {
    customerName: 'Juan Pérez',
    phone: '1155551234',
    taxId: '20-12345678-3',
    deliveryCity: 'Pergamino',
    deliveryProvince: 'Buenos Aires',
    items: [{ productId: 1, quantity: 2 }],
  }

  it('guarda campos de entrega recortados', () => {
    const parsed = CreateCatalogInquirySchema.parse({
      ...base,
      deliveryAddress: '  San Martín 123  ',
      deliveryPostalCode: ' 2700 ',
      deliveryNotes: ' Portón verde ',
    })
    assert.equal(parsed.deliveryAddress, 'San Martín 123')
    assert.equal(parsed.deliveryCity, 'Pergamino')
    assert.equal(parsed.deliveryProvince, 'Buenos Aires')
    assert.equal(parsed.deliveryPostalCode, '2700')
    assert.equal(parsed.deliveryNotes, 'Portón verde')
    assert.equal(parsed.location, 'Pergamino, Buenos Aires')
  })

  it('exige localidad y provincia', () => {
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({
        ...base,
        deliveryCity: '',
      }),
    )
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({
        ...base,
        deliveryProvince: '',
      }),
    )
  })

  it('ignora precios enviados por el cliente', () => {
    const parsed = CreateCatalogInquirySchema.parse({
      ...base,
      estimatedProductsTotalARS: 1,
      items: [
        {
          productId: 1,
          quantity: 2,
          unitPriceARS: 1,
          subtotalARS: 2,
        },
      ],
    })
    assert.equal(
      'estimatedProductsTotalARS' in parsed,
      false,
    )
    assert.deepEqual(parsed.items[0], {
      productId: 1,
      quantity: 2,
      comment: null,
    })
    assert.equal('unitPriceARS' in parsed.items[0], false)
  })

  it('rechaza dirección demasiado larga', () => {
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({
        ...base,
        deliveryAddress: 'x'.repeat(201),
      }),
    )
  })
})

describe('CreateCatalogInquirySchema — taxId', () => {
  const base = {
    customerName: 'Juan Pérez',
    phone: '1155551234',
    deliveryCity: 'Pergamino',
    deliveryProvince: 'Buenos Aires',
    items: [{ productId: 1, quantity: 1 }],
  }

  it('normaliza taxId a 11 dígitos', () => {
    const parsed = CreateCatalogInquirySchema.parse({
      ...base,
      taxId: '20-12345678-3',
    })
    assert.equal(parsed.taxId, '20123456783')
  })

  it('rechaza taxId vacío o inválido', () => {
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({ ...base, taxId: '' }),
    )
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({ ...base, taxId: '123' }),
    )
    assert.throws(() =>
      CreateCatalogInquirySchema.parse({ ...base, taxId: '20-ABC-5678' }),
    )
  })
})
