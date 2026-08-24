/**
 * Parsing y validación pura del mapping P2: sku → new_category_slug.
 * Sin I/O de DB; pensado para tests unitarios y el script de migración.
 */

export type MappingRow = {
  sku: string
  newCategorySlug: string
  line: number
}

export type ParseMappingResult = {
  rows: MappingRow[]
  errors: string[]
}

export type CategoryLeafCandidate = {
  id: number
  slug: string
  name: string
  parentId: number | null
  isActive: boolean
  /** true si el slug está en el set de nodos V1 efectivos. */
  isTaxonomyV1: boolean
  /** true si no tiene hijos. */
  isLeaf: boolean
}

export type ProductSnapshotRow = {
  id: number
  sku: string
  categoryId: number
  categorySlug: string
  categoryName: string
  categoryParentId: number | null
}

export type MappingValidationIssue = {
  code: string
  message: string
}

export type MappingValidationInput = {
  mappingRows: MappingRow[]
  products: ProductSnapshotRow[]
  categoriesBySlug: Map<string, CategoryLeafCandidate>
  /** IDs de nodos V1 efectivos (principales + hojas). */
  v1CategoryIds: Set<number>
  expectedProductCount?: number
}

export type PlannedChange = {
  sku: string
  productId: number
  fromCategoryId: number
  fromCategorySlug: string
  toCategoryId: number
  toCategorySlug: string
  alreadyAtTarget: boolean
}

export type MappingValidationResult = {
  ok: boolean
  issues: MappingValidationIssue[]
  mappingRowCount: number
  uniqueSkus: number
  uniqueDestinations: number
  dbProductCount: number
  planned: PlannedChange[]
  changesNeeded: number
  alreadyAtTarget: number
  productsOnV1Before: number
  byDestinationSlug: Map<string, number>
}

const REQUIRED_HEADERS = ['sku', 'new_category_slug'] as const

/** Quita BOM UTF-8 y normaliza saltos de línea. */
export function normalizeMappingCsvText(raw: string): string {
  return raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
}

/**
 * Parsea CSV `sku,new_category_slug` (header obligatorio).
 * - SKU: se preservan espacios (algunos códigos legacy tienen trailing space).
 * - slug destino: trim.
 */
export function parseProductTaxonomyMappingCsv(raw: string): ParseMappingResult {
  const text = normalizeMappingCsvText(raw)
  const errors: string[] = []
  const lines = text.split('\n').filter((l, i, arr) => {
    // conservar líneas internas; dropear solo trailing vacías al final
    if (i === arr.length - 1 && l.trim() === '') return false
    return true
  })

  if (lines.length === 0) {
    return { rows: [], errors: ['CSV vacío'] }
  }

  const headerCells = splitCsvLine(lines[0]).map((h) =>
    h.trim().toLowerCase().replace(/^\uFEFF/, '')
  )
  for (const required of REQUIRED_HEADERS) {
    if (!headerCells.includes(required)) {
      errors.push(`Falta columna requerida "${required}" en el header`)
    }
  }
  if (errors.length) return { rows: [], errors }

  const skuIdx = headerCells.indexOf('sku')
  const slugIdx = headerCells.indexOf('new_category_slug')
  const rows: MappingRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i]
    if (line.trim() === '') continue
    const cells = splitCsvLine(line)
    // No trim del SKU: debe coincidir byte-a-byte con Product.sku
    const sku = cells[skuIdx] ?? ''
    const newCategorySlug = (cells[slugIdx] ?? '').trim()
    rows.push({ sku, newCategorySlug, line: i + 1 })
  }

  return { rows, errors }
}

/** Split CSV simple con comillas dobles (suficiente para mapping mínimo). */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        cur += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      out.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  out.push(cur)
  return out
}

export function validateMappingRowsStructure(
  rows: MappingRow[],
  expectedCount?: number
): MappingValidationIssue[] {
  const issues: MappingValidationIssue[] = []

  if (expectedCount !== undefined && rows.length !== expectedCount) {
    issues.push({
      code: 'MAPPING_ROW_COUNT',
      message: `Mapping tiene ${rows.length} filas; esperado ${expectedCount}`,
    })
  }

  const skuCounts = new Map<string, number>()
  for (const row of rows) {
    if (!row.sku.trim()) {
      issues.push({
        code: 'EMPTY_SKU',
        message: `Línea ${row.line}: SKU vacío`,
      })
      continue
    }
    skuCounts.set(row.sku, (skuCounts.get(row.sku) ?? 0) + 1)
    if (!row.newCategorySlug) {
      issues.push({
        code: 'EMPTY_DESTINATION',
        message: `Línea ${row.line}: new_category_slug vacío (SKU=${JSON.stringify(row.sku)})`,
      })
    }
  }

  for (const [sku, n] of skuCounts) {
    if (n > 1) {
      issues.push({
        code: 'DUPLICATE_SKU',
        message: `SKU duplicado en mapping: "${sku}" (${n} veces)`,
      })
    }
  }

  return issues
}

/**
 * Valida cobertura CSV↔DB y que cada destino sea hoja V1 activa.
 * No escribe en DB.
 */
