/**
 * Rate limit in-memory por IP para POST /api/catalog/inquiries.
 *
 * Limitaciones (Vercel / serverless):
 * - El Map vive en el proceso Node de cada instancia.
 * - En cold starts o múltiples instancias el límite es best-effort,
 *   no global. Suficiente como primera capa junto a honeypot y
 *   validación estricta; no reemplaza un store compartido (Redis, etc.).
 */

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const WINDOW_MS = 15 * 60 * 1000 // 15 minutos
const MAX_REQUESTS = 8

/** Limpieza ocasional para no crecer sin límite en procesos longevos. */
const MAX_BUCKETS = 5_000

export type RateLimitResult =
  | { ok: true; remaining: number }
  | { ok: false; retryAfterSec: number }

export function checkInquiryRateLimit(ip: string): RateLimitResult {
  const key = ip.trim() || 'unknown'
  const now = Date.now()

  if (buckets.size > MAX_BUCKETS) {
    for (const [k, b] of buckets) {
      if (b.resetAt <= now) buckets.delete(k)
    }
  }

  const existing = buckets.get(key)
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { ok: true, remaining: MAX_REQUESTS - 1 }
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return { ok: true, remaining: MAX_REQUESTS - existing.count }
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first.slice(0, 80)
  }
  const realIp = request.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp.slice(0, 80)
  return 'unknown'
}
