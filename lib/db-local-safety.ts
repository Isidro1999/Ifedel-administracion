/**
 * Guardrails de DB para scripts de taxonomía (P1/P2).
 *
 * Default seguro: solo localhost:5433/ifedel_p1.
 * Producción Supabase: requiere flags explícitos (--production / --confirm-production).
 *
 * Nunca loguear passwords. Usar formatDbTargetLog().
 */

/** Ref del proyecto Supabase IFEDEL (sin secretos). */
export const EXPECTED_SUPABASE_PROJECT_REF = 'excdkdcapxnufxnobpgc'

export type DbTargetKind = 'local' | 'production-supabase' | 'unknown'

export type ClassifiedDbTarget = {
  host: string
  port: string
  database: string
  kind: DbTargetKind
  /** Presente si se detectó el ref en la URL (user/host/path), sin credenciales. */
  projectRef: string | null
  rawUrlPresent: boolean
}

/** @deprecated Preferí ClassifiedDbTarget; se mantiene por compat tests. */
export type SanitizedDbTarget = {
  host: string
  port: string
  database: string
  rawUrlPresent: boolean
}

export function sanitizeDatabaseUrl(url: string | undefined): SanitizedDbTarget {
  const c = classifyDatabaseUrl(url)
  return {
    host: c.host,
    port: c.port,
    database: c.database,
    rawUrlPresent: c.rawUrlPresent,
  }
}

export function formatDbTargetLog(target: ClassifiedDbTarget | SanitizedDbTarget): string {
  const kind = 'kind' in target ? target.kind : 'n/a'
  const ref =
    'projectRef' in target && target.projectRef
      ? ` projectRef=${target.projectRef}`
      : ''
  return `host=${target.host} port=${target.port} database=${target.database} kind=${kind}${ref}`
}

/**
 * Clasifica DATABASE_URL sin exponer credenciales.
 * production-supabase solo si es el proyecto IFEDEL esperado.
 */
