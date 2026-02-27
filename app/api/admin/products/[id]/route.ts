import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAdminKey, unauthorizedResponse } from '@/lib/admin-auth'
import { slugify } from '@/lib/utils'
import { ImportProductSchema } from '@/lib/import-schemas'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!verifyAdminKey(request)) {
    return unauthorizedResponse()
  }

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

    // Actualizar producto (eliminar relaciones existentes y recrear)
    await prisma.productImage.deleteMany({ where: { productId: id } })
    await prisma.productSpec.deleteMany({ where: { productId: id } })
    await prisma.productPrice.deleteMany({ where: { productId: id } })
    await prisma.productFile.deleteMany({ where: { productId: id } })

    const product = await prisma.product.update({
      where: { id },
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

    return NextResponse.json(product)
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
  if (!verifyAdminKey(request)) {
    return unauthorizedResponse()
  }

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
