import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient
}

/**
 * Con Supabase Transaction pooler (:6543) Prisma necesita `pgbouncer=true`
 * para desactivar prepared statements. Sin eso aparece:
 *   prepared statement "sN" does not exist (26000)
 */
function normalizeDatabaseUrl(url: string | undefined): string | undefined {
  if (!url || url.startsWith('file:')) return url
  try {
    const u = new URL(url)
    const isPooler =
      u.hostname.includes('pooler.supabase.com') || u.port === '6543'
    if (isPooler) {
      if (!u.searchParams.has('pgbouncer')) {
        u.searchParams.set('pgbouncer', 'true')
      }
      if (!u.searchParams.has('connection_limit')) {
        u.searchParams.set('connection_limit', '1')
      }
    }
    return u.toString()
  } catch {
    return url
  }
}

const datasourceUrl = normalizeDatabaseUrl(process.env.DATABASE_URL)

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['error', 'warn']
        : ['error'],
    ...(datasourceUrl
      ? { datasources: { db: { url: datasourceUrl } } }
      : {}),
  })

globalForPrisma.prisma = prisma
