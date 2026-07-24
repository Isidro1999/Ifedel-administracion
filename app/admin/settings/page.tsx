'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

interface ExchangeRateResponse {
  usdArsRate: number | null
  updatedAt: string | null
}

export default function AdminSettingsPage() {
  const [usdArsRate, setUsdArsRate] = useState<string>('')
  const [savedRate, setSavedRate] = useState<ExchangeRateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [successMessage, setSuccessMessage] = useState<string>('')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const loadRate = async () => {
      try {
        const res = await fetch('/api/settings/exchange-rate')
        if (!res.ok) return
        const data: ExchangeRateResponse = await res.json()
        setSavedRate(data)
        if (data.usdArsRate != null) {
          setUsdArsRate(String(data.usdArsRate))
        }
      } catch (error) {
        console.error('Error fetching exchange rate:', error)
      } finally {
        setInitialLoading(false)
      }
    }

    loadRate()
  }, [])

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

      const data: ExchangeRateResponse = await res.json()
      setSavedRate(data)
      setSuccessMessage('Tipo de cambio actualizado correctamente')
      setErrorMessage('')
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al actualizar tipo de cambio')
      setSuccessMessage('')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Sin definir'
    const d = new Date(iso)
    return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`
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
        {initialLoading ? (
          <div className="text-sm text-gray-600">Cargando settings...</div>
        ) : (
          <>
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
                {savedRate?.usdArsRate != null
                  ? `${savedRate.usdArsRate} ARS por 1 USD`
                  : '—'}
              </div>
              <div>
                <span className="font-medium">Última actualización: </span>
                {formatDate(savedRate?.updatedAt ?? null)}
              </div>
            </div>

            {successMessage && (
              <div className="mt-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {successMessage}
              </div>
            )}
            {errorMessage && (
              <div className="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {errorMessage}
              </div>
            )}
          </>
        )}
      </SectionCard>
    </div>
  )
}


