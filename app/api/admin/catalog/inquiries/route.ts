/**
 * GET /api/admin/catalog/inquiries
 * Listado paginado de consultas comerciales (solo ADMIN).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireAdminSession } from '@/lib/admin-auth'
import { listAdminCommercialInquiries } from '@/lib/admin-catalog-inquiries'
import { privateApiHeaders } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const result = await listAdminCommercialInquiries(
      request.nextUrl.searchParams,
    )
    return NextResponse.json(result, { headers: privateApiHeaders() })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin.catalog.inquiries.list]', error)
    }
    return NextResponse.json(
      { error: 'Error al listar consultas comerciales' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
