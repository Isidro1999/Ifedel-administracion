import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdminSession } from '@/lib/admin-auth'
import { slugify } from '@/lib/utils'
import { ImportProductSchema, ImportProduct } from '@/lib/import-schemas'
import Papa from 'papaparse'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface ImportResult {
  created: number
  updated: number
  failed: number
  errors: Array<{
    row: number
    sku?: string
    message: string
  }>
}

async function processProduct(
  data: ImportProduct,
  rowIndex: number
): Promise<{ success: boolean; error?: string }> {
  try {
    // Validar con Zod
    const validated = ImportProductSchema.parse(data)

    // Buscar o crear brand
    const brandSlug = slugify(validated.brand)
    let brand = await prisma.brand.findUnique({
      where: { slug: brandSlug },
    })
    if (!brand) {
      brand = await prisma.brand.create({
        data: {
          name: validated.brand,
          slug: brandSlug,
        },
      })
    }

    // Buscar o crear category
    const categorySlug = slugify(validated.category)
    let category = await prisma.category.findUnique({
      where: { slug: categorySlug },
    })
    if (!category) {
      category = await prisma.category.create({
        data: {
          name: validated.category,
          slug: categorySlug,
        },
      })
    }

    // Buscar producto existente por SKU
    const existingProduct = await prisma.product.findUnique({
      where: { sku: validated.sku },
    })

    if (existingProduct) {
      // UPDATE: eliminar relaciones existentes
      await prisma.productImage.deleteMany({
        where: { productId: existingProduct.id },
      })
      await prisma.productSpec.deleteMany({
        where: { productId: existingProduct.id },
      })
      await prisma.productPrice.deleteMany({
        where: { productId: existingProduct.id },
      })
      await prisma.productFile.deleteMany({
        where: { productId: existingProduct.id },
      })

      // Actualizar producto
      await prisma.product.update({
        where: { id: existingProduct.id },
        data: {
          title: validated.title,
          short: validated.short,
          description: validated.description,
          cost: validated.cost,
          costCurrency: validated.cost != null ? (validated.costCurrency ?? 'USD') : undefined,
          isActive: validated.isActive,
          isFeatured: validated.isFeatured,
          brandId: brand.id,
          categoryId: category.id,
          images: {
            create: validated.images.map((img) => ({
              url: img.url,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })),
          },
          specs: {
            create: validated.specs.map((spec) => ({
              label: spec.label,
              value: spec.value,
              sortOrder: spec.sortOrder,
            })),
          },
          prices: {
            create: validated.prices.map((price) => ({
              priceList: price.priceList,
              currency: price.currency,
              netPrice: price.netPrice,
              taxRate: price.taxRate,
              validFrom: price.validFrom ? new Date(price.validFrom) : null,
              validTo: price.validTo ? new Date(price.validTo) : null,
            })),
          },
          files: {
            create: validated.files.map((file) => ({
              type: file.type,
              url: file.url,
            })),
          },
        },
      })
    } else {
      // CREATE: crear nuevo producto
      await prisma.product.create({
        data: {
          sku: validated.sku,
          title: validated.title,
          short: validated.short,
          description: validated.description,
          cost: validated.cost,
          costCurrency: validated.cost != null ? (validated.costCurrency ?? 'USD') : undefined,
          isActive: validated.isActive,
          isFeatured: validated.isFeatured,
          brandId: brand.id,
          categoryId: category.id,
          images: {
            create: validated.images.map((img) => ({
              url: img.url,
              isPrimary: img.isPrimary,
              sortOrder: img.sortOrder,
            })),
          },
          specs: {
            create: validated.specs.map((spec) => ({
              label: spec.label,
              value: spec.value,
              sortOrder: spec.sortOrder,
            })),
          },
          prices: {
            create: validated.prices.map((price) => ({
              priceList: price.priceList,
              currency: price.currency,
              netPrice: price.netPrice,
              taxRate: price.taxRate,
              validFrom: price.validFrom ? new Date(price.validFrom) : null,
              validTo: price.validTo ? new Date(price.validTo) : null,
            })),
          },
          files: {
            create: validated.files.map((file) => ({
              type: file.type,
              url: file.url,
            })),
          },
        },
      })
    }

    return { success: true }
  } catch (error: any) {
    let errorMessage = 'Error desconocido'
    if (error.name === 'ZodError') {
      errorMessage = `Validación fallida: ${error.errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ')}`
    } else if (error.message) {
      errorMessage = error.message
    }
    return { success: false, error: errorMessage }
  }
}

