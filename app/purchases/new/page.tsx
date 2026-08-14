'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

type Item = {
  sku: string
  title: string
  unitCost: string
  taxRate: string
  qty: string
}

export default function NewPurchasePage() {
  const router = useRouter()
  const [supplierName, setSupplierName] = useState('')
  const [supplierCompany, setSupplierCompany] = useState('')
  const [supplierEmail, setSupplierEmail] = useState('')
  const [supplierPhone, setSupplierPhone] = useState('')

  const [currency, setCurrency] = useState<'USD' | 'ARS'>('USD')
  const [exchangeRateARS, setExchangeRateARS] = useState('')
  const [exchangeRateHint, setExchangeRateHint] = useState<string | null>(null)
  const [discountPct, setDiscountPct] = useState('0')
  const [issuedAt, setIssuedAt] = useState(
    new Date().toISOString().slice(0, 10)
  )
  const [notes, setNotes] = useState('')

  const [items, setItems] = useState<Item[]>([
    { sku: '', title: '', unitCost: '', taxRate: '21', qty: '1' },
  ])

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadExchangeRate = async () => {
      try {
        const res = await fetch('/api/settings/exchange-rate')
        if (!res.ok) {
          if (!cancelled) {
            setExchangeRateHint(
              'No se pudo cargar el TC global. Configuralo en Configuración o ingresalo manualmente.',
            )
          }
          return
        }
        const data = (await res.json()) as { usdArsRate: number | null }
        if (
          !cancelled &&
          typeof data.usdArsRate === 'number' &&
          Number.isFinite(data.usdArsRate) &&
          data.usdArsRate > 0
        ) {
          setExchangeRateARS(String(data.usdArsRate))
          setExchangeRateHint('Precargado desde el tipo de cambio global.')
        } else if (!cancelled) {
          setExchangeRateHint(
            'No hay un tipo de cambio USD/ARS configurado. Actualizalo en Configuración antes de crear la compra.',
          )
        }
      } catch (err) {
        console.error('Error cargando tipo de cambio vigente', err)
        if (!cancelled) {
          setExchangeRateHint(
            'No se pudo cargar el TC global. Configuralo en Configuración o ingresalo manualmente.',
          )
        }
      }
    }
    loadExchangeRate()
    return () => {
      cancelled = true
    }
  }, [])

  function updateItem(index: number, patch: Partial<Item>) {
    setItems((prev) =>
      prev.map((it, i) => (i === index ? { ...it, ...patch } : it))
    )
  }

  function addItem() {
    setItems((prev) => [
      ...prev,
      { sku: '', title: '', unitCost: '', taxRate: '21', qty: '1' },
    ])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMessage(null)

    const preparedItems = items
      .map((it) => ({
        sku: it.sku.trim(),
        title: it.title.trim(),
        unitCost: Number(it.unitCost.replace(',', '.')),
        taxRate: Number(it.taxRate.replace(',', '.')) || 0,
        qty: Number(it.qty) || 0,
      }))
      .filter((it) => it.sku && it.title && it.qty > 0)

    if (preparedItems.length === 0) {
      setError('Agregá al menos un ítem válido.')
      return
    }

    const rate = Number(exchangeRateARS.replace(',', '.')) || 0
    const discount = Number(discountPct.replace(',', '.')) || 0

    setSaving(true)
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: preparedItems,
          supplier: {
            name: supplierName,
            company: supplierCompany,
            email: supplierEmail,
            phone: supplierPhone,
          },
          meta: {
            currency,
            exchangeRateARS: rate > 0 ? rate : undefined,
            discountPct: discount,
            issuedAt,
          },
          notes,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(
          data?.error ||
            'Ocurrió un error al registrar la compra. Revisá los datos.'
        )
        return
      }

      if (data?.success && data?.purchaseNumber) {
        setMessage(`Compra registrada como ${data.purchaseNumber}.`)
      } else {
        setMessage('Compra registrada correctamente.')
      }

      setSupplierName('')
      setSupplierCompany('')
      setSupplierEmail('')
      setSupplierPhone('')
      setCurrency('USD')
      setDiscountPct('0')
      setIssuedAt(new Date().toISOString().slice(0, 10))
      setNotes('')
      setItems([{ sku: '', title: '', unitCost: '', taxRate: '21', qty: '1' }])
      router.push('/purchases')
    } catch (err) {
      console.error('Error al llamar a /api/purchases', err)
      setError('No se pudo comunicar con el servidor para registrar la compra.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="mx-auto max-w-4xl rounded-lg border-2 border-ifedel-primary/20 bg-white p-6 shadow-md">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-ifedel-black">
              Nueva compra
            </h1>
            <p className="text-sm text-gray-600">
              Registrar una compra a proveedor y su cuenta por pagar asociada.
            </p>
          </div>
          <Link
            href="/purchases"
            className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
          >
            Ver compras
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-lg border border-gray-200 p-4">
            <h2 className="mb-3 text-base font-semibold text-ifedel-black">
              Proveedor
            </h2>
            <div className="grid gap-3 md:grid-cols-2 text-sm">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Nombre / Contacto
                </label>
                <input
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej: Juan Pérez"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Empresa
                </label>
                <input
                  value={supplierCompany}
                  onChange={(e) => setSupplierCompany(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej: Proveedor SRL"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="contacto@proveedor.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Teléfono
                </label>
                <input
                  value={supplierPhone}
                  onChange={(e) => setSupplierPhone(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  placeholder="+54 9 ..."
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4 text-sm">
            <h2 className="mb-3 text-base font-semibold text-ifedel-black">
              Datos de la compra
            </h2>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Fecha
                </label>
                <input
                  type="date"
                  value={issuedAt}
                  onChange={(e) => setIssuedAt(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Moneda
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as 'USD' | 'ARS')}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="USD">USD</option>
                  <option value="ARS">ARS</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Tipo de cambio USD/ARS
                </label>
                <input
                  type="text"
                  value={exchangeRateARS}
                  onChange={(e) => {
                    setExchangeRateARS(e.target.value)
                    setExchangeRateHint(null)
                  }}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-right"
                  placeholder="Desde Configuración"
                />
                {exchangeRateHint && (
                  <p className="mt-1 text-[11px] text-gray-500">
                    {exchangeRateHint}
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">
                  Descuento (%)
                </label>
                <input
                  type="number"
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm text-right"
                />
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4 text-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold text-ifedel-black">
                Ítems de la compra
              </h2>
              <button
                type="button"
                onClick={addItem}
                className="rounded-md border border-ifedel-primary px-3 py-1 text-xs font-medium text-ifedel-primary hover:bg-ifedel-primary/5"
              >
                Agregar ítem
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div
                  key={index}
                  className="grid gap-2 rounded border border-gray-200 p-3 md:grid-cols-6"
                >
                  <div className="md:col-span-1">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      SKU
                    </label>
                    <input
                      value={item.sku}
                      onChange={(e) =>
                        updateItem(index, { sku: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Descripción
                    </label>
                    <input
                      value={item.title}
                      onChange={(e) =>
                        updateItem(index, { title: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Costo unitario
                    </label>
                    <input
                      value={item.unitCost}
                      onChange={(e) =>
                        updateItem(index, { unitCost: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      IVA %
                    </label>
                    <input
                      value={item.taxRate}
                      onChange={(e) =>
                        updateItem(index, { taxRate: e.target.value })
                      }
                      className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-right"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Cantidad
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        value={item.qty}
                        onChange={(e) =>
                          updateItem(index, { qty: e.target.value })
                        }
                        className="w-full rounded border border-gray-300 px-2 py-1 text-xs text-right"
                      />
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-xs text-red-600"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-lg border border-gray-200 p-4 text-sm">
            <label className="mb-1 block text-xs font-medium text-gray-600">
              Notas (opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded border border-gray-300 px-3 py-2 text-sm"
            />
          </section>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-emerald-700">{message}</p>}

          <div className="flex justify-end gap-2">
            <Link
              href="/purchases"
              className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-ifedel-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            >
              {saving ? 'Guardando…' : 'Guardar compra'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
