'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  saleId: number
}

export function CancelSaleButton({ saleId }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (
      !window.confirm(
        '¿Anular esta venta? No se borrarán registros. Si no hubo cobros, se cancelará la cuenta por cobrar asociada. Si ya hay cobros en caja, la operación será rechazada.',
      )
    ) {
      return
    }

    setPending(true)
    try {
      const res = await fetch(`/api/sales/${saleId}`, { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        window.alert(
          typeof data.error === 'string' ? data.error : 'No se pudo anular.',
        )
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="text-xs font-medium text-rose-600 hover:text-rose-800 disabled:opacity-50"
    >
      {pending ? 'Anulando…' : 'Anular'}
    </button>
  )
}
