/**
 * Builders puros del email de consulta comercial (sin I/O).
 * Server-side only — no importar desde componentes cliente.
 */

import {
  buildInquiryMailto,
  buildInquiryWhatsAppUrl,
  formatInquiryDateTime,
} from '@/lib/admin-catalog-inquiries'
import { formatPublicCatalogPriceLabel } from '@/lib/catalog-public-price'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InquiryEmailItem = {
  title: string
  sku: string
  quantity: number
  unitPriceARS?: number | null
  subtotalARS?: number | null
}

export type InquiryEmailPayload = {
  id: number
  referenceNumber: string
  createdAt: Date
  customerName: string
  companyName: string | null
  phone: string
  email: string | null
  location: string | null
  message: string | null
  source: string
  deliveryAddress?: string | null
  deliveryCity?: string | null
  deliveryProvince?: string | null
  deliveryPostalCode?: string | null
  deliveryNotes?: string | null
  estimatedProductsTotalARS?: number | null
  pricedItemsCount?: number | null
  unpricedItemsCount?: number | null
  items: InquiryEmailItem[]
}

export type InquiryEmailConfig = {
  apiKey: string
  fromEmail: string
  fromName: string
  recipients: string[]
  backofficeBaseUrl: string
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/** Convierte texto plano a HTML seguro preservando saltos de línea. */
export function plainTextToSafeHtml(value: string): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, '<br />')
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

export function parseNotificationRecipients(raw: string | undefined): string[] {
  if (!raw) return []
  const seen = new Set<string>()
  const out: string[] = []
  for (const part of raw.split(',')) {
    const email = part.trim().toLowerCase()
    if (!email || !isValidEmail(email) || seen.has(email)) continue
    seen.add(email)
    out.push(email)
  }
  return out
}

export function resolveInquiryEmailConfig(
  env: Record<string, string | undefined> = process.env,
):
  | { ok: true; config: InquiryEmailConfig }
  | { ok: false; reason: 'disabled' | 'configuration_error'; message: string } {
  const apiKey = env.BREVO_API_KEY?.trim() ?? ''
  const fromEmail = (
    env.INQUIRY_NOTIFICATION_FROM?.trim() ||
    'info@ifedel.com'
  ).replace(/^.*<([^>]+)>.*$/, '$1').trim()
  const fromName = (
    env.INQUIRY_NOTIFICATION_FROM_NAME?.trim() ||
    'IFEDEL'
  ).slice(0, 80)
  const recipients = parseNotificationRecipients(
    env.INQUIRY_NOTIFICATION_RECIPIENTS,
  )
  const backofficeBaseUrl = (
    env.NEXT_PUBLIC_BACKOFFICE_URL?.trim() ||
    env.AUTH_URL?.trim() ||
    'https://app.ifedel.com'
  ).replace(/\/+$/, '')

  if (!apiKey) {
    return {
      ok: false,
      reason: 'disabled',
      message: 'BREVO_API_KEY no configurada',
    }
  }
  if (!isValidEmail(fromEmail)) {
    return {
      ok: false,
      reason: 'configuration_error',
      message: 'INQUIRY_NOTIFICATION_FROM inválido',
    }
  }
  if (recipients.length === 0) {
    return {
      ok: false,
      reason: 'configuration_error',
      message: 'INQUIRY_NOTIFICATION_RECIPIENTS sin destinatarios válidos',
    }
  }

  return {
    ok: true,
    config: {
      apiKey,
      fromEmail,
      fromName,
      recipients,
      backofficeBaseUrl,
    },
  }
}

export function buildInquiryNotificationSubject(
  payload: Pick<InquiryEmailPayload, 'referenceNumber' | 'customerName'>,
): string {
  const name = payload.customerName.trim() || 'Cliente'
  return `Nueva consulta web ${payload.referenceNumber} — ${name}`
}

export function buildInquiryBackofficeUrl(
  baseUrl: string,
  inquiryId: number,
): string {
  const base = baseUrl.replace(/\/+$/, '')
  return `${base}/admin/catalog/inquiries/${inquiryId}`
}

