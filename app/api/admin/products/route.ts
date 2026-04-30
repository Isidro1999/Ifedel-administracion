import { NextRequest, NextResponse } from 'next/server'
import { slugify } from '@/lib/utils'
import { ImportProductSchema } from '@/lib/import-schemas'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  const [{ prisma }, { requireAdminSession }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const body = await request.json()
    const data = ImportProductSchema.parse(body)

    // Buscar o crear brand
    const brandSlug = slugify(data.brand)
    let brand = await prisma.brand.findUnique({
      where: { slug: brandSlug },
    })
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: data.brand,
          slug: brandSlug,
        },
      })
    }

    // Buscar o crear category
    const categorySlug = slugify(data.category)
    let category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    })
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: data.category,
          slug: categorySlug,
        },
      })
    }

    // Crear producto
    const product = await prisma.product.create({
      data: {
        sku: data.sku,
        title: data.title,
        short: data.short,
        description: data.description,
        cost: data.cost,
        costCurrency: data.cost != null ? (data.costCurrency ?? 'USD') : undefined,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        brandId: brand.id,
        categoryId: category.id,
        images: {
          create: data.images.map((img) => ({
            url: img.url,
            isPrimary: img.isPrimary,
            sortOrder: img.sortOrder,
          })),
        },
        specs: {
          create: data.specs.map((spec) => ({
            label: spec.label,
            value: spec.value,
            sortOrder: spec.sortOrder,
          })),
        },
        prices: {
          create: data.prices.map((price) => ({
            priceList: price.priceList,
            currency: price.currency,
            netPrice: price.netPrice,
            taxRate: price.taxRate,
            validFrom: price.validFrom ? new Date(price.validFrom) : null,
            validTo: price.validTo ? new Date(price.validTo) : null,
          })),
        },
        files: {
          create: data.files.map((file) => ({
            type: file.type,
            url: file.url,
          })),
        },
      },
      include: {
        brand: true,
        category: true,
        images: true,
        specs: true,
        prices: true,
        files: true,
      },
    })

    return NextResponse.json(product, { status: 201 })
  } catch (error: any) {
    console.error('Error creating product:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear producto' },
      { status: 500 }
    )
  }
}
