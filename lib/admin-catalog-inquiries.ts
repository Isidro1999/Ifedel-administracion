import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import {
  COMMERCIAL_INQUIRY_SOURCES,
  COMMERCIAL_INQUIRY_STATUSES,
  type CommercialInquirySource,
  type CommercialInquiryStatus,
} from '@/lib/catalog-inquiry-schemas'
import { hasInquiryEconomicSnapshot } from '@/lib/catalog-inquiry-totals'
export { displayTaxId } from '@/lib/tax-id'
import {
  parsePaginationParams,
  resolvePagination,
  type PaginationResult,
  type PaginationSearchParams,
} from '@/lib/pagination'

const INQUIRY_DEFAULT_PAGE_SIZE = 20
const MAX_SEARCH_LEN = 80

export type AdminInquiryFilters = {
  q: string
  status: CommercialInquiryStatus | 'all'
  source: CommercialInquirySource | 'all'
}

export type AdminInquiryListItem = {
  id: number
  referenceNumber: string
  status: string
  source: string
  customerName: string
  companyName: string | null
  phone: string
  email: string | null
  createdAt: Date
  itemCount: number
}

export type AdminInquiryDetailItem = {
  id: number
  productId: number | null
  sku: string
  title: string
  slug: string | null
  quantity: number
  comment: string | null
  unitPriceARS: number | null
  subtotalARS: number | null
  sortOrder: number
  productExists: boolean
  primaryImageUrl: string | null
}

export type AdminInquiryDetail = {
  id: number
  referenceNumber: string
  status: string
  source: string
  customerName: string
  companyName: string | null
  taxId: string | null
  phone: string
  email: string | null
  location: string | null
  clientType: string | null
  message: string | null
  deliveryAddress: string | null
  deliveryCity: string | null
  deliveryProvince: string | null
  deliveryPostalCode: string | null
  deliveryNotes: string | null
  estimatedProductsTotalARS: number | null
  pricedItemsCount: number | null
  unpricedItemsCount: number | null
  hasEconomicSnapshot: boolean
  createdAt: Date
  updatedAt: Date
  itemCount: number
  items: AdminInquiryDetailItem[]
}

function firstParam(
  value: string | string[] | undefined | null,
): string | undefined {
  if (value == null) return undefined
  return Array.isArray(value) ? value[0] : value
}

function normalizeSearch(raw: string | undefined): string {
  if (!raw) return ''
  return raw.trim().slice(0, MAX_SEARCH_LEN)
}

export function parseAdminInquiryFilters(
  searchParams?: PaginationSearchParams | URLSearchParams | null,
): AdminInquiryFilters {
  let qRaw: string | undefined
  let statusRaw: string | undefined
  let sourceRaw: string | undefined

  if (searchParams instanceof URLSearchParams) {
    qRaw = searchParams.get('q') ?? undefined
    statusRaw = searchParams.get('status') ?? undefined
    sourceRaw = searchParams.get('source') ?? undefined
  } else if (searchParams) {
    qRaw = firstParam(searchParams.q)
    statusRaw = firstParam(searchParams.status)
    sourceRaw = firstParam(searchParams.source)
  }

  const statusCandidate = (statusRaw ?? 'all').trim().toUpperCase()
  const status: AdminInquiryFilters['status'] =
    statusCandidate === 'ALL' || statusCandidate === ''
      ? 'all'
      : COMMERCIAL_INQUIRY_STATUSES.includes(
            statusCandidate as CommercialInquiryStatus,
          )
        ? (statusCandidate as CommercialInquiryStatus)
        : 'all'

  const sourceCandidate = (sourceRaw ?? 'all').trim().toUpperCase()
  const source: AdminInquiryFilters['source'] =
    sourceCandidate === 'ALL' || sourceCandidate === ''
      ? 'all'
      : COMMERCIAL_INQUIRY_SOURCES.includes(
            sourceCandidate as CommercialInquirySource,
          )
        ? (sourceCandidate as CommercialInquirySource)
        : 'all'

  return {
    q: normalizeSearch(qRaw),
    status,
    source,
  }
}

function buildWhere(
  filters: AdminInquiryFilters,
): Prisma.CommercialInquiryWhereInput {
  const where: Prisma.CommercialInquiryWhereInput = {}

  if (filters.status !== 'all') {
    where.status = filters.status
  }
  if (filters.source !== 'all') {
    where.source = filters.source
  }

  if (filters.q) {
    const q = filters.q
    where.OR = [
      { referenceNumber: { contains: q, mode: 'insensitive' } },
      { customerName: { contains: q, mode: 'insensitive' } },
      { companyName: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ]
  }

  return where
}

export async function countNewCommercialInquiries(): Promise<number> {
  try {
    return await prisma.commercialInquiry.count({
      where: { status: 'NEW' },
    })
  } catch {
    return 0
  }
}

export async function listAdminCommercialInquiries(
  searchParams?: PaginationSearchParams | URLSearchParams | null,
): Promise<{
  items: AdminInquiryListItem[]
  pagination: PaginationResult
  filters: AdminInquiryFilters
  newCount: number
}> {
  const filters = parseAdminInquiryFilters(searchParams)
  const { page, pageSize } = parsePaginationParams(searchParams, {
    defaultPageSize: INQUIRY_DEFAULT_PAGE_SIZE,
  })
  const where = buildWhere(filters)

  const [total, newCount] = await Promise.all([
    prisma.commercialInquiry.count({ where }),
    countNewCommercialInquiries(),
  ])

  const pagination = resolvePagination(page, pageSize, total)

  const rows = await prisma.commercialInquiry.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    skip: pagination.skip,
    take: pagination.take,
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      source: true,
      customerName: true,
      companyName: true,
      phone: true,
      email: true,
      createdAt: true,
      _count: { select: { items: true } },
    },
  })

  return {
    items: rows.map((row) => ({
      id: row.id,
      referenceNumber: row.referenceNumber,
      status: row.status,
      source: row.source,
      customerName: row.customerName,
      companyName: row.companyName,
      phone: row.phone,
      email: row.email,
      createdAt: row.createdAt,
      itemCount: row._count.items,
    })),
    pagination,
    filters,
    newCount,
  }
}

