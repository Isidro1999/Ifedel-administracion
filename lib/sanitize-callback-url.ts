/**
 * Evita bucles: nunca usar /login como destino post-login ni en callbackUrl.
 */
export function sanitizeCallbackUrl(raw: string | null | undefined): string {
  if (raw == null || raw === '') return '/'
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    decoded = raw
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return '/'
  if (decoded === '/login') return '/'
  if (decoded.startsWith('/login?') || decoded.startsWith('/login/')) return '/'
  return decoded
}
