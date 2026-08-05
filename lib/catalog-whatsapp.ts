import { IFEDelBrand } from '@/lib/ifedel-brand'
import { catalogAbsoluteUrl } from '@/lib/catalog-paths'
import type {
  CatalogInquiryContact,
  CatalogInquiryItem,
} from '@/lib/catalog-inquiry-store'

/**
 * Helpers WhatsApp para consultas del catálogo público.
 * Número: NEXT_PUBLIC_IFEDEL_WHATSAPP_NUMBER (solo dígitos, con código país).
 */

export function getIfedelWhatsAppNumber(): string | null {
  const raw = process.env.NEXT_PUBLIC_IFEDEL_WHATSAPP_NUMBER?.trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  return digits.length >= 8 ? digits : null
}

export function buildCatalogInquiryMessage(input: {
  items: CatalogInquiryItem[]
  contact: CatalogInquiryContact
  /** Origen absoluto opcional (ej. https://ifedel.com) */
  catalogOrigin?: string
}): string {
  const lines: string[] = [
    `Hola ${IFEDelBrand.companyName}, quiero consultar por estos productos:`,
    '',
  ]

  input.items.forEach((item, index) => {
    lines.push(`${index + 1}. [${item.sku}] ${item.title}`)
    lines.push(`Cantidad: ${item.quantity}`)
    const comment = item.comment?.trim()
    if (comment) {
      lines.push(`Comentario: ${comment}`)
    }
    lines.push('')
  })

  lines.push('Datos del interesado:')
  lines.push(`Nombre: ${input.contact.name.trim() || '-'}`)
  lines.push(`Localidad: ${input.contact.locality.trim() || '-'}`)
  lines.push(`Tipo de cliente: ${input.contact.clientType || '-'}`)
  const general = input.contact.generalComment?.trim()
  if (general) {
    lines.push(`Comentario general: ${general}`)
  }
  lines.push('')

  const catalogHome = catalogAbsoluteUrl('', {
    origin: input.catalogOrigin,
  })

  lines.push('Link del catálogo:')
  lines.push(catalogHome)

  if (input.items.length > 0) {
    lines.push('')
    lines.push('Links de productos:')
    for (const item of input.items) {
      lines.push(
        `- ${catalogAbsoluteUrl(`productos/${item.slug}`, {
          origin: input.catalogOrigin,
        })}`,
      )
    }
  }

  return lines.join('\n')
}

export function buildWhatsAppUrl(
  message: string,
  phoneDigits?: string | null,
): string | null {
  const phone = phoneDigits ?? getIfedelWhatsAppNumber()
  if (!phone) return null
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
}
