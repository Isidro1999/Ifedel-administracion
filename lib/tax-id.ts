/**
 * CUIT/CUIL argentino — normalización y formato visual.
 * Validación de formato (11 dígitos); sin verificador AFIP/ARCA.
 */

const TAX_ID_INPUT_RE = /^[\d\s-]+$/

/** Extrae solo dígitos del valor ingresado. */
export function normalizeTaxId(value: string): string {
  return value.replace(/\D/g, '')
}

/** Formato visual XX-XXXXXXXX-X; null si no hay 11 dígitos. */
export function formatTaxId(value: string | null | undefined): string | null {
  const digits = normalizeTaxId(value ?? '')
  if (digits.length !== 11) return null
  return `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`
}

/** Para UI admin/email: formatea o em dash si falta (consultas históricas). */
export function displayTaxId(value: string | null | undefined): string {
  return formatTaxId(value) ?? '—'
}

/** true si el input solo tiene dígitos/guiones/espacios y normaliza a 11 dígitos. */
export function isValidTaxIdInput(value: string): boolean {
  const trimmed = value.trim()
  if (!trimmed) return false
  if (!TAX_ID_INPUT_RE.test(trimmed)) return false
  return normalizeTaxId(trimmed).length === 11
}
