'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerCashOut } from './actions'

export function RegisterCashOutForm() {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [occurredAt, setOccurredAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [concept, setConcept] = useState('')
  const [category, setCategory] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const num = parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(num) || num <= 0) {
      setError('Ingresá un monto mayor a cero.')
      return
    }
    if (!concept.trim()) {
      setError('El concepto es obligatorio.')
      return
    }

    setPending(true)
    try {
      const result = await registerCashOut({
        amount: num,
        occurredAt,
        concept,
        category,
      })
      if (!result.success) {
        setError(result.error)
      } else {
        setSuccess('Egreso registrado correctamente.')
        setAmount('')
        setConcept('')
        setCategory('')
        router.refresh()
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <h2 className="text-base font-semibold text-ifedel-black mb-3">
        Registrar egreso manual
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div>
          <label
            htmlFor="amount"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Monto (ARS) *
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="occurredAt"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Fecha del egreso
          </label>
          <input
            id="occurredAt"
            type="date"
            value={occurredAt}
            onChange={(e) => setOccurredAt(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="concept"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Concepto *
          </label>
          <input
            id="concept"
            type="text"
            value={concept}
            onChange={(e) => setConcept(e.target.value)}
            placeholder="Sueldo, servicios, honorarios, etc."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="category"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Categoría (opcional)
          </label>
          <input
            id="category"
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="SUELDO, GASTO_ADMIN, IMPUESTO, etc."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        {success && <p className="text-xs text-green-700">{success}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-ifedel-green px-4 py-2 text-sm font-medium text-white hover:bg-ifedel-green/90 disabled:opacity-50"
        >
          {pending ? 'Guardando…' : 'Registrar egreso'}
        </button>
      </form>
    </section>
  )
}

