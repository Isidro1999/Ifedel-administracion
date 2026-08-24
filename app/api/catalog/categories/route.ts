/**
 * GET /api/catalog/categories — API pública (sin auth).
 *
 * Query:
 *   view=tree  → árbol jerárquico V1 (P4A)
 *   (default)  → lista plana de hojas con productos publicados (compat)
 */
import { NextRequest, NextResponse } from 'next/server'
import { CATALOG_API_CACHE_CONTROL } from '@/lib/catalog-cache'
import {
  getCatalogCategories,
  getCatalogCategoryTree,
} from '@/lib/catalog-queries'

export const revalidate = 60
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const view = request.nextUrl.searchParams.get('view')?.trim().toLowerCase()
    if (view === 'tree') {
      const items = await getCatalogCategoryTree()
      return NextResponse.json(
        { items, view: 'tree' as const },
        { headers: { 'Cache-Control': CATALOG_API_CACHE_CONTROL } },
      )
    }

    const items = await getCatalogCategories()
    return NextResponse.json(
      { items, view: 'flat' as const },
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
