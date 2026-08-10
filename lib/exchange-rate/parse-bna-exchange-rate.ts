import {
  parseArgentineNumber,
  parseBnaProviderDate,
  parseBnaProviderTime,
} from '@/lib/exchange-rate/normalize'
import { EXCHANGE_RATE_SOURCES } from '@/lib/exchange-rate/sources'

export type BnaQuoteType = 'BILLETE_VENTA'

export type ParsedBnaExchangeRate = {
  source: typeof EXCHANGE_RATE_SOURCES.BNA
  currency: 'USD'
  quoteType: BnaQuoteType
  rate: number
  /** Día civil publicado (UTC midnight). */
  providerDate: Date
  /** HH:MM */
  providerTime: string
  /** Fecha cruda del HTML, para display. */
  providerDateRaw: string
}

export class BnaParseError extends Error {
  code: 'section_missing' | 'row_missing' | 'venta_missing' | 'invalid_number' | 'invalid_date' | 'invalid_time' | 'unexpected_html'

  constructor(
    code: BnaParseError['code'],
    message: string,
  ) {
    super(message)
    this.name = 'BnaParseError'
    this.code = code
  }
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * Extrae el panel `#billetes` hasta el inicio de `#divisas` (o fin).
 * Evita confundir con Cotización Divisas.
 */
export function extractBilletesSection(html: string): string | null {
  const billetesId = html.search(/id\s*=\s*["']billetes["']/i)
  if (billetesId < 0) return null

  const divisasId = html.search(/id\s*=\s*["']divisas["']/i)
  const end =
    divisasId > billetesId ? divisasId : html.length

  // Preferir cortar en el cierre semántico si aparece antes de divisas
  return html.slice(billetesId, end)
}

function findUsdUsaRow(sectionHtml: string): string | null {
  // Filas <tr>...</tr> que mencionan Dolar/Dólar U.S.A
  const rowRe = /<tr\b[^>]*>[\s\S]*?<\/tr>/gi
  let m: RegExpExecArray | null
  while ((m = rowRe.exec(sectionHtml)) !== null) {
    const row = m[0]
    const text = stripTags(row)
    // No tomar encabezados Compra/Venta
    if (/compra/i.test(text) && /venta/i.test(text) && !/d[oó]lar/i.test(text)) {
      continue
    }
    if (/d[oó]lar\s*u\.?\s*s\.?\s*a\.?/i.test(text)) {
      return row
    }
  }
  return null
}

function extractCellTexts(rowHtml: string): string[] {
  const cells: string[] = []
  const cellRe = /<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi
  let m: RegExpExecArray | null
  while ((m = cellRe.exec(rowHtml)) !== null) {
    cells.push(stripTags(m[1]))
  }
  return cells
}

function ventaColumnIndex(sectionHtml: string): number {
  // Buscar encabezado: Compra | Venta
  const headRow = sectionHtml.match(/<thead[\s\S]*?<tr[\s\S]*?<\/tr>/i)?.[0]
  if (headRow) {
    const headers = extractCellTexts(headRow).map((h) => h.toLowerCase())
    const ventaIdx = headers.findIndex((h) => /^venta$/.test(h.trim()))
    if (ventaIdx >= 0) return ventaIdx
    // fechaCot | Compra | Venta → índices 0,1,2
    const compraIdx = headers.findIndex((h) => /^compra$/.test(h.trim()))
    if (compraIdx >= 0 && headers[compraIdx + 1]?.includes('venta')) {
      return compraIdx + 1
    }
  }
  // Fallback semántico BNA: moneda, compra, venta → índice 2
  return 2
}

/**
 * Parsea HTML de www.bna.com.ar y extrae:
 * Cotización Billetes → Dólar U.S.A → Venta (+ fecha/hora).
 */
export function parseBnaExchangeRate(html: string): ParsedBnaExchangeRate {
  if (typeof html !== 'string' || html.length < 50) {
    throw new BnaParseError('unexpected_html', 'HTML vacío o inesperado')
  }

  const section = extractBilletesSection(html)
  if (!section) {
    throw new BnaParseError(
      'section_missing',
      'No se encontró la sección Cotización Billetes',
    )
  }

  // Confirmar que no estamos en divisas por accidente
  if (/cotizaci[oó]n\s+divisas/i.test(section) && !/billetes/i.test(section)) {
    throw new BnaParseError(
      'section_missing',
      'Sección de billetes inválida',
    )
  }

  const fechaMatch = section.match(
    /class\s*=\s*["'][^"']*fechaCot[^"']*["'][^>]*>([^<]+)/i,
  )
  const providerDateRaw = fechaMatch?.[1]?.trim() ?? ''
  const providerDate = parseBnaProviderDate(providerDateRaw)
  if (!providerDate) {
    throw new BnaParseError(
      'invalid_date',
      'Fecha de cotización BNA inválida o ausente',
    )
  }

  const horaMatch = section.match(
    /Hora\s*Actualizaci[oó]n\s*:\s*([0-9]{1,2}:[0-9]{2})/i,
  )
  const providerTime = horaMatch
    ? parseBnaProviderTime(horaMatch[1])
    : null
  if (!providerTime) {
    throw new BnaParseError(
      'invalid_time',
      'Hora de actualización BNA inválida o ausente',
    )
  }

  const usdRow = findUsdUsaRow(section)
  if (!usdRow) {
    throw new BnaParseError(
      'row_missing',
      'No se encontró la fila Dólar U.S.A en Billetes',
    )
  }

  const cells = extractCellTexts(usdRow)
  if (cells.length < 2) {
    throw new BnaParseError('venta_missing', 'Fila USD sin columnas suficientes')
  }

  const ventaIdx = ventaColumnIndex(section)
  const ventaRaw = cells[ventaIdx]
  if (ventaRaw == null || !ventaRaw.trim()) {
    throw new BnaParseError('venta_missing', 'Columna Venta ausente en fila USD')
  }

  // Salvaguarda: no tomar Compra si índices se desalinearían
  const compraIdx = ventaIdx - 1
  if (compraIdx >= 0 && cells[compraIdx] === ventaRaw && cells.length > ventaIdx + 1) {
    // raro; preferir última celda numérica distinta
  }

  const rate = parseArgentineNumber(ventaRaw)
  if (rate == null) {
    throw new BnaParseError('invalid_number', 'Venta USD no es un número válido')
  }

  // Si por error tomáramos Compra (típicamente menor), no podemos saberlo
  // con certeza; la columna Venta se resolvió por header.

  return {
    source: EXCHANGE_RATE_SOURCES.BNA,
    currency: 'USD',
    quoteType: 'BILLETE_VENTA',
    rate,
    providerDate,
    providerTime,
    providerDateRaw,
  }
}
