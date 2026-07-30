/**
 * POST /api/admin/catalog/bulk
 *
 * Aplica acciones masivas de catálogo (publish/unpublish/feature/…).
 * Reutiliza validación dry-run; solo ADMIN. Headers private, no-store.
 */
import { NextRequest, NextResponse } from 'next/server'
import { privateApiHeaders } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const [
    { requireAdminSession },
    { parseAdminCatalogValidateBody, bulkAdminCatalogProducts },
  ] = await Promise.all([
    import('@/lib/admin-auth'),
    import('@/lib/admin-catalog-bulk'),
  ])

  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body JSON inválido' },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  const parsed = parseAdminCatalogValidateBody(body)
  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  try {
    const result = await bulkAdminCatalogProducts(parsed.input)
    return NextResponse.json(result, { headers: privateApiHeaders() })
  } catch (error) {
    console.error('[api/admin/catalog/bulk]', error)
    return NextResponse.json(
      { error: 'Error al aplicar acciones masivas del catálogo' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
