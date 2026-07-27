/**
 * GET /api/catalog/products/[slug]
 *
 * API PÚBLICA — detalle (sin auth). Whitelist de serializer público.
 */
import { NextRequest, NextResponse } from 'next/server'
import { CATALOG_API_CACHE_CONTROL } from '@/lib/catalog-cache'
import {
  CatalogQueryError,
  getCatalogProductBySlug,
} from '@/lib/catalog-queries'

export const revalidate = 60
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const product = await getCatalogProductBySlug(params.slug)
    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        {
          status: 404,
          headers: {
            'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
          },
        },
      )
    }
    return NextResponse.json(product, {
      headers: { 'Cache-Control': CATALOG_API_CACHE_CONTROL },
    })
  } catch (error) {
    if (error instanceof CatalogQueryError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    if (process.env.NODE_ENV === 'development') {
      console.error('[catalog.products.slug]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener el producto' },
      { status: 500 },
    )
  }
}
