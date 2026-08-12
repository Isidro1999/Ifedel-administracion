'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuoteStore } from '@/lib/quote-store'
import { IFEDelBrand } from '@/lib/ifedel-brand'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'

const DownloadQuotePdfButton = dynamic(
  () =>
    import('@/components/quote/DownloadQuotePdfButton').then(
      (m) => m.DownloadQuotePdfButton,
    ),
  {
    ssr: false,
    loading: () => (
      <button
        type="button"
        disabled
        className="px-4 py-2 bg-ifedel-primary text-white rounded-md opacity-60 text-sm font-medium cursor-wait"
      >
        Generar PDF
      </button>
    ),
  },
)

export default function NewQuotePage() {
  const {
    items,
    client,
    meta,
    clear,
    setClientField,
    setExchangeRateARS,
    setValidityDays,
    setDiscountPct,
  } = useQuoteStore()
  const router = useRouter()

  const {
    subtotalUSD,
    totalUSD,
    discountPct,
    discountAmountUSD,
    totalUSDWithDiscount,
    totalARS,
  } = useMemo(() => {
    const subtotal = items.reduce(
      (acc, item) => acc + item.unitPriceUSD * item.qty,
      0
    )
    const total = items.reduce(
      (acc, item) =>
        acc + item.unitPriceUSD * item.qty * (1 + item.taxRate / 100),
      0
    )
    const exchangeRate =
      meta.exchangeRateARS > 0 ? meta.exchangeRateARS : 0
    const pct = meta.discountPct ?? 0
    const discountAmount = total * (pct / 100)
    const totalWithDiscount = total - discountAmount
    const totalArsFinal =
      exchangeRate > 0 ? totalWithDiscount * exchangeRate : 0

    return {
      subtotalUSD: subtotal,
      totalUSD: total,
      discountPct: pct,
      discountAmountUSD: discountAmount,
      totalUSDWithDiscount: totalWithDiscount,
      totalARS: totalArsFinal,
    }
  }, [items, meta.exchangeRateARS, meta.discountPct])

  const formatMoney = (value: number, currency: string = 'USD') =>
    `${currency} ${value.toFixed(2)}`

  const today = new Date()
  const dateLabel = today.toISOString().slice(0, 10)

  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [paymentTerms, setPaymentTerms] = useState<
    { id: number; code: string; label: string }[]
  >([])
  const [paymentTermsError, setPaymentTermsError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const loadExchangeRate = async () => {
      try {
        const res = await fetch('/api/settings/exchange-rate')
        if (!res.ok) return
        const data = (await res.json()) as {
          usdArsRate: number | null
        }
        if (
          !cancelled &&
          typeof data.usdArsRate === 'number' &&
          Number.isFinite(data.usdArsRate) &&
          data.usdArsRate > 0
        ) {
          setExchangeRateARS(data.usdArsRate)
        }
      } catch (err) {
        console.error('Error cargando tipo de cambio vigente', err)
      }
    }
    loadExchangeRate()
    return () => {
      cancelled = true
    }
  }, [setExchangeRateARS])

  useEffect(() => {
    let cancelled = false
    const loadTerms = async () => {
      try {
        const res = await fetch('/api/payment-terms')
        if (!res.ok) {
          throw new Error('No se pudieron cargar las condiciones de pago')
        }
        const data = (await res.json()) as {
          terms: { id: number; code: string; label: string }[]
        }
        if (!cancelled) {
          setPaymentTerms(data.terms)
          if (!meta.paymentTermCode && data.terms.length > 0) {
            // default to first / default term
            // we'll rely on store default for now
          }
        }
      } catch (err) {
        console.error('Error cargando payment terms', err)
        if (!cancelled) {
          setPaymentTermsError(
            'No se pudieron cargar las condiciones de pago. Se usará CONTADO por defecto.'
          )
        }
      }
    }
    loadTerms()
    return () => {
      cancelled = true
    }
  }, [meta.paymentTermCode])

  const handleSaveQuote = async () => {
    if (items.length === 0) return
    setIsSaving(true)
    setSaveMessage(null)
    setSaveError(null)

    try {
      const response = await fetch('/api/quotes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items,
          client,
          meta,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          setSaveError(
            'Tenés que iniciar sesión para guardar la cotización.'
          )
        } else if (response.status === 400) {
          setSaveError(
            data?.error ||
              'El contenido de la cotización no es válido. Revisá los campos.'
          )
        } else {
          setSaveError(
            data?.error || 'Ocurrió un error al guardar la cotización.'
          )
        }
        return
      }

      if (data?.success && data?.quoteNumber) {
        setSaveMessage(`Cotización guardada como ${data.quoteNumber}.`)
      } else {
        setSaveMessage('Cotización guardada correctamente.')
      }

      clear()
      router.push('/quotes')
    } catch (err) {
      console.error('Error al llamar a /api/quotes', err)
      setSaveError('No se pudo comunicar con el servidor para guardar.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCopyWhatsApp = async () => {
    if (items.length === 0) return
    const lines: string[] = []
    lines.push(`Cotización ${IFEDelBrand.companyName} - ${dateLabel}`)
    lines.push('')
    items.forEach((item) => {
      const itemSubtotal = item.unitPriceUSD * item.qty
      lines.push(
        `- ${item.qty}x ${item.title} (${item.sku}) - USD ${item.unitPriceUSD.toFixed(
          2
        )} = USD ${itemSubtotal.toFixed(2)}`
      )
    })
    lines.push('')
    lines.push(`Subtotal USD (sin IVA): ${subtotalUSD.toFixed(2)}`)
    lines.push(`Total USD (con IVA): ${totalUSD.toFixed(2)}`)
    if ((discountPct ?? 0) > 0) {
      lines.push(
        `Descuento (${(discountPct ?? 0).toFixed(1)}%): -${discountAmountUSD.toFixed(
          2
        )}`
      )
      lines.push(
        `Total USD final: ${totalUSDWithDiscount.toFixed(2)}`
      )
    }
    lines.push(
      meta.exchangeRateARS > 0
        ? `TC: ARS ${meta.exchangeRateARS.toFixed(2)} por USD 1`
        : 'TC: (sin tipo de cambio vigente)'
    )
    lines.push(`Total ARS (con IVA): ${totalARS.toFixed(2)}`)

    const text = lines.join('\n')

    try {
      await navigator.clipboard.writeText(text)
      alert('Resumen copiado al portapapeles. Pegalo en WhatsApp.')
    } catch {
      alert('No se pudo copiar al portapapeles.')
    }
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen p-8">
        <div className="max-w-3xl mx-auto text-center py-16">
          <h1 className="text-2xl font-bold mb-4">Cotización vacía</h1>
          <p className="text-gray-600 mb-6">
            Todavía no agregaste productos a la cotización.
          </p>
          <Link
            href="/products"
            className="px-4 py-2 bg-ifedel-primary text-white rounded-md hover:opacity-90 font-medium"
          >
            Ir al catálogo
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-[900px] mx-auto bg-white shadow-md rounded-lg border-2 border-ifedel-primary/20 p-6 md:p-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Cotización - {IFEDelBrand.companyName}
            </h1>
            <p className="text-sm text-gray-600">{IFEDelBrand.address}</p>
            <p className="text-sm text-gray-600">
              {IFEDelBrand.phone} • {IFEDelBrand.email}
            </p>
            <p className="text-sm text-gray-600">{IFEDelBrand.website}</p>
          </div>
          <div className="text-sm text-gray-600">
            <p>Fecha: {dateLabel}</p>
            <div className="flex items-center gap-2 mt-1">
              <span>Validez:</span>
              <input
                type="number"
                min={1}
                value={meta.validityDays}
                onChange={(e) =>
                  setValidityDays(Number(e.target.value) || meta.validityDays)
                }
                className="w-16 px-2 py-1 border rounded text-sm"
              />
              <span>días</span>
            </div>
          </div>
        </div>

        {/* Cliente */}
        <section className="mb-6 border border-gray-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-3">Datos del cliente</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Nombre / Contacto
              </label>
              <input
                type="text"
                value={client.name ?? ''}
                onChange={(e) => setClientField('name', e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Empresa
              </label>
              <input
                type="text"
                value={client.company ?? ''}
                onChange={(e) => setClientField('company', e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Ej: Empresa SRL"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                value={client.email ?? ''}
                onChange={(e) => setClientField('email', e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Ej: contacto@empresa.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={client.phone ?? ''}
                onChange={(e) => setClientField('phone', e.target.value)}
                className="w-full px-3 py-2 border rounded text-sm"
                placeholder="Ej: +54 9 ..."
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Condición de pago
              </label>
              <select
                value={meta.paymentTermCode ?? 'CONTADO'}
                onChange={(e) =>
                  // usamos el store genérico para meta vía setDiscount / etc.
                  // como no tenemos setter específico, construimos un event artificial:
                  useQuoteStore.setState((state) => ({
                    meta: {
                      ...state.meta,
                      paymentTermCode: e.target.value,
                    },
                  }))
                }
                className="w-full px-3 py-2 border rounded text-sm"
              >
                {paymentTerms.length === 0 ? (
                  <>
                    <option value="CONTADO">CONTADO</option>
                    <option value="0-30">0-30</option>
                    <option value="0-30-60">0-30-60</option>
                  </>
                ) : (
                  paymentTerms.map((term) => (
                    <option key={term.id} value={term.code}>
                      {term.label} ({term.code})
                    </option>
                  ))
                )}
              </select>
              {paymentTermsError && (
                <p className="mt-1 text-xs text-amber-700">
                  {paymentTermsError}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* Items */}
        <section className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Productos</h2>
          <div className="space-y-4">
            {items.map((item) => {
              const itemSubtotal = item.unitPriceUSD * item.qty
              return (
                <div
                  key={item.productId}
                  className="flex flex-col md:flex-row gap-4 border border-gray-200 rounded-lg p-4 shadow-sm"
                >
                  <div className="w-full md:w-40 h-40 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={getOptimizedImageUrl(item.imageUrl, 400)}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-gray-400">Sin imagen</span>
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-semibold">
                            {item.title}
                          </h3>
                          <p className="text-xs text-gray-500">
                            SKU: {item.sku}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                        <div>
                          <span className="block text-xs text-gray-500">
                            Cantidad
                          </span>
                          <span className="font-medium">{item.qty}</span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500">
                            Unitario USD (sin IVA)
                          </span>
                          <span className="font-medium">
                            {item.unitPriceUSD.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500">
                            Total ítem USD (sin IVA)
                          </span>
                          <span className="font-medium">
                            {itemSubtotal.toFixed(2)}
                          </span>
                        </div>
                        <div>
                          <span className="block text-xs text-gray-500">
                            IVA %
                          </span>
                          <span className="font-medium">
                            {item.taxRate.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Resumen */}
        <section className="border border-gray-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-3">Resumen</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Subtotal USD (sin IVA)</span>
              <span className="font-medium">
                {formatMoney(subtotalUSD, 'USD')}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Total USD (con IVA)</span>
              <span className="font-medium">
                {formatMoney(totalUSD, 'USD')}
              </span>
            </div>
            {discountPct > 0 && (
              <>
                <div className="flex justify-between">
                  <span>
                    Descuento ({discountPct.toFixed(1)}%)
                  </span>
                  <span className="font-medium text-red-600">
                    -{formatMoney(discountAmountUSD, 'USD')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total USD final</span>
                  <span className="font-semibold">
                    {formatMoney(totalUSDWithDiscount, 'USD')}
                  </span>
                </div>
              </>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-2">
                <span>Tipo de cambio USD/ARS</span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={
                      meta.exchangeRateARS > 0
                        ? meta.exchangeRateARS.toString()
                        : ''
                    }
                    readOnly
                    className="w-28 px-2 py-1 border rounded text-sm text-right bg-gray-50 text-gray-800"
                    aria-label="Tipo de cambio vigente (solo lectura en creación)"
                  />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                Valor vigente al armar la cotización (solo referencia). Al
                guardar se toma el tipo de cambio del servidor y después podés
                modificarlo en la cotización guardada.
              </p>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Descuento (%)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  value={(meta.discountPct ?? 0).toString()}
                  onChange={(e) => {
                    const raw = e.target.value.replace(',', '.')
                    const num = Number(raw)
                    if (!Number.isNaN(num)) {
                      setDiscountPct(num)
                    }
                  }}
                  className="w-20 px-2 py-1 border rounded text-sm text-right"
                />
              </div>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
              <span>Total ARS (con IVA)</span>
              <span className="font-semibold">
                {formatMoney(totalARS, 'ARS')}
              </span>
            </div>
          </div>
        </section>

        {/* Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleSaveQuote}
              disabled={isSaving}
              className="px-4 py-2 bg-ifedel-primary text-white rounded-md hover:opacity-90 text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando…' : 'Guardar cotización'}
            </button>
            <DownloadQuotePdfButton
              items={items}
              client={client}
              meta={meta}
              dateLabel={dateLabel}
              subtotalUSD={subtotalUSD}
              totalUSD={totalUSD}
              totalARS={totalARS}
            />
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-4 py-2 bg-ifedel-primary text-white rounded-md hover:opacity-90 text-sm font-medium"
            >
              Copiar resumen para WhatsApp
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                if (confirm('¿Limpiar la cotización actual?')) {
                  clear()
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              Limpiar cotización
            </button>
            <Link
              href="/products"
              className="px-4 py-2 bg-ifedel-primary text-white rounded-md hover:opacity-90 text-sm font-medium"
            >
              Volver al catálogo
            </Link>
          </div>
          {(saveMessage || saveError) && (
            <div className="w-full text-sm">
              {saveMessage && (
                <p className="text-emerald-700">{saveMessage}</p>
              )}
              {saveError && (
                <p className="text-red-600">{saveError}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