export async function getAdminCommercialInquiryById(
  id: number,
): Promise<AdminInquiryDetail | null> {
  if (!Number.isFinite(id) || id <= 0) return null

  const row = await prisma.commercialInquiry.findUnique({
    where: { id },
    select: {
      id: true,
      referenceNumber: true,
      status: true,
      source: true,
      customerName: true,
      companyName: true,
      taxId: true,
      phone: true,
      email: true,
      location: true,
      clientType: true,
      message: true,
      deliveryAddress: true,
      deliveryCity: true,
      deliveryProvince: true,
      deliveryPostalCode: true,
      deliveryNotes: true,
      estimatedProductsTotalARS: true,
      pricedItemsCount: true,
      unpricedItemsCount: true,
      createdAt: true,
      updatedAt: true,
      items: {
        orderBy: { sortOrder: 'asc' },
        select: {
          id: true,
          productId: true,
          sku: true,
          title: true,
          slug: true,
          quantity: true,
          comment: true,
          unitPriceARS: true,
          subtotalARS: true,
          sortOrder: true,
          product: {
            select: {
              id: true,
              images: {
                orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                take: 1,
                select: { url: true },
              },
            },
          },
        },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    referenceNumber: row.referenceNumber,
    status: row.status,
    source: row.source,
    customerName: row.customerName,
    companyName: row.companyName,
    taxId: row.taxId,
    phone: row.phone,
    email: row.email,
    location: row.location,
    clientType: row.clientType,
    message: row.message,
    deliveryAddress: row.deliveryAddress,
    deliveryCity: row.deliveryCity,
    deliveryProvince: row.deliveryProvince,
    deliveryPostalCode: row.deliveryPostalCode,
    deliveryNotes: row.deliveryNotes,
    estimatedProductsTotalARS: row.estimatedProductsTotalARS,
    pricedItemsCount: row.pricedItemsCount,
    unpricedItemsCount: row.unpricedItemsCount,
    hasEconomicSnapshot: hasInquiryEconomicSnapshot(row),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    itemCount: row.items.length,
    items: row.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      sku: item.sku,
      title: item.title,
      slug: item.slug,
      quantity: item.quantity,
      comment: item.comment,
      unitPriceARS: item.unitPriceARS,
      subtotalARS: item.subtotalARS,
      sortOrder: item.sortOrder,
      productExists: item.product != null,
      primaryImageUrl: item.product?.images[0]?.url ?? null,
    })),
  }
}

export async function updateCommercialInquiryStatus(
  id: number,
  status: CommercialInquiryStatus,
): Promise<{ id: number; status: string; updatedAt: Date } | null> {
  if (!Number.isFinite(id) || id <= 0) return null

  try {
    return await prisma.commercialInquiry.update({
      where: { id },
      data: { status },
      select: { id: true, status: true, updatedAt: true },
    })
  } catch {
    return null
  }
}

/**
 * Normaliza dígitos para wa.me sin alterar el valor guardado.
 * Si el número parece AR local (10 dígitos), antepone 54.
 */
export function phoneToWhatsAppDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 8) return null
  if (digits.startsWith('54')) return digits
  if (digits.length === 10) return `54${digits}`
  if (digits.length === 11 && digits.startsWith('9')) return `54${digits}`
  return digits
}

export function buildInquiryWhatsAppUrl(input: {
  phone: string
  customerName: string
  referenceNumber: string
}): string | null {
  const digits = phoneToWhatsAppDigits(input.phone)
  if (!digits) return null
  const name = input.customerName.trim() || 'hola'
  const message = `Hola ${name}, te contactamos de IFEDEL por tu consulta ${input.referenceNumber}.`
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`
}

export function buildInquiryMailto(input: {
  email: string
  referenceNumber: string
}): string | null {
  const email = input.email.trim()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null
  const subject = `Consulta ${input.referenceNumber} — IFEDEL`
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}

export function formatInquiryDateTime(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date)
}

export function formatInquiryDate(date: Date): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(date)
}

export function displayOptional(value: string | null | undefined): string {
  const t = value?.trim()
  return t ? t : '—'
}
