import { z } from 'zod'

export const ProductImageSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().optional().default(false),
  sortOrder: z.number().int().optional().default(0),
})

export const ProductSpecSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  sortOrder: z.number().int().optional().default(0),
})

export const ProductPriceSchema = z.object({
  priceList: z.string().min(1),
  currency: z.string().default('ARS'),
  netPrice: z.number().positive(),
  taxRate: z.number().min(0).max(100).optional().default(0),
  validFrom: z.string().datetime().optional().nullable(),
  validTo: z.string().datetime().optional().nullable(),
})

export const ProductFileSchema = z.object({
  type: z.string().min(1),
  url: z.string().url(),
})

export const ImportProductSchema = z.object({
  sku: z.string().min(1),
  title: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  short: z.string().optional(),
  description: z.string().optional(),
  cost: z.number().optional(),
  costCurrency: z.string().optional(),
  images: z.array(ProductImageSchema).optional().default([]),
  specs: z.array(ProductSpecSchema).optional().default([]),
  prices: z.array(ProductPriceSchema).optional().default([]),
  files: z.array(ProductFileSchema).optional().default([]),
  isActive: z.boolean().optional().default(true),
  isFeatured: z.boolean().optional().default(false),
})

export type ImportProduct = z.infer<typeof ImportProductSchema>
