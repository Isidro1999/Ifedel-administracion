import { slugify } from '@/lib/utils'
import type { PrismaClient } from '@prisma/client'

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'
>

/** Normaliza a slug URL-friendly (minúsculas, guiones). */
export function normalizeProductSlug(raw: string): string {
  return slugify(raw).slice(0, 180)
}

/** true si el slug es válido para URL pública. */
export function isValidProductSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= 180
}

/**
 * Genera un slug único para producto a partir de title (fallback sku).
 * Si hay colisión, agrega sufijo numérico (-2, -3, …).
 */
export async function ensureUniqueProductSlug(
  prisma: Tx | PrismaClient,
  title: string,
  sku: string,
  excludeProductId?: number,
): Promise<string> {
  const baseRaw = normalizeProductSlug(title) || normalizeProductSlug(sku) || 'producto'
  const base = baseRaw || 'producto'

  let candidate = base
  let n = 2

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.product.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })

    if (!existing || (excludeProductId != null && existing.id === excludeProductId)) {
      return candidate
    }

    candidate = `${base}-${n}`
    n += 1
    if (n > 10_000) {
      candidate = `${base}-${excludeProductId ?? Date.now()}`
      return candidate
    }
  }
}

/**
 * Resuelve slug a persistir: usa el solicitado si es válido y único;
 * si está vacío, genera desde title/sku.
 * Lanza Error con message amigable si hay conflicto o formato inválido.
 */
export async function resolveProductSlugForSave(
  prisma: Tx | PrismaClient,
  opts: {
    requestedSlug?: string | null
    title: string
    sku: string
    excludeProductId?: number
    requireSlug: boolean
  },
): Promise<string> {
  const trimmed = (opts.requestedSlug || '').trim().toLowerCase()
  const normalized = trimmed ? normalizeProductSlug(trimmed) : ''

  if (opts.requireSlug && !normalized) {
    throw Object.assign(
      new Error('El slug es obligatorio si el producto es visible en el catálogo'),
      { status: 400 },
    )
  }

  if (trimmed && (!normalized || !isValidProductSlug(normalized))) {
    throw Object.assign(
      new Error(
        'Slug inválido. Usá solo minúsculas, números y guiones (ej: gallagher-balanza-twr5)',
      ),
      { status: 400 },
    )
  }

  const candidate =
    normalized ||
    (await ensureUniqueProductSlug(
      prisma,
      opts.title,
      opts.sku,
      opts.excludeProductId,
    ))

  const existing = await prisma.product.findUnique({
    where: { slug: candidate },
    select: { id: true },
  })

  if (
    existing &&
    (opts.excludeProductId == null || existing.id !== opts.excludeProductId)
  ) {
    throw Object.assign(
      new Error(`El slug "${candidate}" ya está en uso por otro producto`),
      { status: 409 },
    )
  }

  return candidate
}
