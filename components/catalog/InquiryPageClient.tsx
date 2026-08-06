'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import { CheckCircle2, Trash2 } from 'lucide-react'
import {
  CLIENT_TYPES,
  useCatalogInquiryStore,
} from '@/lib/catalog-inquiry-store'
import {
  buildCatalogInquiryMessage,
  buildWhatsAppUrl,
  getIfedelWhatsAppNumber,
} from '@/lib/catalog-whatsapp'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { EmptyCatalogState } from '@/components/catalog/EmptyCatalogState'
import { useCatalogPath } from '@/components/catalog/CatalogPathProvider'

type SubmitSuccess = {
  referenceNumber: string
}

export function InquiryPageClient() {
  const { path } = useCatalogPath()
  const items = useCatalogInquiryStore((s) => s.items)
  const contact = useCatalogInquiryStore((s) => s.contact)
  const setQuantity = useCatalogInquiryStore((s) => s.setQuantity)
  const setItemComment = useCatalogInquiryStore((s) => s.setItemComment)
  const removeItem = useCatalogInquiryStore((s) => s.removeItem)
  const clearItems = useCatalogInquiryStore((s) => s.clearItems)
  const clearAfterSuccessfulSubmit = useCatalogInquiryStore(
    (s) => s.clearAfterSuccessfulSubmit,
  )
  const setContactField = useCatalogInquiryStore((s) => s.setContactField)

  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<SubmitSuccess | null>(null)
  const submitLock = useRef(false)
  const honeypotRef = useRef<HTMLInputElement>(null)

  const whatsappConfigured = useMemo(
    () => Boolean(getIfedelWhatsAppNumber()),
    [],
  )

  function handleSendWhatsApp() {
    setError(null)

    if (items.length === 0) {
      setError('Agregá al menos un producto a la consulta.')
      return
    }

    const name = contact.name.trim()
    if (!name) {
      setError('Completá tu nombre antes de enviar la consulta.')
      return
    }

    if (!whatsappConfigured) {
      setError(
        'WhatsApp no está configurado todavía. Usá “Solicitar contacto” o escribinos a info@ifedel.com.ar.',
      )
      return
    }

    const message = buildCatalogInquiryMessage({ items, contact })
    const url = buildWhatsAppUrl(message)
    if (!url) {
      setError('No se pudo armar el enlace de WhatsApp.')
      return
    }

    window.open(url, '_blank', 'noopener,noreferrer')
  }

  async function handleSolicitarContacto() {
    if (submitLock.current || submitting) return
    setError(null)

    if (items.length === 0) {
      setError('Agregá al menos un producto a la consulta.')
      return
    }

    const name = contact.name.trim()
    const phone = contact.phone.trim()
    if (!name) {
      setError('Completá tu nombre y apellido.')
      return
    }
    if (!phone) {
      setError('Completá tu teléfono para que podamos contactarte.')
      return
    }

    submitLock.current = true
    setSubmitting(true)

    try {
      const res = await fetch('/api/catalog/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: name,
          companyName: contact.company.trim() || null,
          phone,
          email: contact.email.trim() || null,
          location: contact.locality.trim() || null,
          clientType: contact.clientType || null,
          message: contact.generalComment.trim() || null,
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            comment: item.comment.trim() || null,
          })),
          website: honeypotRef.current?.value ?? '', // honeypot
        }),
      })

      const data = (await res.json().catch(() => null)) as {
        success?: boolean
        inquiry?: { referenceNumber?: string }
        error?: string
      } | null

      if (!res.ok || !data?.success || !data.inquiry?.referenceNumber) {
        setError(
          data?.error ||
            'No pudimos registrar tu consulta. Revisá los datos e intentá de nuevo.',
        )
        return
      }

      clearAfterSuccessfulSubmit()
      setSuccess({ referenceNumber: data.inquiry.referenceNumber })
    } catch {
      setError(
        'Hubo un problema de conexión. Tus datos se conservaron; intentá de nuevo.',
      )
    } finally {
      setSubmitting(false)
      submitLock.current = false
    }
  }

  if (success) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-ifedel-primary/30 bg-white px-6 py-10 text-center shadow-sm sm:px-10">
          <CheckCircle2
            className="mx-auto h-12 w-12 text-ifedel-primary"
            aria-hidden
          />
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
            ¡Consulta recibida!
          </h1>
          <p className="mt-3 text-sm text-slate-600 sm:text-base">
            Un representante de IFEDEL se pondrá en contacto con vos a la
            brevedad.
          </p>
          <p className="mt-6 text-sm font-medium text-slate-800">
            Número de consulta:{' '}
            <span className="font-bold tracking-wide text-ifedel-brown">
              {success.referenceNumber}
            </span>
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={path('productos')}
              className="inline-flex rounded-full bg-ifedel-primary px-5 py-3 text-sm font-semibold text-black"
            >
              Seguir explorando
            </Link>
            <Link
              href={path()}
              className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
            >
              Volver al inicio
            </Link>
          </div>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Lista de consulta
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Agregá productos desde el catálogo y envianos tu consulta por
            WhatsApp o solicitá contacto directo con IFEDEL.
          </p>
        </div>
        <EmptyCatalogState
          title="Tu lista está vacía"
          description="Explorá el catálogo y usá “Agregar a consulta” en los productos que te interesen."
        />
        <div className="text-center">
          <Link
            href={path('productos')}
            className="inline-flex rounded-full bg-ifedel-primary px-5 py-3 text-sm font-semibold text-black"
          >
            Ver productos
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Lista de consulta
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {items.length} producto{items.length === 1 ? '' : 's'} seleccionado
            {items.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm('¿Vaciar toda la lista de consulta?')) {
              clearItems()
            }
          }}
          className="text-sm font-medium text-red-700 hover:underline"
        >
          Vaciar lista
        </button>
      </div>

      <ul className="space-y-4">
        {items.map((item) => {
          const img = item.primaryImage
            ? getOptimizedImageUrl(item.primaryImage, 160)
            : null
          return (
            <li
              key={item.productId}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div className="flex gap-3">
                <Link
                  href={path(`productos/${item.slug}`)}
                  className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100"
                >
                  {img ? (
                    <Image
                      src={img}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  ) : null}
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    href={path(`productos/${item.slug}`)}
                    className="font-semibold text-slate-900 hover:text-ifedel-brown"
                  >
                    {item.title}
                  </Link>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <span className="text-slate-600">Cantidad</span>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const n = Number.parseInt(e.target.value, 10)
                          if (Number.isFinite(n)) setQuantity(item.productId, n)
                        }}
                        className="w-20 rounded-lg border border-slate-200 px-2 py-1.5"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => removeItem(item.productId)}
                      className="inline-flex items-center gap-1 text-sm text-red-700 hover:underline"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Quitar
                    </button>
                  </div>
                </div>
              </div>
              <label className="mt-3 block text-sm">
                <span className="font-medium text-slate-700">
                  Comentario (opcional)
                </span>
                <textarea
                  value={item.comment}
                  onChange={(e) =>
                    setItemComment(item.productId, e.target.value)
                  }
                  rows={2}
                  placeholder="Medida, presentación, duda…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none ring-ifedel-primary/30 focus:ring-2"
                />
              </label>
            </li>
          )
        })}
      </ul>

      <section className="relative rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Tus datos</h2>
        <p className="mt-1 text-sm text-slate-600">
          Completá tus datos para enviarnos la consulta. Los productos de tu
          lista se adjuntan automáticamente.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">
              Nombre y apellido *
            </span>
            <input
              value={contact.name}
              onChange={(e) => setContactField('name', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Tu nombre completo"
              autoComplete="name"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Empresa</span>
            <input
              value={contact.company}
              onChange={(e) => setContactField('company', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Opcional"
              autoComplete="organization"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Teléfono *</span>
            <input
              value={contact.phone}
              onChange={(e) => setContactField('phone', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Con código de área"
              autoComplete="tel"
              inputMode="tel"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Email</span>
            <input
              type="email"
              value={contact.email}
              onChange={(e) => setContactField('email', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Opcional"
              autoComplete="email"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">
              Localidad o provincia
            </span>
            <input
              value={contact.locality}
              onChange={(e) => setContactField('locality', e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Ciudad / provincia"
              autoComplete="address-level2"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Tipo de cliente</span>
            <select
              value={contact.clientType}
              onChange={(e) =>
                setContactField(
                  'clientType',
                  e.target.value as typeof contact.clientType,
                )
              }
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
            >
              <option value="">Seleccionar…</option>
              {CLIENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Comentario</span>
            <textarea
              value={contact.generalComment}
              onChange={(e) =>
                setContactField('generalComment', e.target.value)
              }
              rows={3}
              className="rounded-xl border border-slate-200 px-3 py-2.5 outline-none ring-ifedel-primary/30 focus:ring-2"
              placeholder="Contexto de la consulta, urgencia, etc. (opcional)"
            />
          </label>

          {/* Honeypot: oculto a usuarios, visible a bots ingenuos */}
          <label
            className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden"
            aria-hidden
          >
            Sitio web
            <input
              ref={honeypotRef}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              defaultValue=""
            />
          </label>
        </div>
      </section>

      {error ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">
          ¿Cómo querés enviarla?
        </h2>
        <p className="text-sm text-slate-600">
          Podés escribirnos por WhatsApp o dejar tu consulta directamente en
          IFEDEL para que un representante te contacte.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={handleSolicitarContacto}
            disabled={submitting}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-ifedel-brown px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Enviando…' : 'Solicitar contacto'}
          </button>
          <button
            type="button"
            onClick={handleSendWhatsApp}
            disabled={submitting || !whatsappConfigured}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-[#25D366] px-6 py-3.5 text-sm font-semibold text-white transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Enviar por WhatsApp
          </button>
        </div>

        {!whatsappConfigured ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            WhatsApp aún no está configurado. Podés usar{' '}
            <strong>Solicitar contacto</strong> para enviarnos la consulta
            directamente.
          </p>
        ) : null}

        <div className="text-center sm:text-left">
          <Link
            href={path('productos')}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-800"
          >
            Seguir explorando
          </Link>
        </div>
      </section>
    </div>
  )
}
