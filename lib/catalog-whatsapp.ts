import { IFEDelBrand } from '@/lib/ifedel-brand'
import { catalogAbsoluteUrl } from '@/lib/catalog-paths'
import { formatPublicCatalogPriceLabel } from '@/lib/catalog-public-price'
import type {
  CatalogInquiryContact,
  CatalogInquiryDelivery,
  CatalogInquiryItem,
} from '@/lib/catalog-inquiry-store'
import type { InquiryEstimatedTotals } from '@/lib/catalog-inquiry-totals'

export type InquiryLinePublicPrice = {
  amount: number | null
  priceLabel: string
}

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
  delivery?: CatalogInquiryDelivery
  prices?: Record<number, InquiryLinePublicPrice>
  totals?: InquiryEstimatedTotals
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
    const price = input.prices?.[item.productId]
    if (price && typeof price.amount === 'number') {
      const subtotal = price.amount * item.quantity
      lines.push(`Precio: ${formatPublicCatalogPriceLabel(price.amount)} c/u`)
      lines.push(`Subtotal: ${formatPublicCatalogPriceLabel(subtotal)}`)
    } else if (price) {
      lines.push('Precio: a cotizar')
    }
    const comment = item.comment?.trim()
    if (comment) {
      lines.push(`Comentario: ${comment}`)
    }
    lines.push('')
  })

  if (input.totals) {
    const totalLabel = formatPublicCatalogPriceLabel(
      input.totals.estimatedProductsTotalARS,
    )
    if (input.totals.unpricedItemsCount > 0) {
      lines.push(
        `Total estimado parcial: ${totalLabel} + ${input.totals.unpricedItemsCount} producto${input.totals.unpricedItemsCount === 1 ? '' : 's'} a cotizar`,
      )
    } else if (input.totals.pricedItemsCount > 0) {
      lines.push(`Total estimado: ${totalLabel}`)
    }
    lines.push('Envío: a cotizar')
    lines.push('')
  }

  lines.push('Datos del interesado:')
  lines.push(`Nombre: ${input.contact.name.trim() || '-'}`)
  if (input.contact.company?.trim()) {
    lines.push(`Empresa: ${input.contact.company.trim()}`)
  }
  if (input.contact.phone?.trim()) {
    lines.push(`Teléfono: ${input.contact.phone.trim()}`)
  }
  if (input.contact.email?.trim()) {
    lines.push(`Email: ${input.contact.email.trim()}`)
  }
  if (input.contact.clientType) {
    lines.push(`Tipo de cliente: ${input.contact.clientType}`)
  }
  const general = input.contact.generalComment?.trim()
  if (general) {
    lines.push(`Comentario general: ${general}`)
  }
  lines.push('')

  const delivery = input.delivery
  const city = delivery?.city.trim()
  const province = delivery?.province.trim()
  const address = delivery?.address.trim()
  const postal = delivery?.postalCode.trim()
  const notes = delivery?.notes.trim()
  if (city || province || address || postal || notes) {
    lines.push('Datos de entrega:')
    if (address) lines.push(`Dirección: ${address}`)
    if (city) lines.push(`Localidad: ${city}`)
    if (province) lines.push(`Provincia: ${province}`)
    if (postal) lines.push(`Código postal: ${postal}`)
    if (notes) lines.push(`Referencia: ${notes}`)
    lines.push('')
  }

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
