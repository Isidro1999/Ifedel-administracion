/**
 * Búsqueda de productos en backoffice: multi-palabra, case/accent-insensitive.
 * No modifica datos en DB. Sin extensiones (usa translate() nativo de PostgreSQL).
 */

import { Prisma } from '@prisma/client'

/** Máximo de tokens por query (evita AND explosivos). */
export const MAX_PRODUCT_SEARCH_TOKENS = 6

const ACCENT_FROM =
  'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ'
const ACCENT_TO = 'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'

/** Quita diacríticos (NFD) para normalizar el input del usuario. */
export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '')
}

export function escapeLikePattern(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')
}

/**
 * Normaliza y tokeniza `q`.
 * - trim, lowercase, fold accents
 * - split por whitespace
 * - descarta vacíos
 * - limita a MAX_PRODUCT_SEARCH_TOKENS
 */
export function tokenizeProductSearch(q: string): string[] {
  const folded = foldAccents(q).toLowerCase().trim()
  if (!folded) return []

  const tokens: string[] = []
  const seen = new Set<string>()
  for (const part of folded.split(/\s+/)) {
    if (!part || seen.has(part)) continue
    seen.add(part)
    tokens.push(part)
    if (tokens.length >= MAX_PRODUCT_SEARCH_TOKENS) break
  }
  return tokens
}

/** `translate(lower(col), …)` — whitelist de expresiones de columna. */
function foldSqlExpr(columnExpr: string): Prisma.Sql {
  return Prisma.sql`translate(lower(${Prisma.raw(columnExpr)}), ${ACCENT_FROM}, ${ACCENT_TO})`
}

/**
 * Condición SQL: cada token debe matchear al menos un campo
 * (title, sku, short, publicTitle, brand.name, category.name).
 * Requiere aliases `p`, `br`, `ca` en el FROM.
 */
export function buildProductSearchSqlAnd(
  tokens: string[],
): Prisma.Sql | null {
  if (tokens.length === 0) return null

  const tokenClauses = tokens.map((token) => {
    const pat = `%${escapeLikePattern(token)}%`
    return Prisma.sql`(
      ${foldSqlExpr('p."title"')} LIKE ${pat} ESCAPE '\\'
      OR ${foldSqlExpr('p."sku"')} LIKE ${pat} ESCAPE '\\'
      OR ${foldSqlExpr('p."short"')} LIKE ${pat} ESCAPE '\\'
      OR ${foldSqlExpr('p."publicTitle"')} LIKE ${pat} ESCAPE '\\'
      OR ${foldSqlExpr('br."name"')} LIKE ${pat} ESCAPE '\\'
      OR ${foldSqlExpr('ca."name"')} LIKE ${pat} ESCAPE '\\'
    )`
  })

  return Prisma.join(tokenClauses, ' AND ')
}

/**
 * Filtro Prisma equivalente (case-insensitive; tokens ya folded).
 * Accent-insensitive pleno en DB se logra vía SQL (`buildProductSearchSqlAnd`).
 * Este where sirve cuando no hay raw SQL (p. ej. facets parciales) y cubre
 * case + multi-palabra + marca/categoría.
 */
export function buildProductSearchWhere(
  tokens: string[],
): Prisma.ProductWhereInput | undefined {
  if (tokens.length === 0) return undefined

  return {
    AND: tokens.map((token) => ({
      OR: [
        { title: { contains: token, mode: 'insensitive' } },
        { sku: { contains: token, mode: 'insensitive' } },
        { short: { contains: token, mode: 'insensitive' } },
        { publicTitle: { contains: token, mode: 'insensitive' } },
        { brand: { name: { contains: token, mode: 'insensitive' } } },
        { category: { name: { contains: token, mode: 'insensitive' } } },
      ],
    })),
  }
}

/**
 * Resuelve IDs que matchean todos los tokens (accent + case insensitive).
 * Volumen esperado: catálogo backoffice (cientos / pocos miles).
 */
export async function findProductIdsMatchingSearch(
  prisma: { $queryRaw: Prisma.TransactionClient['$queryRaw'] },
  tokens: string[],
): Promise<number[] | null> {
  if (tokens.length === 0) return null

  const searchAnd = buildProductSearchSqlAnd(tokens)
  if (!searchAnd) return null

  const rows = await prisma.$queryRaw<Array<{ id: number }>>`
    SELECT p."id"
    FROM "products" p
    INNER JOIN "brands" br ON br."id" = p."brandId"
    INNER JOIN "categories" ca ON ca."id" = p."categoryId"
    WHERE ${searchAnd}
  `

  return rows.map((r) => r.id)
}

/** Combina un where base con el resultado de búsqueda por IDs. */
export function mergeProductSearchIds(
  where: Prisma.ProductWhereInput,
  matchingIds: number[] | null,
): Prisma.ProductWhereInput {
  if (matchingIds == null) return where
  if (matchingIds.length === 0) {
    return { ...where, id: { in: [] } }
  }
  return {
    AND: [where, { id: { in: matchingIds } }],
  }
}
