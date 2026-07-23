/**
 * GET /api/catalog/brands — API pública (sin auth).
 */
import { NextResponse } from 'next/server'
import { queryCatalogBrands } from '@/lib/catalog-queries'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const items = await queryCatalogBrands()
    return NextResponse.json({ items })
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
