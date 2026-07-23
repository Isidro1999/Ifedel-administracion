/**
 * GET /api/catalog/products
 *
 * API PÚBLICA del catálogo (sin auth).
 * Solo productos con catalogVisible=true e isActive=true.
 * Whitelist vía serializeCatalogProductListItem.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  CatalogQueryError,
  queryCatalogProducts,
} from '@/lib/catalog-queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams
    const data = await queryCatalogProducts({
      q: sp.get('q') || undefined,
      brand: sp.get('brand') || undefined,
      category: sp.get('category') || undefined,
      featured: sp.get('featured') || undefined,
      page: sp.get('page') || undefined,
      pageSize: sp.get('pageSize') || undefined,
    })
    return NextResponse.json(data)
  } catch (error) {
    if (error instanceof CatalogQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.products]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener el catálogo de productos' },
      { status: 500 },
    )
  }
}
