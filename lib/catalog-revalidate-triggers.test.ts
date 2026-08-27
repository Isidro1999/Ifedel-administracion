import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

/**
 * Verifica wiring estático de invalidación de caché pública (casos 6–7).
 * No ejecuta Next.js ni Prisma.
 */
describe('revalidateCatalogPublicCache wiring', () => {
  it('caso 7: CRUD de categorías invalida caché pública', () => {
    const src = readFileSync('lib/admin-categories-service.ts', 'utf8')
    const calls = (src.match(/revalidateCatalogPublicCache\(\)/g) ?? []).length
    assert.ok(
      calls >= 3,
      `create/update/delete deben llamar revalidateCatalogPublicCache (encontradas ${calls})`,
    )
  })

  it('caso 6: edición de producto invalida cuando afecta catálogo público', () => {
    const src = readFileSync('app/api/admin/products/[id]/route.ts', 'utf8')
    assert.match(src, /affectsPublicCatalog/)
    assert.match(src, /revalidateCatalogPublicCache/)
    assert.match(src, /existingProduct\.categoryId/)
  })
})