export function validateProductTaxonomyMigration(
  input: MappingValidationInput
): MappingValidationResult {
  const issues: MappingValidationIssue[] = [
    ...validateMappingRowsStructure(
      input.mappingRows,
      input.expectedProductCount
    ),
  ]

  const mappingSkus = new Set(
    input.mappingRows.filter((r) => r.sku.trim()).map((r) => r.sku)
  )
  const productBySku = new Map<string, ProductSnapshotRow[]>()
  for (const p of input.products) {
    const list = productBySku.get(p.sku) ?? []
    list.push(p)
    productBySku.set(p.sku, list)
  }

  if (
    input.expectedProductCount !== undefined &&
    input.products.length !== input.expectedProductCount
  ) {
    issues.push({
      code: 'DB_PRODUCT_COUNT',
      message: `DB tiene ${input.products.length} productos; esperado ${input.expectedProductCount}`,
    })
  }

  if (input.products.length !== input.mappingRows.length) {
    issues.push({
      code: 'COUNT_MISMATCH',
      message: `Cantidad distinta: mapping=${input.mappingRows.length}, DB=${input.products.length}`,
    })
  }

  for (const [sku, list] of productBySku) {
    if (list.length > 1) {
      issues.push({
        code: 'DB_DUPLICATE_SKU',
        message: `SKU duplicado en DB: "${sku}" (${list.length} productos)`,
      })
    }
  }

  for (const sku of mappingSkus) {
    if (!productBySku.has(sku)) {
      issues.push({
        code: 'SKU_MISSING_IN_DB',
        message: `SKU del mapping no existe en DB: "${sku}"`,
      })
    }
  }

  for (const sku of productBySku.keys()) {
    if (!mappingSkus.has(sku)) {
      issues.push({
        code: 'SKU_EXTRA_IN_DB',
        message: `Producto en DB sin fila en mapping: "${sku}"`,
      })
    }
  }

  const planned: PlannedChange[] = []
  const byDestinationSlug = new Map<string, number>()
  let productsOnV1Before = 0

  for (const p of input.products) {
    if (input.v1CategoryIds.has(p.categoryId)) {
      productsOnV1Before += 1
    }
  }

  for (const row of input.mappingRows) {
    if (!row.sku.trim() || !row.newCategorySlug) continue
    const products = productBySku.get(row.sku)
    if (!products || products.length !== 1) continue
    const product = products[0]

    const dest = input.categoriesBySlug.get(row.newCategorySlug)
    if (!dest) {
      issues.push({
        code: 'DEST_NOT_FOUND',
        message: `Destino inexistente: slug="${row.newCategorySlug}" (SKU=${row.sku})`,
      })
      continue
    }
    if (!dest.isActive) {
      issues.push({
        code: 'DEST_INACTIVE',
        message: `Destino inactivo: slug="${row.newCategorySlug}" (SKU=${row.sku})`,
      })
    }
    if (!dest.isTaxonomyV1) {
      issues.push({
        code: 'DEST_NOT_V1',
        message: `Destino no es nodo V1: slug="${row.newCategorySlug}" (SKU=${row.sku})`,
      })
    }
    if (dest.parentId === null) {
      issues.push({
        code: 'DEST_IS_ROOT',
        message: `Destino es categoría principal (no hoja): slug="${row.newCategorySlug}" (SKU=${row.sku})`,
      })
    }
    if (!dest.isLeaf) {
      issues.push({
        code: 'DEST_NOT_LEAF',
        message: `Destino no es hoja (tiene hijos): slug="${row.newCategorySlug}" (SKU=${row.sku})`,
      })
    }

    const alreadyAtTarget = product.categoryId === dest.id
    planned.push({
      sku: product.sku,
      productId: product.id,
      fromCategoryId: product.categoryId,
      fromCategorySlug: product.categorySlug,
      toCategoryId: dest.id,
      toCategorySlug: dest.slug,
      alreadyAtTarget,
    })
    byDestinationSlug.set(
      dest.slug,
      (byDestinationSlug.get(dest.slug) ?? 0) + 1
    )
  }

  // Primer apply: preferimos 0 productos ya en V1 (estado limpio).
  // Si ya están en destino correcto (re-run), no es error estructural —
  // solo se reporta. Abortamos ready solo si hay productos en V1 que NO
  // coinciden con el mapping destino (se evalúa en el script con planned).

  const uniqueDestinations = new Set(
    input.mappingRows.map((r) => r.newCategorySlug).filter(Boolean)
  ).size

  const changesNeeded = planned.filter((p) => !p.alreadyAtTarget).length
  const alreadyAtTarget = planned.filter((p) => p.alreadyAtTarget).length

  const blockingCodes = new Set([
    'MAPPING_ROW_COUNT',
    'EMPTY_SKU',
    'EMPTY_DESTINATION',
    'DUPLICATE_SKU',
    'DB_PRODUCT_COUNT',
    'COUNT_MISMATCH',
    'DB_DUPLICATE_SKU',
    'SKU_MISSING_IN_DB',
    'SKU_EXTRA_IN_DB',
    'DEST_NOT_FOUND',
    'DEST_INACTIVE',
    'DEST_NOT_V1',
    'DEST_IS_ROOT',
    'DEST_NOT_LEAF',
  ])

  const ok = !issues.some((i) => blockingCodes.has(i.code))

  return {
    ok,
    issues,
    mappingRowCount: input.mappingRows.length,
    uniqueSkus: mappingSkus.size,
    uniqueDestinations,
    dbProductCount: input.products.length,
    planned,
    changesNeeded,
    alreadyAtTarget,
    productsOnV1Before,
    byDestinationSlug,
  }
}

/** Counts por principal a partir de planned + mapa hoja→parentSlug. */
export function countPlannedByParent(
  planned: PlannedChange[],
  leafSlugToParentSlug: Map<string, string>
): Map<string, number> {
  const counts = new Map<string, number>()
  for (const p of planned) {
    const parent = leafSlugToParentSlug.get(p.toCategorySlug) ?? '(sin-padre)'
    counts.set(parent, (counts.get(parent) ?? 0) + 1)
  }
  return counts
}
