import { NextRequest, NextResponse } from 'next/server'
import { slugify } from '@/lib/utils'
import { ImportProductSchema } from '@/lib/import-schemas'
import { resolveProductSlugForSave } from '@/lib/product-slug'
import { serializeProductForApi } from '@/lib/product-api'
import { AdminCategoryError } from '@/lib/admin-categories'
import { resolveProductCategoryFromInput } from '@/lib/admin-categories-service'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const [{ prisma }, { requireAdminSession }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const id = parseInt(params.id)
    if (isNaN(id)) {
      return NextResponse.json(
        { error: 'ID inválido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const data = ImportProductSchema.parse(body)

    // Verificar que el producto existe
    const existingProduct = await prisma.product.findUnique({
      where: { id },
    })

    if (!existingProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

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

    let category: { id: number }
    try {
      category = await resolveProductCategoryFromInput({
        categoryId: data.categoryId,
        categorySlug: data.categorySlug,
        category: data.category,
      })
    } catch (catErr) {
      if (catErr instanceof AdminCategoryError) {
        return NextResponse.json(
          { error: catErr.message, code: catErr.code },
          { status: catErr.status }
        )
      }
      throw catErr
    }

    // Actualizar producto (especificaciones, precios, archivos, pero no imágenes:
    // las imágenes se gestionan por endpoints dedicados con Cloudinary)
    await prisma.productSpec.deleteMany({ where: { productId: id } })
    await prisma.productPrice.deleteMany({ where: { productId: id } })
    await prisma.productFile.deleteMany({ where: { productId: id } })

    let slug: string
    try {
      slug = await resolveProductSlugForSave(prisma, {
        requestedSlug: data.slug ?? existingProduct.slug,
        title: data.title,
        sku: data.sku,
        excludeProductId: id,
        requireSlug: Boolean(data.catalogVisible),
      })
    } catch (slugErr: unknown) {
      const err = slugErr as { message?: string; status?: number }
      return NextResponse.json(
        { error: err.message || 'Slug inválido' },
        { status: err.status || 400 },
      )
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        sku: data.sku,
        title: data.title,
        slug,
        short: data.short,
        description: data.description,
        cost: data.cost,
        costCurrency: data.cost != null ? (data.costCurrency ?? 'USD') : undefined,
        isActive: data.isActive,
        isFeatured: data.isFeatured,
        catalogVisible: data.catalogVisible ?? false,
        publicTitle: data.publicTitle?.trim() || null,
        publicShortDescription: data.publicShortDescription?.trim() || null,
        publicDescription: data.publicDescription?.trim() || null,
        catalogSort: data.catalogSort ?? 0,
        showPrice: data.showPrice ?? false,
        catalogPriceList: data.catalogPriceList?.trim() || null,
        brandId: brand.id,
        categoryId: category.id,
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
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
        },
        specs: true,
        prices: true,
        files: true,
      },
    })

    return NextResponse.json(serializeProductForApi(product, { includeCost: true }))
  } catch (error: any) {
    console.error('Error updating product:', error)
    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al actualizar producto' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const [{ prisma }, { requireAdminSession }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

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
    })

    if (!product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    await prisma.product.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting product:', error)
    return NextResponse.json(
      { error: 'Error al eliminar producto' },
      { status: 500 }
    )
  }
}
