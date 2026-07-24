import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const [{ prisma }, { requireAdminSession }, { cloudinary }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
    import('@/lib/cloudinary'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const productId = Number(params.id)
  if (!Number.isFinite(productId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true },
    })

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json(
        { error: 'Debe enviar un archivo en el campo "file"' },
        { status: 400 }
      )
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Solo se permiten archivos de imagen' },
        { status: 400 }
      )
    }

    const maxBytes = 8 * 1024 * 1024
    if (file.size > maxBytes) {
      return NextResponse.json(
        { error: 'Imagen demasiado grande (máx 8MB)' },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const folderBase = process.env.CLOUDINARY_FOLDER || 'ifedel/products'
    const folder = product.sku
      ? `${folderBase}/${product.sku}`
      : `${folderBase}/product-${product.id}`

    const uploadResult = await new Promise<import('cloudinary').UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder },
          (error, result) => {
            if (error || !result) return reject(error || new Error('Upload failed'))
            resolve(result)
          }
        )
        stream.end(buffer)
      }
    )

    const existingCount = await prisma.productImage.count({
      where: { productId: product.id },
    })

    const image = await prisma.productImage.create({
      data: {
        productId: product.id,
        url: uploadResult.secure_url,
        publicId: uploadResult.public_id,
        isPrimary: existingCount === 0,
        sortOrder: existingCount,
      },
    })

    return NextResponse.json(image, { status: 201 })
  } catch (error) {
    console.error('Error subiendo imagen:', error)
    return NextResponse.json(
      { error: 'Error al subir imagen' },
      { status: 500 }
    )
  }
}

