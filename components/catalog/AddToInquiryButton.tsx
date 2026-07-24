'use client'

import { useState } from 'react'
import { useCatalogInquiryStore } from '@/lib/catalog-inquiry-store'

type AddToInquiryButtonProps = {
  product: {
    productId: number
    slug: string
    sku: string
    title: string
    primaryImage?: string | null
  }
  className?: string
  label?: string
}

export function AddToInquiryButton({
  product,
  className,
  label = 'Agregar a consulta',
}: AddToInquiryButtonProps) {
  const addItem = useCatalogInquiryStore((s) => s.addItem)
  const hasItem = useCatalogInquiryStore((s) => s.hasItem(product.productId))
  const [feedback, setFeedback] = useState<'added' | 'updated' | null>(null)

  function handleClick() {
    const result = addItem({
      productId: product.productId,
      slug: product.slug,
      sku: product.sku,
      title: product.title,
      primaryImage: product.primaryImage ?? null,
      quantity: 1,
    })
    setFeedback(result.added ? 'added' : 'updated')
    window.setTimeout(() => setFeedback(null), 2200)
  }

  const base =
    className ??
    'inline-flex flex-1 items-center justify-center rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:border-ifedel-primary hover:bg-ifedel-primary/10'

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button type="button" onClick={handleClick} className={base}>
        {hasItem && !feedback ? 'Sumar otra unidad' : label}
      </button>
      {feedback === 'added' ? (
        <p className="text-center text-xs font-medium text-ifedel-brown">
          Agregado a la consulta
        </p>
      ) : null}
      {feedback === 'updated' ? (
        <p className="text-center text-xs font-medium text-ifedel-brown">
          Cantidad actualizada en la consulta
        </p>
      ) : null}
    </div>
  )
}
