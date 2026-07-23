import { NextRequest, NextResponse } from 'next/server'
import { requireApprovedSession } from '@/lib/session-auth'
import { serializeProductForApi } from '@/lib/product-api'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  const includeCost = gate.role === 'ADMIN'

  const { prisma } = await import('@/lib/prisma')
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        specs: {
          orderBy: { sortOrder: 'asc' },
        },
        prices: {
          orderBy: [
            { createdAt: 'desc' },
            { priceList: 'asc' },
            { currency: 'asc' },
          ],
        },
        files: {
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json(serializeProductForApi(product, { includeCost }))
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500 }
    )
  }
}
