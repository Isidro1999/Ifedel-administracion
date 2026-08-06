/**
 * GET /api/admin/catalog/inquiries/[id]
 * PATCH /api/admin/catalog/inquiries/[id] — solo { status }
 */
import { NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'
import { requireAdminSession } from '@/lib/admin-auth'
import {
  getAdminCommercialInquiryById,
  updateCommercialInquiryStatus,
} from '@/lib/admin-catalog-inquiries'
import { UpdateCommercialInquiryStatusSchema } from '@/lib/catalog-inquiry-schemas'
import { privateApiHeaders } from '@/lib/session-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { id: string } }

function parseId(raw: string): number | null {
  const id = Number.parseInt(raw, 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return id
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const id = parseId(context.params.id)
  if (id == null) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  try {
    const inquiry = await getAdminCommercialInquiryById(id)
    if (!inquiry) {
      return NextResponse.json(
        { error: 'Consulta no encontrada' },
        { status: 404, headers: privateApiHeaders() },
      )
    }
    return NextResponse.json({ inquiry }, { headers: privateApiHeaders() })
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin.catalog.inquiries.get]', error)
    }
    return NextResponse.json(
      { error: 'Error al obtener la consulta' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const id = parseId(context.params.id)
  if (id == null) {
    return NextResponse.json(
      { error: 'ID inválido' },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  let json: unknown
  try {
    json = await request.json()
  } catch {
    return NextResponse.json(
      { error: 'Body inválido' },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  let status: string
  try {
    const parsed = UpdateCommercialInquiryStatusSchema.parse(json)
    status = parsed.status
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          error: error.issues[0]?.message || 'Estado inválido',
        },
        { status: 400, headers: privateApiHeaders() },
      )
    }
    return NextResponse.json(
      { error: 'Datos inválidos' },
      { status: 400, headers: privateApiHeaders() },
    )
  }

  try {
    const updated = await updateCommercialInquiryStatus(
      id,
      status as Parameters<typeof updateCommercialInquiryStatus>[1],
    )
    if (!updated) {
      return NextResponse.json(
        { error: 'Consulta no encontrada' },
        { status: 404, headers: privateApiHeaders() },
      )
    }
    return NextResponse.json(
      { success: true, inquiry: updated },
      { headers: privateApiHeaders() },
    )
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[admin.catalog.inquiries.patch]', error)
    }
    return NextResponse.json(
      { error: 'No se pudo actualizar el estado' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
