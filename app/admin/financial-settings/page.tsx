'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { PageHeader } from '@/components/layout/PageHeader'
import { SectionCard } from '@/components/layout/SectionCard'

type FinancialSettingsPayload = {
  ingresosBrutosRate: number
  bankCreditRate: number
  bankDebitRate: number
  fixedMonthlyOverheadARS: number
}

export default function AdminFinancialSettingsPage() {
  const [settings, setSettings] = useState<FinancialSettingsPayload | null>(null)
  const [form, setForm] = useState<FinancialSettingsPayload>({
    ingresosBrutosRate: 0,
    bankCreditRate: 0,
    bankDebitRate: 0,
    fixedMonthlyOverheadARS: 0,
  })
  const [initialLoading, setInitialLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/admin/financial-settings', {
          credentials: 'include',
        })
        if (!res.ok) {
          throw new Error('No se pudieron cargar los parámetros financieros')
        }
        const data: FinancialSettingsPayload = await res.json()
        setSettings(data)
        setForm(data)
      } catch (error) {
        console.error(error)
        setErrorMessage(
          'No se pudieron cargar los parámetros financieros. Verificá la API o intentá más tarde.'
        )
      } finally {
        setInitialLoading(false)
      }
    }

    load()
  }, [])

  const handleChangeNumber = (field: keyof FinancialSettingsPayload, value: string) => {
    const n = parseFloat(value)
    setForm((prev) => ({
      ...prev,
      [field]: !isFinite(n) ? 0 : n,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setErrorMessage('')

    setLoading(true)
    try {
      const res = await fetch('/api/admin/financial-settings', {
        method: 'PUT',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const error = await res.json().catch(() => ({}))
        throw new Error(error.error || 'Error al guardar parámetros financieros')
      }

      const data: FinancialSettingsPayload = await res.json()
      setSettings(data)
      setForm(data)
      setSuccessMessage('Parámetros financieros guardados correctamente')
    } catch (error: any) {
      setErrorMessage(error.message || 'Error al guardar parámetros financieros')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parámetros financieros"
        description="Tasas de IIBB, costos bancarios y gastos fijos que usa analytics para estimar márgenes y resultado operativo."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/"
              className="text-sm font-medium text-ifedel-primary hover:underline"
            >
              Volver al inicio
            </Link>
            <Link
              href="/admin/settings"
              className="text-sm font-medium text-gray-700 hover:underline"
            >
              Ver settings generales
            </Link>
          </div>
        }
      />

      <SectionCard
        title="Configuración de tasas y gastos fijos"
        description="Estos valores impactan en los cálculos de /analytics/sales, /analytics/products y /analytics/period."
      >
        {initialLoading ? (
          <div className="text-sm text-gray-600">
            Cargando parámetros financieros...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tasa de Ingresos Brutos
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.ingresosBrutosRate}
                  onChange={(e) =>
                    handleChangeNumber('ingresosBrutosRate', e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ej: 0.03 para 3%"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se aplica sobre los ingresos brutos del período para estimar IIBB.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tasa bancaria sobre créditos
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.bankCreditRate}
                  onChange={(e) =>
                    handleChangeNumber('bankCreditRate', e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ej: 0.006 para 0.6%"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Estimación de impuesto/costo bancario sobre ingresos en cuenta.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Tasa bancaria sobre débitos
                </label>
                <input
                  type="number"
                  step="0.0001"
                  min="0"
                  value={form.bankDebitRate}
                  onChange={(e) =>
                    handleChangeNumber('bankDebitRate', e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ej: 0.006 para 0.6%"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Estimación de impuesto/costo bancario sobre egresos en cuenta.
                </p>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">
                  Gastos fijos mensuales (ARS)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.fixedMonthlyOverheadARS}
                  onChange={(e) =>
                    handleChangeNumber('fixedMonthlyOverheadARS', e.target.value)
                  }
                  className="w-full rounded-md border px-3 py-2"
                  placeholder="Ej: 1500000"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Se prorratea en analytics del período según los días transcurridos del mes.
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
            >
              {loading ? 'Guardando...' : 'Guardar parámetros'}
            </button>

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
            {settings && (
              <p className="mt-4 text-xs text-gray-500">
                Valores actuales: IIBB {settings.ingresosBrutosRate} · Banco créditos{' '}
                {settings.bankCreditRate} · Banco débitos {settings.bankDebitRate} · Gastos fijos{' '}
                {settings.fixedMonthlyOverheadARS} ARS.
              </p>
            )}
          </form>
        )}
      </SectionCard>
    </div>
  )
}


