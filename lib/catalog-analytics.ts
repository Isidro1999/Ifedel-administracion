/**
 * Google Analytics 4 — solo catálogo público.
 * ID vía NEXT_PUBLIC_GA_MEASUREMENT_ID (nunca hardcodear).
 */

/** Measurement ID válido (G-…) o null si ausente/inválido. */
export function getCatalogGaMeasurementId(): string | null {
  const raw = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim()
  if (!raw) return null
  // Evita inyectar valores arbitrarios en <script>.
  if (!/^G-[A-Z0-9]+$/i.test(raw)) return null
  return raw
}
