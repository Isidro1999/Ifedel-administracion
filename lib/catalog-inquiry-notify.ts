/**
 * Notificación interna de nueva consulta comercial vía Brevo (SMTP API).
 * Server-side only. El guardado de la consulta no depende de este envío.
 *
 * Usa fetch directo a https://api.brevo.com/v3/smtp/email (sin SDK)
 * para evitar dependencias extra y mantener el código en el servidor.
 */

import { prisma } from '@/lib/prisma'
import {
  buildInquiryBackofficeUrl,
  buildInquiryNotificationHtml,
  buildInquiryNotificationSubject,
  buildInquiryNotificationText,
  isValidEmail,
  resolveInquiryEmailConfig,
  type InquiryEmailPayload,
} from '@/lib/catalog-inquiry-email'

const BREVO_SMTP_URL = 'https://api.brevo.com/v3/smtp/email'
const BREVO_TIMEOUT_MS = 8_000

export type InquiryNotificationResult =
  | {
      sent: true
      messageId?: string
    }
  | {
      sent: false
      reason: 'disabled' | 'configuration_error' | 'not_found' | 'provider_error'
      detail?: string
    }

function normalizeProviderError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError'
      ? 'timeout'
      : error.message.slice(0, 200)
  }
  if (typeof error === 'string') return error.slice(0, 200)
  return 'unknown_error'
}

function logNotificationSuccess(input: {
  inquiryId: number
  referenceNumber: string
  messageId?: string
}) {
  console.info(
    '[catalog.inquiries.notify] Commercial inquiry notification sent',
    {
      inquiryId: input.inquiryId,
      referenceNumber: input.referenceNumber,
      messageId: input.messageId ?? null,
    },
  )
}

function logNotificationFailure(input: {
  inquiryId: number
  referenceNumber?: string
  reason: string
  providerStatus?: number
  detail?: string
}) {
  console.warn(
    '[catalog.inquiries.notify] Commercial inquiry notification failed',
    {
      inquiryId: input.inquiryId,
      referenceNumber: input.referenceNumber ?? null,
      reason: input.reason,
      providerStatus: input.providerStatus ?? null,
      detail: input.detail ?? null,
    },
  )
}

async function loadInquiryForNotification(
  inquiryId: number,
): Promise<InquiryEmailPayload | null> {
  if (!Number.isFinite(inquiryId) || inquiryId <= 0) return null

  const row = await prisma.commercialInquiry.findUnique({
    where: { id: inquiryId },
    select: {
      id: true,
      referenceNumber: true,
      createdAt: true,
      customerName: true,
      companyName: true,
      taxId: true,
      phone: true,
      email: true,
      location: true,
      message: true,
      source: true,
      deliveryAddress: true,
      deliveryCity: true,
      deliveryProvince: true,
      deliveryPostalCode: true,
      deliveryNotes: true,
      estimatedProductsTotalARS: true,
      pricedItemsCount: true,
      unpricedItemsCount: true,
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          title: true,
          sku: true,
          quantity: true,
          unitPriceARS: true,
          subtotalARS: true,
        },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    createdAt: row.createdAt,
    customerName: row.customerName,
    companyName: row.companyName,
    taxId: row.taxId,
    phone: row.phone,
    email: row.email,
    location: row.location,
    message: row.message,
    source: row.source,
    deliveryAddress: row.deliveryAddress,
    deliveryCity: row.deliveryCity,
    deliveryProvince: row.deliveryProvince,
    deliveryPostalCode: row.deliveryPostalCode,
    deliveryNotes: row.deliveryNotes,
    estimatedProductsTotalARS: row.estimatedProductsTotalARS,
    pricedItemsCount: row.pricedItemsCount,
    unpricedItemsCount: row.unpricedItemsCount,
    items: row.items,
  }
}

async function sendViaBrevo(input: {
  apiKey: string
  fromEmail: string
  fromName: string
  recipients: string[]
  replyTo?: string
  subject: string
  htmlContent: string
  textContent: string
}): Promise<{ ok: true; messageId?: string } | { ok: false; status?: number; detail: string }> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), BREVO_TIMEOUT_MS)

  try {
    const body: Record<string, unknown> = {
      sender: {
        name: input.fromName,
        email: input.fromEmail,
      },
      to: input.recipients.map((email) => ({ email })),
      subject: input.subject,
      htmlContent: input.htmlContent,
      textContent: input.textContent,
      tags: ['catalog-inquiry'],
    }

    if (input.replyTo && isValidEmail(input.replyTo)) {
      body.replyTo = { email: input.replyTo.trim() }
    }

    const res = await fetch(BREVO_SMTP_URL, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'content-type': 'application/json',
        'api-key': input.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    if (!res.ok) {
      let detail = `http_${res.status}`
      try {
        const json = (await res.json()) as { message?: string; code?: string }
        if (json?.code) detail = String(json.code).slice(0, 80)
        else if (json?.message) detail = String(json.message).slice(0, 120)
      } catch {
        /* ignore body parse */
      }
      return { ok: false, status: res.status, detail }
    }

    let messageId: string | undefined
    try {
      const json = (await res.json()) as { messageId?: string }
      if (json?.messageId) messageId = String(json.messageId).slice(0, 120)
    } catch {
      /* 201 puede venir vacío */
    }

    return { ok: true, messageId }
  } catch (error) {
    return { ok: false, detail: normalizeProviderError(error) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Envía el aviso interno de una consulta ya persistida.
 * Preferir pasar el id numérico y rehidratar desde DB.
 */
export async function sendNewInquiryNotification(
  inquiryId: number,
): Promise<InquiryNotificationResult> {
  const configResult = resolveInquiryEmailConfig()
  if (!configResult.ok) {
    logNotificationFailure({
      inquiryId,
      reason: configResult.reason,
      detail: configResult.message,
    })
    return {
      sent: false,
      reason: configResult.reason,
      detail: configResult.message,
    }
  }

  const payload = await loadInquiryForNotification(inquiryId)
  if (!payload) {
    logNotificationFailure({
      inquiryId,
      reason: 'not_found',
      detail: 'inquiry_not_found',
    })
    return { sent: false, reason: 'not_found', detail: 'inquiry_not_found' }
  }

  const { config } = configResult
  const backofficeUrl = buildInquiryBackofficeUrl(
    config.backofficeBaseUrl,
    payload.id,
  )
  const subject = buildInquiryNotificationSubject(payload)
  const htmlContent = buildInquiryNotificationHtml(payload, backofficeUrl)
  const textContent = buildInquiryNotificationText(payload, backofficeUrl)
  const replyTo =
    payload.email && isValidEmail(payload.email) ? payload.email.trim() : undefined

  const result = await sendViaBrevo({
    apiKey: config.apiKey,
    fromEmail: config.fromEmail,
    fromName: config.fromName,
    recipients: config.recipients,
    replyTo,
    subject,
    htmlContent,
    textContent,
  })

  if (!result.ok) {
    logNotificationFailure({
      inquiryId: payload.id,
      referenceNumber: payload.referenceNumber,
      reason: 'provider_error',
      providerStatus: result.status,
      detail: result.detail,
    })
    return {
      sent: false,
      reason: 'provider_error',
      detail: result.detail,
    }
  }

  logNotificationSuccess({
    inquiryId: payload.id,
    referenceNumber: payload.referenceNumber,
    messageId: result.messageId,
  })

  return { sent: true, messageId: result.messageId }
}
