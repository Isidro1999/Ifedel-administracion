/**
 * GET /api/admin/catalog/products
 *
 * Listado admin-only para publicar productos en el catálogo online.
 * Sin cost / prices / specs / files. Headers private, no-store.
 */
import { NextRequest, NextResponse } from 'next/server'
import { privateApiHeaders } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const [{ requireAdminSession }, { listAdminCatalogProducts }] =
    await Promise.all([
      import('@/lib/admin-auth'),
      import('@/lib/admin-catalog'),
    ])

  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const result = await listAdminCatalogProducts(request.nextUrl.searchParams)
    return NextResponse.json(result, { headers: privateApiHeaders() })
  } catch (error) {
    console.error('[api/admin/catalog/products]', error)
    return NextResponse.json(
      { error: 'Error al listar productos del catálogo' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
