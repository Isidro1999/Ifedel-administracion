import { NextRequest, NextResponse } from 'next/server'
import { AdminCategoryError } from '@/lib/admin-categories'
import {
  deleteAdminCategory,
  updateAdminCategory,
} from '@/lib/admin-categories-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function errorResponse(err: unknown) {
  if (err instanceof AdminCategoryError) {
    return NextResponse.json(
      { error: err.message, code: err.code },
      { status: err.status }
    )
  }
  if (
    err &&
    typeof err === 'object' &&
    'name' in err &&
    (err as { name: string }).name === 'ZodError'
  ) {
    return NextResponse.json(
      { error: 'Datos inválidos', details: err },
      { status: 400 }
    )
  }
  console.error('[admin/categories/:id]', err)
  return NextResponse.json({ error: 'Error interno' }, { status: 500 })
}

type Ctx = { params: { id: string } }

export async function PUT(request: NextRequest, context: Ctx) {
  const [{ requireAdminSession }] = await Promise.all([
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const id = Number(context.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const body = await request.json()
    const updated = await updateAdminCategory(id, body)
    return NextResponse.json({ category: updated })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function DELETE(_request: NextRequest, context: Ctx) {
  const [{ requireAdminSession }] = await Promise.all([
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const id = Number(context.params.id)
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const result = await deleteAdminCategory(id)
    return NextResponse.json(result)
  } catch (err) {
    return errorResponse(err)
  }
}
