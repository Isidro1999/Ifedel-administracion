/**
 * Guardrails para scripts que solo deben correr contra Postgres local P1.
 */

export type SanitizedDbTarget = {
  host: string
  port: string
  database: string
  rawUrlPresent: boolean
}

export function sanitizeDatabaseUrl(url: string | undefined): SanitizedDbTarget {
  if (!url) {
    return { host: '', port: '', database: '', rawUrlPresent: false }
  }
  try {
    const u = new URL(url)
    return {
      host: u.hostname,
      port: u.port || (u.protocol === 'postgresql:' ? '5432' : ''),
      database: u.pathname.replace(/^\//, '') || '',
      rawUrlPresent: true,
    }
  } catch {
    return { host: '', port: '', database: '', rawUrlPresent: true }
  }
}

export function assertLocalP1Database(
  url: string | undefined,
  options: { expectedHost?: string; expectedPort?: string; expectedDb?: string } = {}
): SanitizedDbTarget {
  const expectedHost = options.expectedHost ?? 'localhost'
  const expectedPort = options.expectedPort ?? '5433'
  const expectedDb = options.expectedDb ?? 'ifedel_p1'

  const target = sanitizeDatabaseUrl(url)
  const lowerHost = target.host.toLowerCase()

  if (!target.rawUrlPresent || !url) {
    throw new Error('ABORT: DATABASE_URL no definida')
  }
  if (
    lowerHost.includes('supabase') ||
    lowerHost.includes('pooler.supabase.com') ||
    target.port === '6543'
  ) {
    throw new Error(
      `ABORT: DATABASE_URL apunta a Supabase/pooler (${target.host}:${target.port}). Solo localhost permitido.`
    )
  }
  if (target.host !== expectedHost) {
    throw new Error(
      `ABORT: host=${target.host} (esperado ${expectedHost})`
    )
  }
  if (target.port !== expectedPort) {
    throw new Error(
      `ABORT: port=${target.port} (esperado ${expectedPort})`
    )
  }
  if (expectedDb && target.database !== expectedDb) {
    throw new Error(
      `ABORT: database=${target.database} (esperado ${expectedDb})`
    )
  }
  if (!url.includes('localhost:5433')) {
    throw new Error('ABORT: DATABASE_URL no contiene localhost:5433')
  }

  return target
}
