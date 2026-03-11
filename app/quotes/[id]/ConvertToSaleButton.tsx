'use client'

import { useState } from 'react'
import Link from 'next/link'
import { convertQuoteToSale } from './actions'

type Props = {
  quoteId: number
  existingSale: { id: number; saleNumber: string } | null
}

export function ConvertToSaleButton({ quoteId, existingSale }: Props) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (existingSale) {
    return (
      <div className="flex flex-col items-end gap-1">
        <Link
          href={`/sales/${existingSale.id}`}
          className="rounded-md border border-ifedel-green bg-ifedel-green/10 px-4 py-2 text-sm font-medium text-ifedel-green hover:bg-ifedel-green/20"
        >
          Ver venta {existingSale.saleNumber}
        </Link>
        <span className="text-xs text-gray-500">
          Ya convertida en venta
        </span>
      </div>
    )
  }

  async function handleConvert() {
    setError(null)
    setPending(true)
    try {
      const result = await convertQuoteToSale(quoteId)
      if (result?.error) {
        setError(result.error)
      }
      // Si no hay error, la acción hace redirect y no llegamos aquí
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleConvert}
        disabled={pending}
        className="rounded-md border border-ifedel-green bg-ifedel-green px-4 py-2 text-sm font-medium text-white hover:bg-ifedel-green/90 disabled:opacity-60"
      >
        {pending ? 'Convirtiendo…' : 'Convertir en venta'}
      </button>
      {error && (
        <p className="text-xs text-red-600 max-w-[220px] text-right">
          {error}
        </p>
      )}
    </div>
  )
}
