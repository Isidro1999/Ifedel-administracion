import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const [{ prisma }, { requireAdminSession }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const productId = Number(params.id)
  const imageId = Number(params.imageId)

  if (!Number.isFinite(productId) || !Number.isFinite(imageId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const body = (await request.json()) as {
      isPrimary?: boolean
      sortOrder?: number
    }

    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    })

    if (!image) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    if (body.isPrimary) {
      await prisma.$transaction([
        prisma.productImage.updateMany({
          where: { productId },
          data: { isPrimary: false },
        }),
        prisma.productImage.update({
          where: { id: imageId },
          data: { isPrimary: true },
        }),
      ])
    }

    if (typeof body.sortOrder === 'number') {
      await prisma.productImage.update({
        where: { id: imageId },
        data: { sortOrder: body.sortOrder },
      })
    }

    const updated = await prisma.productImage.findUnique({
      where: { id: imageId },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error actualizando imagen:', error)
    return NextResponse.json(
      { error: 'Error al actualizar imagen' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  const [{ prisma }, { requireAdminSession }, { cloudinary }] = await Promise.all([
    import('@/lib/prisma'),
    import('@/lib/admin-auth'),
    import('@/lib/cloudinary'),
  ])
  const gate = await requireAdminSession()
  if (!gate.ok) return gate.response

  const productId = Number(params.id)
  const imageId = Number(params.imageId)

  if (!Number.isFinite(productId) || !Number.isFinite(imageId)) {
    return NextResponse.json({ error: 'ID inválido' }, { status: 400 })
  }

  try {
    const image = await prisma.productImage.findFirst({
      where: { id: imageId, productId },
    })

    if (!image) {
      return NextResponse.json({ error: 'Imagen no encontrada' }, { status: 404 })
    }

    if (image.publicId) {
      try {
        await cloudinary.uploader.destroy(image.publicId)
      } catch (err) {
        console.error('Error eliminando en Cloudinary:', err)
      }
    }

    await prisma.productImage.delete({
      where: { id: imageId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error eliminando imagen:', error)
    return NextResponse.json(
      { error: 'Error al eliminar imagen' },
      { status: 500 }
    )
  }
}

