import { NextRequest, NextResponse } from 'next/server'
import { slugify } from '@/lib/utils'
import { ImportProductSchema } from '@/lib/import-schemas'
import { resolveProductSlugForSave } from '@/lib/product-slug'
import { serializeProductForApi } from '@/lib/product-api'
import { AdminCategoryError } from '@/lib/admin-categories'
import { resolveProductCategoryFromInput } from '@/lib/admin-categories-service'

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

    let slug: string
    try {
      slug = await resolveProductSlugForSave(prisma, {
        requestedSlug: data.slug,
        title: data.title,
        sku: data.sku,
        requireSlug: Boolean(data.catalogVisible),
      })
    } catch (slugErr: unknown) {
      const err = slugErr as { message?: string; status?: number }
      return NextResponse.json(
        { error: err.message || 'Slug inválido' },
        { status: err.status || 400 },
      )
    }

    // Crear producto
    const product = await prisma.product.create({
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

    return NextResponse.json(serializeProductForApi(product, { includeCost: true }), {
      status: 201,
    })
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
