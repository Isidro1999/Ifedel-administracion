'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fmtMoneyARS } from '@/lib/format-money'
import { registerPayablePayment } from './actions'

type Props = {
  payableId: number
  balance: number
  status: string
}

export function RegisterPayablePaymentForm({
  payableId,
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
    status === 'CANCELLED' || status === 'PAID' || balance <= 0 || pending

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
      const result = await registerPayablePayment(
        payableId,
        num,
        paidAt || undefined,
        reference.trim() || null,
        notes.trim() || null
      )
      if (result.success) {
        setSuccess(
          `Pago registrado. Saldo pendiente: ${fmtMoneyARS(result.newBalance)}. Estado: ${result.newStatus}.`
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
        Registrar pago
      </h2>
      {isDisabled && status === 'PAID' && (
        <p className="text-gray-600 text-xs mb-3">
          Esta cuenta por pagar ya está saldada.
        </p>
      )}
      {isDisabled && status === 'CANCELLED' && (
        <p className="text-gray-600 text-xs mb-3">
          No se pueden registrar pagos en una cuenta anulada.
        </p>
      )}
      {!isDisabled && (
        <p className="text-gray-600 text-xs mb-3">
          Saldo pendiente: <strong>{fmtMoneyARS(balance)}</strong>
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-3 max-w-md">
        <div>
          <label
            htmlFor="pay-amount"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Monto (ARS) *
          </label>
          <input
            id="pay-amount"
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
          <label
            htmlFor="pay-date"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Fecha del pago
          </label>
          <input
            id="pay-date"
            type="date"
            value={paidAt}
            onChange={(e) => setPaidAt(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="pay-reference"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Referencia (opcional)
          </label>
          <input
            id="pay-reference"
            type="text"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Transferencia, cheque, etc."
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="pay-notes"
            className="block text-xs font-medium text-gray-700 mb-1"
          >
            Notas (opcional)
          </label>
          <input
            id="pay-notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isDisabled}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {error && <p className="text-red-600 text-xs">{error}</p>}
        {success && <p className="text-green-700 text-xs">{success}</p>}
        <button
          type="submit"
          disabled={isDisabled}
          className="rounded-md bg-ifedel-green px-4 py-2 text-sm font-medium text-white hover:bg-ifedel-green/90 disabled:opacity-50"
        >
          {pending ? 'Registrando…' : 'Registrar pago'}
        </button>
      </form>
    </section>
  )
}

