import { z } from 'zod'

/** Máximo de productos por consulta comercial. */
export const MAX_INQUIRY_ITEMS = 40

const trimmed = (max: number) =>
  z
    .string()
    .trim()
    .max(max, { message: `Máximo ${max} caracteres` })

export const CatalogInquiryItemInputSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(999).optional().default(1),
  comment: trimmed(500).optional().nullable(),
})

/**
 * Payload público POST /api/catalog/inquiries.
 * No confiar en sku/title/slug del cliente: se reconstruyen desde DB.
 */
export const CreateCatalogInquirySchema = z
  .object({
    customerName: trimmed(120).min(2, { message: 'Ingresá tu nombre' }),
    companyName: trimmed(160).optional().nullable(),
    phone: trimmed(40).min(6, { message: 'Ingresá un teléfono válido' }),
    email: z
      .string()
      .trim()
      .max(160)
      .optional()
      .nullable()
      .refine(
        (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
        { message: 'Email inválido' },
      ),
    location: trimmed(120).optional().nullable(),
    clientType: trimmed(60).optional().nullable(),
    message: trimmed(2000).optional().nullable(),
    items: z
      .array(CatalogInquiryItemInputSchema)
      .min(1, { message: 'Agregá al menos un producto' })
      .max(MAX_INQUIRY_ITEMS, {
        message: `Máximo ${MAX_INQUIRY_ITEMS} productos por consulta`,
      }),
    /**
     * Honeypot: los bots suelen completar campos ocultos.
     * Debe llegar vacío o ausente; si tiene valor → rechazar en silencio.
     */
    website: z.string().max(200).optional().nullable(),
  })
  .transform((data) => ({
    customerName: data.customerName,
    companyName: emptyToNull(data.companyName),
    phone: data.phone,
    email: emptyToNull(data.email),
    location: emptyToNull(data.location),
    clientType: emptyToNull(data.clientType),
    message: emptyToNull(data.message),
    items: data.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      comment: emptyToNull(item.comment),
    })),
    website: (data.website ?? '').trim(),
  }))

export type CreateCatalogInquiryInput = z.infer<
  typeof CreateCatalogInquirySchema
>

function emptyToNull(
  value: string | null | undefined,
): string | null {
  if (value == null) return null
  const t = value.trim()
  return t.length === 0 ? null : t
}

export const COMMERCIAL_INQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'IN_PROGRESS',
  'QUOTE_SENT',
  'CLOSED',
  'DISCARDED',
] as const

export type CommercialInquiryStatus =
  (typeof COMMERCIAL_INQUIRY_STATUSES)[number]

export const COMMERCIAL_INQUIRY_SOURCES = ['CATALOG_WEB'] as const

export type CommercialInquirySource =
  (typeof COMMERCIAL_INQUIRY_SOURCES)[number]

export const COMMERCIAL_INQUIRY_STATUS_LABELS: Record<
  CommercialInquiryStatus,
  string
> = {
  NEW: 'Nueva',
  CONTACTED: 'Contactada',
  IN_PROGRESS: 'En gestión',
  QUOTE_SENT: 'Cotización enviada',
  CLOSED: 'Cerrada',
  DISCARDED: 'Descartada',
}

export const COMMERCIAL_INQUIRY_SOURCE_LABELS: Record<
  CommercialInquirySource,
  string
> = {
  CATALOG_WEB: 'Catálogo web',
}

/** PATCH admin: solo permite cambiar status. */
export const UpdateCommercialInquiryStatusSchema = z.object({
  status: z.enum(COMMERCIAL_INQUIRY_STATUSES, {
    errorMap: () => ({ message: 'Estado inválido' }),
  }),
})

export type UpdateCommercialInquiryStatusInput = z.infer<
  typeof UpdateCommercialInquiryStatusSchema
>
