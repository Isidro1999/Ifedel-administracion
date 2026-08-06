'use client'

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  COMMERCIAL_INQUIRY_STATUSES,
  COMMERCIAL_INQUIRY_STATUS_LABELS,
  type CommercialInquiryStatus,
} from '@/lib/catalog-inquiry-schemas'

type InquiryStatusFormProps = {
  inquiryId: number
  currentStatus: string
}

export function InquiryStatusForm({
  inquiryId,
  currentStatus,
}: InquiryStatusFormProps) {
  const router = useRouter()
  const [status, setStatus] = useState(currentStatus)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const lock = useRef(false)

  useEffect(() => {
    setStatus(currentStatus)
  }, [currentStatus])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (lock.current || saving) return
    setError(null)
    setSuccess(null)

    if (status === currentStatus) {
      setSuccess('El estado ya está actualizado.')
      return
    }

    lock.current = true
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/catalog/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = (await res.json().catch(() => null)) as {
        error?: string
        success?: boolean
      } | null

      if (!res.ok || !data?.success) {
        setError(data?.error || 'No se pudo guardar el estado.')
        return
      }

      setSuccess('Estado actualizado.')
      router.refresh()
    } catch {
      setError('Error de conexión. Intentá de nuevo.')
    } finally {
      setSaving(false)
      lock.current = false
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
    >
      <h2 className="text-sm font-semibold text-slate-900">Cambiar estado</h2>
      <p className="text-xs text-slate-500">
        En esta etapa se puede pasar de cualquier estado a otro. Más adelante se
        podrán restringir las transiciones.
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Estado
        </span>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={saving}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-ifedel-primary focus:outline-none focus:ring-1 focus:ring-ifedel-primary disabled:opacity-60"
        >
          {COMMERCIAL_INQUIRY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {COMMERCIAL_INQUIRY_STATUS_LABELS[s as CommercialInquiryStatus]}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-ifedel-primary px-4 py-2 text-sm font-semibold text-black shadow-sm hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? 'Guardando…' : 'Guardar estado'}
      </button>
      {success ? (
        <p className="text-sm text-emerald-700" role="status">
          {success}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  )
}
