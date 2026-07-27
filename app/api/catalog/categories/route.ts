/**
 * GET /api/catalog/categories — API pública (sin auth).
 */
import { NextResponse } from 'next/server'
import { CATALOG_API_CACHE_CONTROL } from '@/lib/catalog-cache'
import { getCatalogCategories } from '@/lib/catalog-queries'

export const revalidate = 60
export const runtime = 'nodejs'

export async function GET() {
  try {
    const items = await getCatalogCategories()
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': CATALOG_API_CACHE_CONTROL } },
    )
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
