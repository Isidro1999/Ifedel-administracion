'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Props = {
  quoteId: number
}

export function CancelQuoteButton({ quoteId }: Props) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (
      !window.confirm(
        '¿Cancelar esta cotización? El registro permanecerá en el sistema con estado Anulado.',
      )
    ) {
      return
    }

    setPending(true)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, { method: 'DELETE' })
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        window.alert(
          typeof data.error === 'string' ? data.error : 'No se pudo cancelar.',
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
      {pending ? 'Cancelando…' : 'Cancelar'}
    </button>
  )
}
