'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AddToInquiryButton } from '@/components/catalog/AddToInquiryButton'
import { useCatalogInquiryStore } from '@/lib/catalog-inquiry-store'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

type ProductDetailActionsProps = {
  product: {
    productId: number
    slug: string
    sku: string
    title: string
    primaryImage?: string | null
  }
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const router = useRouter()
  const { path } = useCatalogPath()
  const addItem = useCatalogInquiryStore((s) => s.addItem)

  function consultThisProduct() {
    addItem({
      productId: product.productId,
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      primaryImage: product.primaryImage ?? null,
      quantity: 1,
    })
    router.push(path('consulta'))
  }

  return (
    <div className="mt-8 flex flex-col gap-3 sm:flex-row">
      <AddToInquiryButton
        product={product}
        className="inline-flex w-full flex-1 items-center justify-center rounded-full bg-ifedel-primary px-5 py-3 text-sm font-semibold text-black transition hover:brightness-105"
      />
      <button
        type="button"
        onClick={consultThisProduct}
        className="inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-ifedel-brown hover:text-ifedel-brown"
      >
        Consultar por este producto
      </button>
      <Link
        href={path('consulta')}
        className="inline-flex items-center justify-center rounded-full px-3 py-3 text-sm font-medium text-ifedel-brown hover:underline sm:hidden"
      >
        Ver mi consulta
      </Link>
    </div>
  )
}
