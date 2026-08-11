'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtNumberAR } from '@/lib/format-money'

type Props = {
  quoteId: number
  initialRate: number | null
  canEdit: boolean
}

export function EditQuoteExchangeRate({
  quoteId,
  initialRate,
  canEdit,
}: Props) {
  const router = useRouter()
  const [value, setValue] = useState(
    initialRate != null && initialRate > 0 ? String(initialRate) : '',
  )
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!canEdit) {
    return (
      <div className="flex justify-between gap-2">
        <span className="text-gray-600">Tipo de cambio (ARS por USD)</span>
        <span className="text-gray-900">
          {initialRate != null ? fmtNumberAR(initialRate) : '—'}
        </span>
      </div>
    )
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const rate = Number(String(value).replace(',', '.'))
    if (!Number.isFinite(rate) || rate <= 0 || rate >= 1_000_000) {
      setError('Ingresá un tipo de cambio válido (número positivo)')
      setMessage(null)
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)
    try {
      const res = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exchangeRateARS: rate }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(data.error || 'No se pudo actualizar el tipo de cambio')
      }
      setMessage('Tipo de cambio actualizado. Totales ARS recalculados.')
      if (typeof data.exchangeRateARS === 'number') {
        setValue(String(data.exchangeRateARS))
      }
      router.refresh()
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al actualizar el tipo de cambio',
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-2">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <label className="text-gray-600" htmlFor={`quote-tc-${quoteId}`}>
          Tipo de cambio USD/ARS
        </label>
        <div className="flex items-center gap-2">
          <input
            id={`quote-tc-${quoteId}`}
            type="number"
            step="0.0001"
            min="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-28 rounded-md border px-2 py-1 text-sm text-right"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md border border-gray-300 px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading ? '…' : 'Guardar'}
          </button>
        </div>
      </div>
      <p className="text-xs text-gray-500">
        Tipo de cambio utilizado en esta cotización. Se tomó del valor vigente
        al momento de crearla y puede modificarse manualmente. Valor
        independiente del tipo de cambio actual.
      </p>
      {message ? (
        <p className="text-xs text-green-700">{message}</p>
      ) : null}
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
    </form>
  )
}