export function classifyDatabaseUrl(url: string | undefined): ClassifiedDbTarget {
  if (!url) {
    return {
      host: '',
      port: '',
      database: '',
      kind: 'unknown',
      projectRef: null,
      rawUrlPresent: false,
    }
  }

  let host = ''
  let port = ''
  let database = ''
  let username = ''
  try {
    const u = new URL(url)
    host = u.hostname
    port = u.port || (u.protocol.startsWith('postgres') ? '5432' : '')
    database = u.pathname.replace(/^\//, '') || ''
    username = decodeURIComponent(u.username || '')
  } catch {
    return {
      host: '',
      port: '',
      database: '',
      kind: 'unknown',
      projectRef: null,
      rawUrlPresent: true,
    }
  }

  const lowerHost = host.toLowerCase()
  const haystack = `${lowerHost} ${username} ${database}`.toLowerCase()
  const hasExpectedRef = haystack.includes(EXPECTED_SUPABASE_PROJECT_REF)
  const looksSupabase =
    lowerHost.includes('supabase.co') ||
    lowerHost.includes('supabase.com') ||
    lowerHost.includes('pooler.supabase.com')

  if (lowerHost === 'localhost' && port === '5433' && database === 'ifedel_p1') {
    return {
      host,
      port,
      database,
      kind: 'local',
      projectRef: null,
      rawUrlPresent: true,
    }
  }

  if (looksSupabase && hasExpectedRef) {
    return {
      host,
      port,
      database: database || 'postgres',
      kind: 'production-supabase',
      projectRef: EXPECTED_SUPABASE_PROJECT_REF,
      rawUrlPresent: true,
    }
  }

  return {
    host,
    port,
    database,
    kind: 'unknown',
    projectRef: hasExpectedRef ? EXPECTED_SUPABASE_PROJECT_REF : null,
    rawUrlPresent: true,
  }
}

export type ScriptDbAccessMode =
  | 'local-only'
  | 'production-readonly'
  | 'production-write'

/**
 * Autoriza el acceso según el modo del script.
 *
 * - local-only: solo localhost (default histórico)
 * - production-readonly: local OK; Supabase IFEDEL OK si allowProduction
 * - production-write: local OK; Supabase IFEDEL OK si allowProduction && confirmProduction
 */
export function assertScriptDatabaseAccess(
  url: string | undefined,
  options: {
    mode: ScriptDbAccessMode
    allowProduction?: boolean
    confirmProduction?: boolean
  }
): ClassifiedDbTarget {
  const target = classifyDatabaseUrl(url)

  if (!target.rawUrlPresent || !url) {
    throw new Error('ABORT: DATABASE_URL no definida')
  }

  if (target.kind === 'unknown') {
    throw new Error(
      `ABORT: target unknown (${formatDbTargetLog(target)}). Solo localhost:5433/ifedel_p1 o Supabase proyecto ${EXPECTED_SUPABASE_PROJECT_REF} con flags explícitos.`
    )
  }

  if (target.kind === 'local') {
    if (!url.includes('localhost:5433')) {
      throw new Error('ABORT: DATABASE_URL local no contiene localhost:5433')
    }
    return target
  }

  // production-supabase
  if (options.mode === 'local-only') {
    throw new Error(
      `ABORT: DATABASE_URL apunta a producción Supabase (${formatDbTargetLog(target)}). ` +
        `Para dry-run/check usá --production. Para escritura usá --production --confirm-production.`
    )
  }

  if (!options.allowProduction) {
    throw new Error(
      `ABORT: falta --production para usar Supabase (${formatDbTargetLog(target)}).`
    )
  }

  if (options.mode === 'production-write' && !options.confirmProduction) {
    throw new Error(
      `ABORT: escritura en producción requiere --production --confirm-production ` +
        `(${formatDbTargetLog(target)}).`
    )
  }

  return target
}

/**
 * Compat: solo localhost (comportamiento P1.5/P2 local).
 */
export function assertLocalP1Database(
  url: string | undefined,
  _options: { expectedHost?: string; expectedPort?: string; expectedDb?: string } = {}
): SanitizedDbTarget {
  const target = assertScriptDatabaseAccess(url, { mode: 'local-only' })
  return {
    host: target.host,
    port: target.port,
    database: target.database,
    rawUrlPresent: target.rawUrlPresent,
  }
}

/** Parseo compartido de flags de entorno DB en CLIs. */
export function parseProductionFlags(argv: string[]): {
  production: boolean
  confirmProduction: boolean
} {
  let production = false
  let confirmProduction = false
  for (const a of argv) {
    if (a === '--production') production = true
    if (a === '--confirm-production') confirmProduction = true
  }
  return { production, confirmProduction }
}

/**
 * Transaction pooler de Supabase (PgBouncer transaction mode, :6543) no soporta
 * interactive transactions de Prisma de forma fiable → P2028.
 */
export function isTransactionPoolerUrl(url: string | undefined): boolean {
  if (!url) return false
  try {
    const u = new URL(url)
    return u.port === '6543'
  } catch {
    return false
  }
}

export type ApplyWriteDatasource = {
  url: string
  target: ClassifiedDbTarget
  envKey: 'DIRECT_URL' | 'DATABASE_URL'
}

/**
 * Resuelve la URL del PrismaClient de escritura del apply P2.
 *
 * - Producción: exige DIRECT_URL (no transaction pooler :6543), proyecto IFEDEL.
 * - Local: DATABASE_URL (localhost:5433/ifedel_p1).
 */
export function resolveApplyWriteDatasourceUrl(input: {
  isProduction: boolean
  databaseUrl: string | undefined
  directUrl: string | undefined
}): ApplyWriteDatasource {
  if (input.isProduction) {
    if (!input.directUrl) {
      throw new Error(
        'ABORT: apply en producción requiere DIRECT_URL (session/direct :5432), no el transaction pooler.'
      )
    }
    if (isTransactionPoolerUrl(input.directUrl)) {
      throw new Error(
        `ABORT: DIRECT_URL parece transaction pooler (:6543). ` +
          `Usá la URL directa/session :5432 (${formatDbTargetLog(classifyDatabaseUrl(input.directUrl))}).`
      )
    }
    const target = classifyDatabaseUrl(input.directUrl)
    if (target.kind !== 'production-supabase') {
      throw new Error(
        `ABORT: DIRECT_URL no corresponde al Supabase esperado ` +
          `(${formatDbTargetLog(target)}). Proyecto requerido: ${EXPECTED_SUPABASE_PROJECT_REF}.`
      )
    }
    // Re-validar flags de escritura sobre DIRECT_URL
    assertScriptDatabaseAccess(input.directUrl, {
      mode: 'production-write',
      allowProduction: true,
      confirmProduction: true,
    })
    return { url: input.directUrl, target, envKey: 'DIRECT_URL' }
  }

  if (!input.databaseUrl) {
    throw new Error('ABORT: DATABASE_URL no definida para apply local')
  }
  const target = assertScriptDatabaseAccess(input.databaseUrl, {
    mode: 'local-only',
  })
  return { url: input.databaseUrl, target, envKey: 'DATABASE_URL' }
}
