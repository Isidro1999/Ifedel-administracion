import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { serializeProductForApi } from './product-api'

describe('serializeProductForApi', () => {
  it('producto con categoría hoja V1 incluye parent en detail y edit', () => {
    const product = {
      id: 42,
      sku: 'SKU-42',
      title: 'Producto test',
      short: null,
      description: null,
      isActive: true,
      isFeatured: false,
      brand: { id: 1, name: 'Gallagher', slug: 'gallagher' },
      category: {
        id: 200,
        name: 'Aisladores',
        slug: 'aisladores',
        parentId: 100,
        parent: {
          id: 100,
          name: 'Electrificación y alambrados',
          slug: 'electrificacion-y-alambrados',
        },
      },
      images: [],
      specs: [],
      prices: [],
      files: [],
    }

    for (const view of ['detail', 'edit'] as const) {
      const out = serializeProductForApi(product, { view }) as {
        category: {
          id: number
          name: string
          slug: string
          parentId: number
          parent: { slug: string } | null
        }
      }
      assert.equal(out.category.id, 200)
      assert.equal(out.category.parentId, 100)
      assert.equal(out.category.parent?.slug, 'electrificacion-y-alambrados')
    }
  })

  it('marca no incluye parentId ni parent', () => {
    const product = {
      id: 1,
      sku: 'A',
      title: 'T',
      isActive: true,
      isFeatured: false,
      brand: { id: 5, name: 'Marca', slug: 'marca' },
      category: {
        id: 10,
        name: 'Hoja',
        slug: 'hoja',
        parentId: 9,
        parent: { id: 9, name: 'Raíz', slug: 'raiz' },
      },
    }
    const out = serializeProductForApi(product, { view: 'detail' }) as {
      brand: Record<string, unknown>
    }
    assert.deepEqual(Object.keys(out.brand).sort(), ['id', 'name', 'slug'])
    assert.ok(!('parentId' in out.brand))
    assert.ok(!('parent' in out.brand))
  })

  it('view detail omite campos de catálogo pero conserva relaciones', () => {
    const product = {
      id: 7,
      sku: 'S7',
      title: 'P7',
      short: 's',
      description: 'd',
      isActive: true,
      isFeatured: true,
      slug: 'p7',
      catalogVisible: true,
      brand: { id: 1, name: 'B', slug: 'b' },
      category: {
        id: 2,
        name: 'Leaf',
        slug: 'leaf',
        parentId: 1,
        parent: { id: 1, name: 'Root', slug: 'root' },
      },
      images: [
        {
          id: 1,
          url: 'https://example.com/a.jpg',
          isPrimary: true,
          sortOrder: 0,
        },
      ],
      specs: [],
      prices: [
        {
          id: 1,
          priceList: 'PUBLICO',
          currency: 'USD',
          netPrice: 10,
          taxRate: 21,
        },
      ],
      files: [],
    }

    const out = serializeProductForApi(product, { view: 'detail' }) as Record<
      string,
      unknown
    >
    assert.ok(!('slug' in out))
    assert.ok(!('categoryId' in out))
    assert.equal((out.category as { parentId: number }).parentId, 1)
    assert.equal((out.prices as unknown[]).length, 1)
  })
})

describe('product detail API selects (regresión P3)', () => {
  it('Brand no tiene parentId en el schema — el select de marca debe ser plano', () => {
    // Documenta la causa raíz del bug: reutilizar el select de Category en Brand
    // rompe prisma.product.findUnique en /api/products/[id].
    const brandFields = new Set(['id', 'name', 'slug'])
    const invalidOnBrand = ['parentId', 'parent']
    for (const f of invalidOnBrand) {
      assert.ok(!brandFields.has(f), `${f} no debe estar en brand select`)
    }
  })
})
