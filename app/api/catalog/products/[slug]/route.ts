/**
 * GET /api/catalog/products/[slug]
 *
 * API PÚBLICA — detalle (sin auth). Whitelist de serializer público.
 */
import { NextRequest, NextResponse } from 'next/server'
import {
  CatalogQueryError,
  queryCatalogProductBySlug,
} from '@/lib/catalog-queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    const product = await queryCatalogProductBySlug(params.slug)
    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 },
      )
    }
    return NextResponse.json(product)
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
