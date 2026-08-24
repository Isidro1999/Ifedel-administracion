/**
 * GET /api/catalog/categories/[slug] — resolución pública V1 por slug.
 */
import { NextRequest, NextResponse } from 'next/server'
import { CATALOG_API_CACHE_CONTROL } from '@/lib/catalog-cache'
import {
  CatalogQueryError,
  getCatalogCategoryBySlug,
} from '@/lib/catalog-queries'

export const revalidate = 60
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const category = await getCatalogCategoryBySlug(params.slug)
    if (!category) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 },
      )
    }
    return NextResponse.json(category, {
      headers: { 'Cache-Control': CATALOG_API_CACHE_CONTROL },
    })
  } catch (error) {
    if (error instanceof CatalogQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.categories.slug]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener la categoría' },
      { status: 500 },
    )
  }
}
