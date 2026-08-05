/**
 * GET /api/catalog/brands — API pública (sin auth).
 * Query opcional: `category` (slug) para marcas con productos en esa categoría.
 */
import { NextRequest, NextResponse } from 'next/server'
import { CATALOG_API_CACHE_CONTROL } from '@/lib/catalog-cache'
import { getCatalogBrands } from '@/lib/catalog-queries'

export const revalidate = 60
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const category = request.nextUrl.searchParams.get('category') || undefined
    const items = await getCatalogBrands({ category })
    return NextResponse.json(
      { items },
      { headers: { 'Cache-Control': CATALOG_API_CACHE_CONTROL } },
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.brands]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener marcas del catálogo' },
      { status: 500 },
    )
  }
}
