'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

interface ExchangeRateResponse {
  usdArsRate: number | null
  updatedAt: string | null
}

export default function AdminSettingsPage() {
  const [usdArsRate, setUsdArsRate] = useState<string>('')
  const [savedRate, setSavedRate] = useState<ExchangeRateResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [initialLoading, setInitialLoading] = useState(true)
  const [adminKey, setAdminKey] = useState('')
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
    if (!adminKey) {
      setErrorMessage('Debes ingresar la clave de administrador')
      setSuccessMessage('')
      return
    }
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
        headers: {
          'Content-Type': 'application/json',
          'x-admin-key': adminKey,
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
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <Link href="/" className="text-blue-600 hover:underline mb-4 inline-block">
            ← Volver al inicio
          </Link>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-gray-600">
            Configurá el tipo de cambio USD → ARS para mostrar precios aproximados en pesos.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          {initialLoading ? (
            <div className="text-gray-500">Cargando settings...</div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Clave de Administrador
                  </label>
                  <input
                    type="password"
                    value={adminKey}
                    onChange={(e) => setAdminKey(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Ingresa la clave de administrador"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo de cambio USD → ARS
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={usdArsRate}
                    onChange={(e) => setUsdArsRate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Ej: 1085.50"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Se usa para convertir precios en USD a un equivalente aproximado en ARS en el
                    catálogo.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !adminKey}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                {successMessage && (
                  <div className="mt-4 p-3 rounded bg-green-50 border border-green-200 text-sm text-green-800">
                    {successMessage}
                  </div>
                )}
                {errorMessage && (
                  <div className="mt-4 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-800">
                    {errorMessage}
                  </div>
                )}
              </form>

              <div className="mt-6 border-t pt-4 text-sm text-gray-600">
                <div>
                  <span className="font-medium">Último valor guardado: </span>
                  {savedRate?.usdArsRate != null ? `${savedRate.usdArsRate} ARS por 1 USD` : '—'}
                </div>
                <div>
                  <span className="font-medium">Última actualización: </span>
                  {formatDate(savedRate?.updatedAt ?? null)}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

