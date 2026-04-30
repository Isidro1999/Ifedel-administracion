'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { registerReceivablePayment } from './actions'
import { fmtMoneyARS } from '@/lib/format-money'

type Props = {
  receivableId: number
  balance: number
  status: string
}

export function RegisterPaymentForm({
  receivableId,
  balance,
  status,
}: Props) {
  const router = useRouter()
  const [amount, setAmount] = useState('')
  const [paidAt, setPaidAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isDisabled =
    status === 'CANCELLED' ||
    status === 'PAID' ||
    balance <= 0 ||
    pending

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    const num = parseFloat(amount.replace(',', '.'))
    if (!Number.isFinite(num) || num <= 0) {
      setError('Ingresá un monto mayor a cero.')
      return
    }
    if (num > balance) {
      setError(
        `El monto no puede superar el saldo pendiente (${fmtMoneyARS(balance)}).`
      )
      return
    }
    setPending(true)
    try {
      const result = await registerReceivablePayment(
        receivableId,
        num,
        paidAt || undefined,
        reference.trim() || null,
        notes.trim() || null
      )
      if (result.success) {
        setSuccess(
          `Cobro registrado. Saldo pendiente: ${fmtMoneyARS(result.newBalance)}. Estado: ${result.newStatus}.`
        )
        setAmount('')
        router.refresh()
      } else {
        setError(result.error)
      }
    } finally {
      setPending(false)
    }
  }

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-4 text-sm">
      <h2 className="text-base font-semibold text-ifedel-black mb-3">
        Registrar cobro
      </h2>
      {isDisabled && status === 'PAID' && (
        <p className="text-gray-600 text-xs mb-3">
          Esta cuenta por cobrar ya está saldada.
        </p>
      )}
      {isDisabled && status === 'CANCELLED' && (
        <p className="text-gray-600 text-xs mb-3">
          No se pueden registrar cobros en una cuenta anulada.
        </p>
      )}
      {!isDisabled && (
        <p className="text-gray-600 text-xs mb-3">
          Saldo pendiente: <strong>{fmtMoneyARS(balance)}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div>
          <label htmlFor="amount" className="block text-xs font-medium text-gray-700 mb-1">
            Monto (ARS) *
          </label>
          <input
            id="amount"
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="paidAt" className="block text-xs font-medium text-gray-700 mb-1">
            Fecha del cobro
          </label>
          <input
            id="paidAt"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="reference" className="block text-xs font-medium text-gray-700 mb-1">
            Referencia (opcional)
          </label>
          <input
            id="reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Cheque, transferencia, etc."
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="notes" className="block text-xs font-medium text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <input
            id="notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && (
          <p className="text-red-600 text-xs">{error}</p>
        )}
        {success && (
          <p className="text-green-700 text-xs">{success}</p>
        )}
        <button
          type="submit"
          disabled={isDisabled}
          className="rounded-lg bg-ifedel-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-ifedel-primary/25 transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Registrando…' : 'Registrar cobro'}
        </button>
      </form>
    </section>
  )
}
