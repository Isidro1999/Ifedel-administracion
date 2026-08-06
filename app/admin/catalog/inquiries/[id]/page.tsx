import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Mail, MessageCircle, Phone } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { DataTableShell } from '@/components/ui/DataTableShell'
import { requireAdminPage } from '@/lib/admin-auth'
import {
  buildInquiryMailto,
  buildInquiryWhatsAppUrl,
  displayOptional,
  formatInquiryDateTime,
  getAdminCommercialInquiryById,
} from '@/lib/admin-catalog-inquiries'
import {
  COMMERCIAL_INQUIRY_SOURCE_LABELS,
  type CommercialInquirySource,
} from '@/lib/catalog-inquiry-schemas'
import { getOptimizedImageUrl } from '@/lib/cloudinary-url'
import { InquiryStatusForm } from '../InquiryStatusForm'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type PageProps = {
  params: { id: string }
}

function sourceLabel(source: string): string {
  return (
    COMMERCIAL_INQUIRY_SOURCE_LABELS[source as CommercialInquirySource] ??
    source
  )
}

export default async function AdminCatalogInquiryDetailPage({
  params,
}: PageProps) {
  await requireAdminPage()

  const id = Number.parseInt(params.id, 10)
  if (!Number.isFinite(id) || id <= 0) {
    notFound()
  }

  const inquiry = await getAdminCommercialInquiryById(id)
  if (!inquiry) {
    notFound()
  }

  const telHref = `tel:${inquiry.phone.replace(/\s+/g, '')}`
  const waHref = buildInquiryWhatsAppUrl({
    phone: inquiry.phone,
    customerName: inquiry.customerName,
    referenceNumber: inquiry.referenceNumber,
  })
  const mailHref = inquiry.email
    ? buildInquiryMailto({
        email: inquiry.email,
        referenceNumber: inquiry.referenceNumber,
      })
    : null

  return (
    <div className="w-full min-w-0 max-w-full space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Consulta comercial
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            {inquiry.referenceNumber}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <StatusBadge status={inquiry.status} />
            <span>·</span>
            <span>{formatInquiryDateTime(inquiry.createdAt)}</span>
            <span>·</span>
            <span>{sourceLabel(inquiry.source)}</span>
            <span>·</span>
            <span>
              {inquiry.itemCount} producto
              {inquiry.itemCount === 1 ? '' : 's'}
            </span>
          </div>
        </div>
        <Link
          href="/admin/catalog/inquiries"
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Volver al listado
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Datos del cliente
          </h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nombre
              </dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {inquiry.customerName}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Empresa
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {displayOptional(inquiry.companyName)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Teléfono
              </dt>
              <dd className="mt-0.5 text-slate-800">{inquiry.phone}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {displayOptional(inquiry.email)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Localidad
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {displayOptional(inquiry.location)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tipo de cliente
              </dt>
              <dd className="mt-0.5 text-slate-800">
                {displayOptional(inquiry.clientType)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
            <a
              href={telHref}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
            >
              <Phone className="h-4 w-4" aria-hidden />
              Llamar
            </a>
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-3.5 py-2 text-sm font-semibold text-white hover:brightness-105"
              >
                <MessageCircle className="h-4 w-4" aria-hidden />
                WhatsApp
              </a>
            ) : null}
            {mailHref ? (
              <a
                href={mailHref}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50"
              >
                <Mail className="h-4 w-4" aria-hidden />
                Email
              </a>
            ) : null}
          </div>
        </section>

        <InquiryStatusForm
          inquiryId={inquiry.id}
          currentStatus={inquiry.status}
        />
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Comentario del cliente
        </h2>
        {inquiry.message?.trim() ? (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-700">
            {inquiry.message}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Sin comentario.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">
          Productos consultados
        </h2>

        {/* Mobile cards */}
        <ul className="space-y-3 md:hidden">
          {inquiry.items.map((item) => {
            const img = item.primaryImageUrl
              ? getOptimizedImageUrl(item.primaryImageUrl, 96)
              : null
            return (
              <li
                key={item.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex gap-3">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                    {img ? (
                      <Image
                        src={img}
                        alt=""
                        fill
                        className="object-cover"
                        sizes="56px"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900">{item.title}</p>
                    <p className="font-mono text-xs text-slate-500">
                      {item.sku}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Cantidad: {item.quantity}
                    </p>
                    {item.productExists && item.productId ? (
                      <Link
                        href={`/products/${item.productId}`}
                        className="mt-1 inline-block text-xs font-medium text-ifedel-brown hover:underline"
                      >
                        Ver en backoffice
                      </Link>
                    ) : (
                      <p className="mt-1 text-xs text-slate-500">
                        Producto ya no disponible en el sistema
                      </p>
                    )}
                    {item.comment?.trim() ? (
                      <p className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-600">
                        {item.comment}
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            )
          })}
        </ul>

        <div className="hidden md:block">
          <DataTableShell>
            <table className="dashboard-table w-full text-left text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3">SKU</th>
                  <th className="px-4 py-3">Cant.</th>
                  <th className="px-4 py-3">Comentario</th>
                  <th className="px-4 py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {inquiry.items.map((item) => {
                  const img = item.primaryImageUrl
                    ? getOptimizedImageUrl(item.primaryImageUrl, 64)
                    : null
                  return (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-md bg-slate-100">
                            {img ? (
                              <Image
                                src={img}
                                alt=""
                                fill
                                className="object-cover"
                                sizes="40px"
                              />
                            ) : null}
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">
                              {item.title}
                            </p>
                            {!item.productExists ? (
                              <p className="text-[11px] text-slate-500">
                                Producto eliminado o no disponible
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-600">
                        {item.sku}
                      </td>
                      <td className="px-4 py-3 text-slate-800">
                        {item.quantity}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-slate-600">
                        {item.comment?.trim() ? (
                          <span className="whitespace-pre-wrap break-words">
                            {item.comment}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {item.productExists && item.productId ? (
                          <Link
                            href={`/products/${item.productId}`}
                            className="text-xs font-medium text-ifedel-brown hover:underline"
                          >
                            Ver producto
                          </Link>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </DataTableShell>
        </div>
      </section>

      <p className="text-xs text-slate-500">
        Última actualización: {formatInquiryDateTime(inquiry.updatedAt)}
      </p>
    </div>
  )
}