export function buildInquiryNotificationText(
  payload: InquiryEmailPayload,
  backofficeUrl: string,
): string {
  const lines: string[] = [
    'Nueva consulta comercial',
    `Referencia: ${payload.referenceNumber}`,
    `Fecha: ${formatInquiryDateTime(payload.createdAt)}`,
    `Origen: ${payload.source}`,
    '',
    'Datos del cliente',
    `Nombre: ${payload.customerName}`,
  ]
  if (payload.companyName?.trim()) {
    lines.push(`Empresa: ${payload.companyName.trim()}`)
  }
  lines.push(`Teléfono: ${payload.phone}`)
  if (payload.email?.trim()) {
    lines.push(`Email: ${payload.email.trim()}`)
  }
  if (payload.location?.trim()) {
    lines.push(`Localidad: ${payload.location.trim()}`)
  }

  const hasDelivery =
    payload.deliveryAddress?.trim() ||
    payload.deliveryCity?.trim() ||
    payload.deliveryProvince?.trim() ||
    payload.deliveryPostalCode?.trim() ||
    payload.deliveryNotes?.trim()
  if (hasDelivery) {
    lines.push('', 'Datos de entrega')
    if (payload.deliveryAddress?.trim()) {
      lines.push(`Dirección: ${payload.deliveryAddress.trim()}`)
    }
    if (payload.deliveryCity?.trim()) {
      lines.push(`Localidad: ${payload.deliveryCity.trim()}`)
    }
    if (payload.deliveryProvince?.trim()) {
      lines.push(`Provincia: ${payload.deliveryProvince.trim()}`)
    }
    if (payload.deliveryPostalCode?.trim()) {
      lines.push(`Código postal: ${payload.deliveryPostalCode.trim()}`)
    }
    if (payload.deliveryNotes?.trim()) {
      lines.push(`Referencia: ${payload.deliveryNotes.trim()}`)
    }
  }

  if (
    payload.estimatedProductsTotalARS != null ||
    payload.pricedItemsCount != null
  ) {
    lines.push('', 'Resumen económico')
    if (payload.estimatedProductsTotalARS != null) {
      lines.push(
        `Productos con precio: ${formatPublicCatalogPriceLabel(payload.estimatedProductsTotalARS)}`,
      )
    }
    if (payload.unpricedItemsCount) {
      lines.push(`Productos a cotizar: ${payload.unpricedItemsCount}`)
    }
    lines.push('Envío: a cotizar')
    if (payload.estimatedProductsTotalARS != null) {
      const partial = (payload.unpricedItemsCount ?? 0) > 0
      lines.push(
        `${partial ? 'Total estimado parcial' : 'Total estimado'}: ${formatPublicCatalogPriceLabel(payload.estimatedProductsTotalARS)}`,
      )
    }
  }

  lines.push('', 'Productos consultados')
  for (const item of payload.items) {
    const priceBit =
      item.unitPriceARS != null
        ? ` · ${formatPublicCatalogPriceLabel(item.unitPriceARS)} c/u` +
          (item.subtotalARS != null
            ? ` · subtotal ${formatPublicCatalogPriceLabel(item.subtotalARS)}`
            : '')
        : ' · a cotizar'
    lines.push(`- [${item.sku}] ${item.title} × ${item.quantity}${priceBit}`)
  }

  if (payload.message?.trim()) {
    lines.push('', 'Comentario', payload.message.trim())
  }

  lines.push('', `Ver en backoffice: ${backofficeUrl}`)
  return lines.join('\n')
}

