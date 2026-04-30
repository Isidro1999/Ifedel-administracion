import { NextRequest, NextResponse } from 'next/server'
import { slugify } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const { prisma } = await import('@/lib/prisma')
  try {
    const searchParams = request.nextUrl.searchParams
    const q = searchParams.get('q') || ''
    const brand = searchParams.get('brand') || ''
    const category = searchParams.get('category') || ''
    const priceList = searchParams.get('priceList') || ''
    const currency = searchParams.get('currency') || ''
    const sort = searchParams.get('sort') || 'name_asc'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '12')

    // Construir filtros
    const where: any = {
      isActive: true,
    }

    // Búsqueda por texto (title o sku)
    if (q) {
      where.OR = [
        { title: { contains: q } },
        { sku: { contains: q } },
      ]
    }

    // Filtro por marca
    if (brand) {
      where.brand = {
        OR: [
          { slug: brand },
          { name: { contains: brand } },
        ],
      }
    }

    // Filtro por categoría
    if (category) {
      where.category = {
        OR: [
          { slug: category },
          { name: { contains: category } },
        ],
      }
    }

    // Filtro por lista de precios y moneda (solo si el usuario los pasó explícitamente)
    if (priceList || currency) {
      where.prices = {
        some: {
          ...(priceList && { priceList }),
          ...(currency && { currency }),
        },
      }
    }

    // Ordenamiento
    let orderBy: any = {}
    let needsPriceSort = false
    switch (sort) {
      case 'name_asc':
        orderBy = { title: 'asc' }
        break
      case 'name_desc':
        orderBy = { title: 'desc' }
        break
      case 'price_asc':
      case 'price_desc':
        // Para ordenamiento por precio, ordenamos por título primero
        // y luego ordenamos en memoria
        orderBy = { title: 'asc' }
        needsPriceSort = true
        break
      default:
        orderBy = { title: 'asc' }
    }

    // Contar total
    const total = await prisma.product.count({ where })

    // Obtener productos con relaciones necesarias
    // Si necesitamos ordenar por precio, obtenemos todos primero
    const takeLimit = needsPriceSort ? undefined : pageSize
    const skipLimit = needsPriceSort ? undefined : (page - 1) * pageSize

    let products = await prisma.product.findMany({
      where,
      include: {
        brand: true,
        category: true,
        images: {
          orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
          take: 1,
        },
        prices: {
          where: {
            ...(priceList && { priceList }),
            ...(currency && { currency }),
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy,
      skip: skipLimit,
      take: takeLimit,
    })

    // Ordenar por precio si es necesario
    if (needsPriceSort) {
      products.sort((a, b) => {
        const priceA = a.prices.length > 0 ? a.prices[0].netPrice : Infinity
        const priceB = b.prices.length > 0 ? b.prices[0].netPrice : Infinity
        if (sort === 'price_asc') {
          return priceA - priceB
        } else {
          return priceB - priceA
        }
      })
      // Aplicar paginación después del ordenamiento
      products = products.slice((page - 1) * pageSize, page * pageSize)
      // Limitar precios a 1 después del ordenamiento
      products = products.map((p) => ({
        ...p,
        prices: p.prices.slice(0, 1),
      }))
    }

    // Obtener facets (brands y categories con conteos)
    const [brandFacets, categoryFacets] = await Promise.all([
      prisma.brand.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                  ...(q && {
                    OR: [
                      { title: { contains: q } },
                      { sku: { contains: q } },
                    ],
                  }),
                },
              },
            },
          },
        },
      }),
      prisma.category.findMany({
        include: {
          _count: {
            select: {
              products: {
                where: {
                  isActive: true,
                  ...(q && {
                    OR: [
                      { title: { contains: q } },
                      { sku: { contains: q } },
                    ],
                  }),
                },
              },
            },
          },
        },
      }),
    ])

    const facets = {
      brands: brandFacets
        .filter((b) => b._count.products > 0)
        .map((b) => ({ name: b.name, count: b._count.products })),
      categories: categoryFacets
        .filter((c) => c._count.products > 0)
        .map((c) => ({ name: c.name, count: c._count.products })),
    }

    return NextResponse.json({
      items: products,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
      facets,
    })
  } catch (error) {
    console.error('Error fetching products:', error)
    return NextResponse.json(
      { error: 'Error al obtener productos' },
      { status: 500 }
    )
  }
}
