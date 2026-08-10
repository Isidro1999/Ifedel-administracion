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
  lastSource: string | null
  lastProviderDate: string | null
  lastProviderTime: string | null
}

export type ExchangeRateHistoryRow = {
  id: number
  rate: number
  source: string
  previousRate: number | null
  createdAt: string
  providerDate: string | null
  providerTime: string | null
  createdBy: {
    name: string | null
    email: string | null
  } | null
}

type Props = {
  initial: ExchangeRateSettingsInitial
  history: ExchangeRateHistoryRow[]
}

type BnaSyncStatus =
  | 'updated'
  | 'unchanged'
  | 'stale_provider_data'
  | 'variation_blocked'
  | 'invalid_provider_data'
  | 'provider_unavailable'

function formatDateTime(iso: string | null) {
  if (!iso) return 'Sin definir'
  const d = new Date(iso)
  return `${d.toLocaleDateString('es-AR')} ${d.toLocaleTimeString('es-AR')}`
}

function formatProviderDate(isoDate: string | null) {
  if (!isoDate) return null
  // YYYY-MM-DD or full ISO
  const key = isoDate.slice(0, 10)
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`
}

function formatRate(value: number) {
  return `$${fmtNumberAR(value)}`
}

function userLabel(row: ExchangeRateHistoryRow) {
  if (!row.createdBy) return null
  return row.createdBy.email || row.createdBy.name || 'Usuario'
}

function messageForBnaStatus(status: BnaSyncStatus): {
  tone: 'ok' | 'info' | 'warn' | 'error'
  text: string
} {
  switch (status) {
    case 'updated':
      return {
        tone: 'ok',
        text: 'Cotización actualizada desde Banco Nación.',
      }
    case 'unchanged':
      return {
        tone: 'info',
        text: 'La cotización ya se encontraba actualizada.',
      }
    case 'stale_provider_data':
      return {
        tone: 'warn',
        text: 'Banco Nación todavía no publicó una cotización del día.',
      }
    case 'variation_blocked':
      return {
        tone: 'warn',
        text: 'La cotización fue bloqueada porque presenta una variación inusual respecto del valor vigente.',
      }
    case 'invalid_provider_data':
    case 'provider_unavailable':
    default:
      return {
        tone: 'error',
        text: 'No pudimos consultar Banco Nación. El tipo de cambio actual no fue modificado.',
      }
  }
}

export function ExchangeRateSettingsClient({ initial, history }: Props) {
  const router = useRouter()
  const [usdArsRate, setUsdArsRate] = useState(
    initial.usdArsRate != null ? String(initial.usdArsRate) : '',
  )
  const [savedRate, setSavedRate] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [bnaLoading, setBnaLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [infoMessage, setInfoMessage] = useState('')
  const [warnMessage, setWarnMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setSavedRate(initial)
    if (initial.usdArsRate != null) {
      setUsdArsRate(String(initial.usdArsRate))
    }
  }, [initial])

  const clearMessages = () => {
    setSuccessMessage('')
    setInfoMessage('')
    setWarnMessage('')
    setErrorMessage('')
  }

  const applyToneMessage = (tone: 'ok' | 'info' | 'warn' | 'error', text: string) => {
    clearMessages()
    if (tone === 'ok') setSuccessMessage(text)
    else if (tone === 'info') setInfoMessage(text)
    else if (tone === 'warn') setWarnMessage(text)
    else setErrorMessage(text)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = parseFloat(usdArsRate)
    if (!isFinite(value) || value <= 0) {
      applyToneMessage('error', 'Ingresá un tipo de cambio válido (número positivo)')
      return
    }

    setLoading(true)
    clearMessages()
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

      setSavedRate((prev) => ({
        ...prev,
        usdArsRate: data.usdArsRate,
        updatedAt: data.updatedAt,
        lastSource: data.changed === false ? prev.lastSource : 'MANUAL',
        lastProviderDate: data.changed === false ? prev.lastProviderDate : null,
        lastProviderTime: data.changed === false ? prev.lastProviderTime : null,
      }))
      setUsdArsRate(String(data.usdArsRate))
      applyToneMessage(
        data.changed === false ? 'info' : 'ok',
        data.changed === false
          ? 'El tipo de cambio ya tenía ese valor; no se registró un nuevo evento'
          : 'Tipo de cambio actualizado correctamente',
      )
      router.refresh()
    } catch (error: unknown) {
      applyToneMessage(
        'error',
        error instanceof Error
          ? error.message
          : 'Error al actualizar tipo de cambio',
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSyncBna = async () => {
    setBnaLoading(true)
    clearMessages()
    try {
      const res = await fetch('/api/admin/settings/exchange-rate/sync-bna', {
        method: 'POST',
        credentials: 'include',
      })

      const data = (await res.json().catch(() => ({}))) as {
        status?: BnaSyncStatus
        rate?: number | null
        error?: string
      }

      if (!res.ok && !data.status) {
        throw new Error(data.error || 'Error al consultar Banco Nación')
      }

      const status = (data.status || 'provider_unavailable') as BnaSyncStatus
      const msg = messageForBnaStatus(status)
      applyToneMessage(msg.tone, msg.text)

      if (typeof data.rate === 'number') {
        setUsdArsRate(String(data.rate))
      }
      router.refresh()
    } catch (error: unknown) {
      applyToneMessage(
        'error',
        error instanceof Error
          ? error.message
          : 'No pudimos consultar Banco Nación. El tipo de cambio actual no fue modificado.',
      )
    } finally {
      setBnaLoading(false)
    }
  }

  const busy = loading || bnaLoading

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
        description="Fuente vigente global. Cotización comercial IFEDEL: Banco Nación → Billetes → Dólar U.S.A → Venta."
      >
        <div className="mb-4 space-y-1 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-gray-700">
          <div>
            <span className="font-medium">Vigente: </span>
            {savedRate.usdArsRate != null
              ? `${formatRate(savedRate.usdArsRate)} ARS por 1 USD`
              : '—'}
          </div>
          <div>
            <span className="font-medium">Última actualización: </span>
            {formatDateTime(savedRate.updatedAt)}
          </div>
          <div>
            <span className="font-medium">Origen del último evento: </span>
            {savedRate.lastSource
              ? exchangeRateSourceLabel(savedRate.lastSource)
              : '—'}
          </div>
          {savedRate.lastSource === 'BNA' &&
          (savedRate.lastProviderDate || savedRate.lastProviderTime) ? (
            <div className="text-gray-600">
              Publicado BNA:{' '}
              {[
                formatProviderDate(savedRate.lastProviderDate),
                savedRate.lastProviderTime,
              ]
                .filter(Boolean)
                .join(' · ') || '—'}
            </div>
          ) : null}
        </div>

        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleSyncBna}
            disabled={busy}
            className="rounded-md border border-ifedel-primary bg-white px-4 py-2 text-sm font-medium text-ifedel-brown hover:bg-ifedel-primary/10 disabled:opacity-50"
          >
            {bnaLoading
              ? 'Consultando Banco Nación...'
              : 'Actualizar desde Banco Nación'}
          </button>
          <p className="text-xs text-gray-500 sm:max-w-md">
            Consulta la web oficial del BNA (Billetes / USD / Venta). No modifica
            el valor si la fecha publicada es de un día anterior o si la
            variación supera el 20%.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">
              Tipo de cambio USD → ARS (manual)
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
            disabled={busy}
            className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Guardando...' : 'Guardar'}
          </button>
        </form>

        {successMessage ? (
          <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            {successMessage}
          </div>
        ) : null}
        {infoMessage ? (
          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            {infoMessage}
          </div>
        ) : null}
        {warnMessage ? (
          <div className="mt-4 rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            {warnMessage}
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
              const providerBits = [
                formatProviderDate(row.providerDate),
                row.providerTime,
              ].filter(Boolean)
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
                    {row.source === 'BNA' && providerBits.length > 0 ? (
                      <div className="text-gray-500">
                        Publicado BNA: {providerBits.join(' · ')}
                      </div>
                    ) : null}
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