function parseCSVRow(row: any): ImportProduct | null {
  try {
    // Parsear campos simples
    const product: any = {
      sku: row.sku || row.SKU || '',
      title: row.title || row.TITLE || row.name || row.NAME || '',
      brand: row.brand || row.BRAND || row.marca || row.MARCA || '',
      category: row.category || row.CATEGORY || row.categoria || row.CATEGORIA || '',
      short: row.short || row.SHORT || row.descripcion_corta || '',
      description: row.description || row.DESCRIPTION || row.descripcion || row.DESC || '',
      cost: row.cost !== undefined && row.cost !== '' ? parseFloat(row.cost) : undefined,
      costCurrency: row.costCurrency ?? row.cost_currency ?? (row.cost !== undefined && row.cost !== '' ? 'USD' : undefined),
      // isActive: si está vacío, undefined o "true"/"1" → true. Solo "false"/"0" → false
      isActive: ['false', '0', 'no'].includes(String(row.isActive ?? row.IS_ACTIVE ?? '').toLowerCase()) ? false : true,
      isFeatured: ['true', '1', 'yes'].includes(String(row.isFeatured ?? row.IS_FEATURED ?? '').toLowerCase()),
    }

    // Parsear imágenes (formato: url1|url2 o JSON)
    if (row.images || row.IMAGES) {
      try {
        product.images = JSON.parse(row.images || row.IMAGES)
      } catch {
        const urls = (row.images || row.IMAGES).split('|').filter((u: string) => u.trim())
        product.images = urls.map((url: string, idx: number) => ({
          url: url.trim(),
          isPrimary: idx === 0,
          sortOrder: idx,
        }))
      }
    } else {
      product.images = []
    }

    // Parsear specs (formato: label1:value1|label2:value2 o JSON)
    if (row.specs || row.SPECS) {
      try {
        product.specs = JSON.parse(row.specs || row.SPECS)
      } catch {
        const specs = (row.specs || row.SPECS).split('|').filter((s: string) => s.trim())
        product.specs = specs.map((spec: string, idx: number) => {
          const [label, ...valueParts] = spec.split(':')
          return {
            label: label.trim(),
            value: valueParts.join(':').trim(),
            sortOrder: idx,
          }
        })
      }
    } else {
      product.specs = []
    }

    // Parsear precios (formato: priceList:currency:netPrice:taxRate o JSON)
    if (row.prices || row.PRICES) {
      try {
        product.prices = JSON.parse(row.prices || row.PRICES)
      } catch {
        const prices = (row.prices || row.PRICES).split('|').filter((p: string) => p.trim())
        product.prices = prices.map((price: string) => {
          const parts = price.split(':')
          return {
            priceList: parts[0]?.trim() || 'default',
            currency: parts[1]?.trim() || 'ARS',
            netPrice: parseFloat(parts[2] || '0'),
            taxRate: parseFloat(parts[3] || '0'),
          }
        })
      }
    } else {
      product.prices = []
    }

    // Parsear archivos (formato: type:url|type:url o JSON)
    if (row.files || row.FILES) {
      try {
        product.files = JSON.parse(row.files || row.FILES)
      } catch {
        const files = (row.files || row.FILES).split('|').filter((f: string) => f.trim())
        product.files = files.map((file: string) => {
          const [type, ...urlParts] = file.split(':')
          return {
            type: type.trim(),
            url: urlParts.join(':').trim(),
          }
        })
      }
    } else {
      product.files = []
    }

    return product as ImportProduct
  } catch (error) {
    return null
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    const format = formData.get('format') as string || 'json'

    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }

    const text = await file.text()
    let products: ImportProduct[] = []

    // Parsear según formato
    if (format === 'csv' || file.name.endsWith('.csv')) {
      const parsed = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
      })

      products = parsed.data
        .map((row: any) => parseCSVRow(row))
        .filter((p): p is ImportProduct => p !== null)
    } else {
      // JSON
      try {
        const parsed = JSON.parse(text)
        products = Array.isArray(parsed) ? parsed : [parsed]
      } catch (error) {
        return NextResponse.json(
          { error: 'JSON inválido' },
          { status: 400 }
        )
      }
    }

    if (products.length === 0) {
      return NextResponse.json(
        { error: 'No se encontraron productos para importar' },
        { status: 400 }
      )
    }

    // Procesar cada producto
    const result: ImportResult = {
      created: 0,
      updated: 0,
      failed: 0,
      errors: [],
    }

    for (let i = 0; i < products.length; i++) {
      const product = products[i]
      const existingProduct = await prisma.product.findUnique({
        where: { sku: product.sku },
      })

      const processResult = await processProduct(product, i + 1)

      if (processResult.success) {
        if (existingProduct) {
          result.updated++
        } else {
          result.created++
        }
      } else {
        result.failed++
        result.errors.push({
          row: i + 1,
          sku: product.sku,
          message: processResult.error || 'Error desconocido',
        })
      }
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Error importing products:', error)
    return NextResponse.json(
      { error: 'Error al importar productos', details: error.message },
      { status: 500 }
    )
  }
}
