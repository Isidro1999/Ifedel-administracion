import { NextRequest, NextResponse } from 'next/server'
import { AdminCategoryError } from '@/lib/admin-categories'
import {
  createAdminCategory,
  listAdminCategoryTree,
  listAdminLeafOptions,
  listAdminRootOptions,
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
  if (err && typeof err === 'object' && 'name' in err && (err as { name: string }).name === 'ZodError') {
    return NextResponse.json(
      { error: 'Datos inválidos', details: err },
      { status: 400 }
    )
  }
  console.error('[admin/categories]', err)
  return NextResponse.json({ error: 'Error interno' }, { status: 500 })
}

export async function GET(request: NextRequest) {
  const [{ requireAdminSession }] = await Promise.all([
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const view = request.nextUrl.searchParams.get('view')
  try {
    if (view === 'leaves') {
      const leaves = await listAdminLeafOptions()
      return NextResponse.json({ leaves })
    }
    if (view === 'roots') {
      const roots = await listAdminRootOptions()
      return NextResponse.json({ roots })
    }
    const tree = await listAdminCategoryTree()
    return NextResponse.json({ tree })
  } catch (err) {
    return errorResponse(err)
  }
}

export async function POST(request: NextRequest) {
  const [{ requireAdminSession }] = await Promise.all([
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const body = await request.json()
    const created = await createAdminCategory(body)
    return NextResponse.json({ category: created }, { status: 201 })
  } catch (err) {
    return errorResponse(err)
  }
}
