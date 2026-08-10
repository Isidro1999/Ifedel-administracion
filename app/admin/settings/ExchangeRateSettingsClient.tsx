'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'
import { exchangeRateSourceLabel } from '@/lib/exchange-rate/sources'
import { fmtNumberAR } from '@/lib/format-money'

export type ExchangeRateSettingsInitial = {
  usdArsRate: number | null
  updatedAt: string | null
}

export type ExchangeRateHistoryRow = {
  id: number
  rate: number
  source: string
  previousRate: number | null
  createdAt: string
  createdBy: {
    name: string | null
    email: string | null
  } | null
}

type Props = {
  initial: ExchangeRateSettingsInitial
  history: ExchangeRateHistoryRow[]
}

function formatDateTime(iso: string | null) {
  if (!iso) return 'Sin definir'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR')}`
}

function formatRate(value: number) {
  return `$${fmtNumberAR(value)}`
}

function userLabel(row: ExchangeRateHistoryRow) {
  if (!row.createdBy) return null
  return row.createdBy.email || row.createdBy.name || 'Usuario'
}

export function ExchangeRateSettingsClient({ initial, history }: Props) {
  const router = useRouter()
  const [usdArsRate, setUsdArsRate] = useState(
    initial.usdArsRate != null ? String(initial.usdArsRate) : '',
  )
  const [savedRate, setSavedRate] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setSavedRate(initial)
    if (initial.usdArsRate != null) {
      setUsdArsRate(String(initial.usdArsRate))
    }
  }, [initial])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(usdArsRate)
    if (!isFinite(value) || value <= 0) {
      setErrorMessage('Ingresá un tipo de cambio válido (número positivo)')
      setSuccessMessage('')
      return
    }

    setLoading(true)
    setErrorMessage('')
    setSuccessMessage('')
    try {
      const res = await fetch('/api/admin/settings/exchange-rate', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ usdArsRate: value }),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Error al actualizar tipo de cambio')
      }

      const data = (await res.json()) as {
        usdArsRate: number
        updatedAt: string | null
        changed?: boolean
      }

      setSavedRate({
        usdArsRate: data.usdArsRate,
        updatedAt: data.updatedAt,
      })
      setUsdArsRate(String(data.usdArsRate))
      setSuccessMessage(
        data.changed === false
          ? 'El tipo de cambio ya tenía ese valor; no se registró un nuevo evento'
          : 'Tipo de cambio actualizado correctamente',
      )
      setErrorMessage('')
      router.refresh()
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : 'Error al actualizar tipo de cambio'
      setErrorMessage(message)
      setSuccessMessage('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings generales"
        description="Configuración básica del sistema, incluyendo el tipo de cambio USD → ARS."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="text-sm font-medium text-ifedel-primary hover:underline"
            >
              Volver al inicio
            </Link>
            <Link
              href="/admin/financial-settings"
              className="text-sm font-medium text-gray-700 hover:underline"
            >
              Ir a parámetros financieros
            </Link>
          </div>
        }
      />

      <SectionCard
        title="Tipo de cambio USD → ARS"
        description="Se usa para convertir precios en USD a un equivalente aproximado en ARS dentro del catálogo."
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tipo de cambio USD → ARS
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={usdArsRate}
              onChange={(e) => setUsdArsRate(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Ej: 1085.50"
              required
            />
            <p className="mt-2 text-xs text-gray-500">
              El valor manual permanecerá vigente hasta la próxima actualización
              automática.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        <div className="mt-4 border-t pt-3 text-sm text-gray-600">
          <div>
            <span className="font-medium">Último valor guardado: </span>
            {savedRate.usdArsRate != null
              ? `${savedRate.usdArsRate} ARS por 1 USD`
              : '—'}
          </div>
          <div>
            <span className="font-medium">Última actualización: </span>
            {formatDateTime(savedRate.updatedAt)}
          </div>
        </div>

        {successMessage ? (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}
        {errorMessage ? (
          <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {errorMessage}
          </div>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Historial de tipo de cambio"
        description="Últimas actualizaciones del tipo de cambio global. Solo lectura."
      >
        {history.length === 0 ? (
          <p className="text-sm text-gray-600">
            Todavía no hay eventos de historial.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {history.map((row) => {
              const who = userLabel(row)
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
                >
                  <div className="min-w-0 space-y-0.5 text-sm">
                    <div className="font-medium text-gray-900">
                      {formatDateTime(row.createdAt)}
                    </div>
                    <div className="text-base font-semibold text-ifedel-brown">
                      {formatRate(row.rate)}
                    </div>
                    <div className="text-gray-600">
                      {exchangeRateSourceLabel(row.source)}
                    </div>
                    <div className="text-gray-500">
                      Anterior:{' '}
                      {row.previousRate != null
                        ? formatRate(row.previousRate)
                        : '—'}
                    </div>
                    {who ? (
                      <div className="text-gray-500">Usuario: {who}</div>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  )
}