export function buildInquiryNotificationHtml(
  payload: InquiryEmailPayload,
  backofficeUrl: string,
): string {
  const dateLabel = escapeHtml(formatInquiryDateTime(payload.createdAt))
  const ref = escapeHtml(payload.referenceNumber)
  const name = escapeHtml(payload.customerName)
  const company = payload.companyName?.trim()
    ? escapeHtml(payload.companyName.trim())
    : null
  const phone = escapeHtml(payload.phone)
  const email = payload.email?.trim()
    ? escapeHtml(payload.email.trim())
    : null
  const location = payload.location?.trim()
    ? escapeHtml(payload.location.trim())
    : null
  const deliveryAddress = payload.deliveryAddress?.trim()
    ? escapeHtml(payload.deliveryAddress.trim())
    : null
  const deliveryCity = payload.deliveryCity?.trim()
    ? escapeHtml(payload.deliveryCity.trim())
    : null
  const deliveryProvince = payload.deliveryProvince?.trim()
    ? escapeHtml(payload.deliveryProvince.trim())
    : null
  const deliveryPostalCode = payload.deliveryPostalCode?.trim()
    ? escapeHtml(payload.deliveryPostalCode.trim())
    : null
  const deliveryNotes = payload.deliveryNotes?.trim()
    ? escapeHtml(payload.deliveryNotes.trim())
    : null
  const messageHtml = payload.message?.trim()
    ? plainTextToSafeHtml(payload.message.trim())
    : null
  const hasEconomicSnapshot =
    payload.estimatedProductsTotalARS != null ||
    payload.pricedItemsCount != null
  const estimatedTotal =
    payload.estimatedProductsTotalARS != null
      ? escapeHtml(
          formatPublicCatalogPriceLabel(payload.estimatedProductsTotalARS),
        )
      : null
  const partial = (payload.unpricedItemsCount ?? 0) > 0

  const telHref = `tel:${payload.phone.replace(/\s+/g, '')}`
  const waHref = buildInquiryWhatsAppUrl({
    phone: payload.phone,
    customerName: payload.customerName,
    referenceNumber: payload.referenceNumber,
  })
  const mailHref = payload.email
    ? buildInquiryMailto({
        email: payload.email,
        referenceNumber: payload.referenceNumber,
      })
    : null

  const itemRows = payload.items
    .map((item) => {
      const unit =
        item.unitPriceARS != null
          ? escapeHtml(formatPublicCatalogPriceLabel(item.unitPriceARS))
          : 'A cotizar'
      const subtotal =
        item.subtotalARS != null
          ? escapeHtml(formatPublicCatalogPriceLabel(item.subtotalARS))
          : '—'
      return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(item.title)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(item.sku)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${item.quantity}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${unit}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${subtotal}</td>
</tr>`
    })
    .join('')

  const itemCards = payload.items
    .map((item) => {
      const unit =
        item.unitPriceARS != null
          ? escapeHtml(formatPublicCatalogPriceLabel(item.unitPriceARS))
          : 'A cotizar'
      const subtotal =
        item.subtotalARS != null
          ? ` · Subtotal ${escapeHtml(formatPublicCatalogPriceLabel(item.subtotalARS))}`
          : ''
      return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;">
  <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.title)}</div>
  <div style="font-size:12px;color:#64748b;font-family:ui-monospace,monospace;margin-top:4px;">${escapeHtml(item.sku)}</div>
  <div style="font-size:13px;color:#334155;margin-top:6px;">Cantidad: ${item.quantity} · ${unit}${subtotal}</div>
</div>`
    })
    .join('')

  const secondaryLinks: string[] = [
    `<a href="${escapeHtml(telHref)}" style="color:#27500a;text-decoration:none;font-weight:600;">Llamar</a>`,
  ]
  if (waHref) {
    secondaryLinks.push(
      `<a href="${escapeHtml(waHref)}" style="color:#27500a;text-decoration:none;font-weight:600;">WhatsApp</a>`,
    )
  }
  if (mailHref) {
    secondaryLinks.push(
      `<a href="${escapeHtml(mailHref)}" style="color:#27500a;text-decoration:none;font-weight:600;">Email</a>`,
    )
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Nueva consulta comercial ${ref}</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">
    <div style="background:#1f3d14;color:#fff;border-radius:16px 16px 0 0;padding:20px 24px;">
      <p style="margin:0;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.85;">IFEDEL</p>
      <h1 style="margin:8px 0 0;font-size:22px;line-height:1.3;">Nueva consulta comercial</h1>
      <p style="margin:8px 0 0;font-size:14px;opacity:0.95;">${ref} · ${dateLabel}</p>
    </div>

    <div style="background:#ffffff;border:1px solid #e2e8f0;border-top:0;border-radius:0 0 16px 16px;padding:24px;">
      <h2 style="margin:0 0 12px;font-size:16px;">Datos del cliente</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        <tr><td style="padding:6px 0;color:#64748b;width:120px;">Nombre</td><td style="padding:6px 0;font-weight:600;">${name}</td></tr>
        ${company ? `<tr><td style="padding:6px 0;color:#64748b;">Empresa</td><td style="padding:6px 0;">${company}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#64748b;">Teléfono</td><td style="padding:6px 0;">${phone}</td></tr>
        ${email ? `<tr><td style="padding:6px 0;color:#64748b;">Email</td><td style="padding:6px 0;">${email}</td></tr>` : ''}
        ${location ? `<tr><td style="padding:6px 0;color:#64748b;">Localidad</td><td style="padding:6px 0;">${location}</td></tr>` : ''}
      </table>

      ${
        deliveryAddress ||
        deliveryCity ||
        deliveryProvince ||
        deliveryPostalCode ||
        deliveryNotes
          ? `<h2 style="margin:24px 0 12px;font-size:16px;">Datos de entrega</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${deliveryAddress ? `<tr><td style="padding:6px 0;color:#64748b;width:120px;">Dirección</td><td style="padding:6px 0;">${deliveryAddress}</td></tr>` : ''}
        ${deliveryCity ? `<tr><td style="padding:6px 0;color:#64748b;">Localidad</td><td style="padding:6px 0;">${deliveryCity}</td></tr>` : ''}
        ${deliveryProvince ? `<tr><td style="padding:6px 0;color:#64748b;">Provincia</td><td style="padding:6px 0;">${deliveryProvince}</td></tr>` : ''}
        ${deliveryPostalCode ? `<tr><td style="padding:6px 0;color:#64748b;">CP</td><td style="padding:6px 0;">${deliveryPostalCode}</td></tr>` : ''}
        ${deliveryNotes ? `<tr><td style="padding:6px 0;color:#64748b;">Referencia</td><td style="padding:6px 0;">${deliveryNotes}</td></tr>` : ''}
      </table>`
          : ''
      }

      ${
        hasEconomicSnapshot
          ? `<h2 style="margin:24px 0 12px;font-size:16px;">Resumen económico</h2>
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
        ${estimatedTotal ? `<tr><td style="padding:6px 0;color:#64748b;width:180px;">Productos con precio</td><td style="padding:6px 0;font-weight:600;">${estimatedTotal}</td></tr>` : ''}
        ${payload.unpricedItemsCount ? `<tr><td style="padding:6px 0;color:#64748b;">Productos a cotizar</td><td style="padding:6px 0;">${payload.unpricedItemsCount}</td></tr>` : ''}
        <tr><td style="padding:6px 0;color:#64748b;">Envío</td><td style="padding:6px 0;">A cotizar</td></tr>
        ${estimatedTotal ? `<tr><td style="padding:6px 0;color:#64748b;">${partial ? 'Total estimado parcial' : 'Total estimado'}</td><td style="padding:6px 0;font-weight:700;">${estimatedTotal}</td></tr>` : ''}
      </table>`
          : ''
      }

      <h2 style="margin:24px 0 12px;font-size:16px;">Productos consultados</h2>
      <!-- Desktop table -->
      <div style="display:block;">
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f8fafc;">
              <th align="left" style="padding:10px 12px;color:#64748b;font-weight:600;">Producto</th>
              <th align="left" style="padding:10px 12px;color:#64748b;font-weight:600;">SKU</th>
              <th align="right" style="padding:10px 12px;color:#64748b;font-weight:600;">Cant.</th>
              <th align="right" style="padding:10px 12px;color:#64748b;font-weight:600;">Precio</th>
              <th align="right" style="padding:10px 12px;color:#64748b;font-weight:600;">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>
      </div>
      <!-- Mobile-friendly fallback list (visible in narrow clients that ignore table layout) -->
      <div style="margin-top:12px;">
        ${itemCards}
      </div>

      ${
        messageHtml
          ? `<h2 style="margin:24px 0 12px;font-size:16px;">Comentario</h2>
      <div style="padding:14px 16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;font-size:14px;line-height:1.5;color:#334155;">${messageHtml}</div>`
          : ''
      }

      <div style="margin-top:28px;text-align:center;">
        <a href="${escapeHtml(backofficeUrl)}" style="display:inline-block;background:#8DC640;color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:999px;">Ver consulta en el backoffice</a>
      </div>

      <p style="margin:18px 0 0;text-align:center;font-size:13px;color:#64748b;">
        ${secondaryLinks.join(' · ')}
      </p>

      <p style="margin:24px 0 0;font-size:11px;color:#94a3b8;word-break:break-all;">
        ${escapeHtml(backofficeUrl)}
      </p>
    </div>
  </div>
</body>
</html>`
}
