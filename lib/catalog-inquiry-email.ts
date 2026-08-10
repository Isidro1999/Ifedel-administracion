/**
 * Builders puros del email de consulta comercial (sin I/O).
 * Server-side only — no importar desde componentes cliente.
 */

import {
  buildInquiryMailto,
  buildInquiryWhatsAppUrl,
  formatInquiryDateTime,
} from '@/lib/admin-catalog-inquiries'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InquiryEmailItem = {
  title: string
  sku: string
  quantity: number
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

  lines.push('', 'Productos consultados')
  for (const item of payload.items) {
    lines.push(`- [${item.sku}] ${item.title} × ${item.quantity}`)
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
  const messageHtml = payload.message?.trim()
    ? plainTextToSafeHtml(payload.message.trim())
    : null

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
      return `<tr>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;">${escapeHtml(item.title)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#475569;font-family:ui-monospace,monospace;font-size:12px;">${escapeHtml(item.sku)}</td>
  <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;color:#0f172a;text-align:right;">${item.quantity}</td>
</tr>`
    })
    .join('')

  const itemCards = payload.items
    .map((item) => {
      return `<div style="padding:12px;border:1px solid #e2e8f0;border-radius:10px;margin-bottom:8px;">
  <div style="font-weight:600;color:#0f172a;">${escapeHtml(item.title)}</div>
  <div style="font-size:12px;color:#64748b;font-family:ui-monospace,monospace;margin-top:4px;">${escapeHtml(item.sku)}</div>
  <div style="font-size:13px;color:#334155;margin-top:6px;">Cantidad: ${item.quantity}</div>
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

      <h2 style="margin:24px 0 12px;font-size:16px;">Productos consultados</h2>
      <!-- Desktop table -->
      <div style="display:block;">
        <table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <thead>
            <tr style="background:#f8fafc;">
              <th align="left" style="padding:10px 12px;color:#64748b;font-weight:600;">Producto</th>
              <th align="left" style="padding:10px 12px;color:#64748b;font-weight:600;">SKU</th>
              <th align="right" style="padding:10px 12px;color:#64748b;font-weight:600;">Cant.</th>
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
