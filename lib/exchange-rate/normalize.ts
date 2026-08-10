/**
 * Normalización de montos publicados por BNA (formato argentino).
 * Acepta: "1520,00" | "1.520,00" | "1.520" | "1520"
 */

export function parseArgentineNumber(raw: string): number | null {
  if (typeof raw !== 'string') return null
  let s = raw.trim().replace(/\u00a0/g, ' ').replace(/\s+/g, '')
  if (!s) return null

  // Quitar símbolos de moneda u otros no numéricos (conservar dígitos, . , -)
  s = s.replace(/[^\d.,-]/g, '')
  if (!s || s === '-' || s === '.' || s === ',') return null

  const hasComma = s.includes(',')
  const hasDot = s.includes('.')

  if (hasComma && hasDot) {
    // 1.520,00 → miles con punto, decimal con coma
    if (!/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(s) && !/^\d+,\d+$/.test(s.replace(/\./g, ''))) {
      // Ambiguo si el patrón no es clásico AR; aún así: quitar puntos de miles
      const lastComma = s.lastIndexOf(',')
      const lastDot = s.lastIndexOf('.')
      if (lastComma > lastDot) {
        s = s.replace(/\./g, '').replace(',', '.')
      } else {
        // Decimal con punto y coma como miles (poco habitual en BNA)
        s = s.replace(/,/g, '')
      }
    } else {
      s = s.replace(/\./g, '').replace(',', '.')
    }
  } else if (hasComma) {
    // 1520,00 o 1520,5
    if (!/^\d+(,\d+)?$/.test(s)) return null
    s = s.replace(',', '.')
  } else if (hasDot) {
    // 1.520 (miles) o 1520.00 (decimal anglosajón)
    if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
      s = s.replace(/\./g, '')
    } else if (/^\d+\.\d+$/.test(s)) {
      // dejar como decimal
    } else {
      return null
    }
  } else if (!/^\d+$/.test(s)) {
    return null
  }

  const n = Number(s)
  if (!Number.isFinite(n) || n <= 0) return null
  return n
}

/** Parsea fecha BNA tipo "10/8/2026" → Date UTC a medianoche de ese día civil. */
export function parseBnaProviderDate(raw: string): Date | null {
  const m = raw.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return null
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (
    !Number.isInteger(day) ||
    !Number.isInteger(month) ||
    !Number.isInteger(year) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    year < 2000 ||
    year > 2100
  ) {
    return null
  }
  const dt = new Date(Date.UTC(year, month - 1, day))
  if (
    dt.getUTCFullYear() !== year ||
    dt.getUTCMonth() !== month - 1 ||
    dt.getUTCDate() !== day
  ) {
    return null
  }
  return dt
}

/** Valida hora "H:MM" o "HH:MM". */
export function parseBnaProviderTime(raw: string): string | null {
  const m = raw.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h < 0 || h > 23 || min < 0 || min > 59) return null
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

/** Día civil actual en Argentina (YYYY-MM-DD). */
export function todayDateKeyInArgentina(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Argentina/Buenos_Aires',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now)
}

/** Clave YYYY-MM-DD de un Date guardado como medianoche UTC del día civil. */
export function dateKeyFromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}
