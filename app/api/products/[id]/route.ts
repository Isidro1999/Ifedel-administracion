import { NextRequest, NextResponse } from 'next/server'
import {
  privateApiHeaders,
  requireApprovedSession,
} from '@/lib/session-auth'
import { serializeProductForApi } from '@/lib/product-api'
import { withPerf } from '@/lib/perf'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const brandCategorySelect = {
  select: {
    id: true,
    name: true,
    slug: true,
    parentId: true,
    parent: { select: { id: true, name: true, slug: true } },
  },
} as const

const imageSelect = {
  id: true,
  url: true,
  isPrimary: true,
  sortOrder: true,
} as const

const imageSelectEdit = {
  ...imageSelect,
  publicId: true,
  createdAt: true,
} as const

const specSelect = {
  id: true,
  label: true,
  value: true,
  sortOrder: true,
} as const

const priceSelect = {
  id: true,
  priceList: true,
  currency: true,
  netPrice: true,
  taxRate: true,
  validFrom: true,
  validTo: true,
} as const

const priceSelectEdit = {
  ...priceSelect,
  createdAt: true,
  updatedAt: true,
} as const

const fileSelect = {
  id: true,
  type: true,
  url: true,
} as const

/**
 * API INTERNA — requiere sesión APPROVED.
 * No es pública. El catálogo público usa `/api/catalog/*`.
 *
 * Query `view`:
 * - `detail` → consulta /products/[id] (payload lean)
 * - `edit` → edición admin (catálogo + cost si ADMIN)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const gate = await requireApprovedSession()
  if (!gate.ok) return gate.response

  const viewParam = request.nextUrl.searchParams.get('view')
  const view = viewParam === 'detail' ? 'detail' : 'edit'
  const includeCost = view === 'edit' && gate.role === 'ADMIN'
  const perfOp = view === 'detail' ? 'product.detail' : 'product.edit'

  const { prisma } = await import('@/lib/prisma')
  try {
    const id = parseInt(params.id)

    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400, headers: privateApiHeaders() },
      )
    }

    const product = await withPerf(perfOp, async () => {
      if (view === 'detail') {
        return prisma.product.findUnique({
          where: { id },
          select: {
            id: true,
            sku: true,
            title: true,
            short: true,
            description: true,
            isActive: true,
            isFeatured: true,
            brand: brandCategorySelect,
            category: brandCategorySelect,
            images: {
              orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
              select: imageSelect,
            },
            specs: {
              orderBy: { sortOrder: 'asc' },
              select: specSelect,
            },
            prices: {
              orderBy: [
                { createdAt: 'desc' },
                { priceList: 'asc' },
                { currency: 'asc' },
              ],
              select: priceSelect,
            },
            files: {
              orderBy: { createdAt: 'desc' },
              select: fileSelect,
            },
          },
        })
      }

      return prisma.product.findUnique({
        where: { id },
        select: {
          id: true,
          sku: true,
          title: true,
          short: true,
          description: true,
          ...(includeCost
            ? { cost: true as const, costCurrency: true as const }
            : {}),
          isActive: true,
          isFeatured: true,
          slug: true,
          catalogVisible: true,
          publicTitle: true,
          publicShortDescription: true,
          publicDescription: true,
          catalogSort: true,
          showPrice: true,
          catalogPriceList: true,
          brandId: true,
          categoryId: true,
          createdAt: true,
          updatedAt: true,
          brand: brandCategorySelect,
          category: brandCategorySelect,
          images: {
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            select: imageSelectEdit,
          },
          specs: {
            orderBy: { sortOrder: 'asc' },
            select: { ...specSelect, createdAt: true },
          },
          prices: {
            orderBy: [
              { createdAt: 'desc' },
              { priceList: 'asc' },
              { currency: 'asc' },
            ],
            select: priceSelectEdit,
          },
          files: {
            orderBy: { createdAt: 'desc' },
            select: { ...fileSelect, createdAt: true },
          },
        },
      })
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404, headers: privateApiHeaders() },
      )
    }

    return NextResponse.json(
      serializeProductForApi(product, { includeCost, view }),
      { headers: privateApiHeaders() },
    )
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      { error: 'Error al obtener producto' },
      { status: 500, headers: privateApiHeaders() },
    )
  }
}
