/**
 * GET /api/catalog/categories — API pública (sin auth).
 */
import { NextResponse } from 'next/server'
import { queryCatalogCategories } from '@/lib/catalog-queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const items = await queryCatalogCategories()
    return NextResponse.json({ items })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.categories]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener categorías del catálogo' },
      { status: 500 },
    )
  }
}
