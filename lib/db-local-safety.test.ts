import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  EXPECTED_SUPABASE_PROJECT_REF,
  assertLocalP1Database,
  assertScriptDatabaseAccess,
  classifyDatabaseUrl,
  formatDbTargetLog,
  parseProductionFlags,
  sanitizeDatabaseUrl,
} from './db-local-safety'

const LOCAL =
  'postgresql://postgres:postgres@localhost:5433/ifedel_p1'

const SUPABASE_POOLER = `postgresql://postgres.${EXPECTED_SUPABASE_PROJECT_REF}:super-secret-password@aws-1-sa-east-1.pooler.supabase.com:6543/postgres`

const SUPABASE_DIRECT = `postgresql://postgres:another-secret@db.${EXPECTED_SUPABASE_PROJECT_REF}.supabase.co:5432/postgres`

const UNKNOWN_HOST =
  'postgresql://u:p@db.otherproject.supabase.co:5432/postgres'

describe('classifyDatabaseUrl', () => {
  it('clasifica localhost como local', () => {
    const t = classifyDatabaseUrl(LOCAL)
    assert.equal(t.kind, 'local')
    assert.equal(t.host, 'localhost')
    assert.equal(t.port, '5433')
    assert.equal(t.database, 'ifedel_p1')
  })

  it('clasifica pooler IFEDEL como production-supabase', () => {
    const t = classifyDatabaseUrl(SUPABASE_POOLER)
    assert.equal(t.kind, 'production-supabase')
    assert.equal(t.projectRef, EXPECTED_SUPABASE_PROJECT_REF)
    assert.equal(t.host, 'aws-1-sa-east-1.pooler.supabase.com')
  })

  it('clasifica host directo IFEDEL como production-supabase', () => {
    const t = classifyDatabaseUrl(SUPABASE_DIRECT)
    assert.equal(t.kind, 'production-supabase')
    assert.equal(t.projectRef, EXPECTED_SUPABASE_PROJECT_REF)
  })

  it('host supabase de otro proyecto → unknown', () => {
    const t = classifyDatabaseUrl(UNKNOWN_HOST)
    assert.equal(t.kind, 'unknown')
  })

  it('otro localhost/db → unknown', () => {
    const t = classifyDatabaseUrl(
      'postgresql://postgres:postgres@localhost:5432/postgres'
    )
    assert.equal(t.kind, 'unknown')
  })
})

describe('assertLocalP1Database (compat)', () => {
  it('acepta localhost:5433/ifedel_p1', () => {
    const t = assertLocalP1Database(LOCAL)
    assert.equal(t.host, 'localhost')
    assert.equal(t.port, '5433')
    assert.equal(t.database, 'ifedel_p1')
  })

  it('aborta Supabase sin flag', () => {
    assert.throws(() => assertLocalP1Database(SUPABASE_POOLER), /ABORT/)
  })
})

describe('assertScriptDatabaseAccess', () => {
  it('localhost local-only OK', () => {
    const t = assertScriptDatabaseAccess(LOCAL, { mode: 'local-only' })
    assert.equal(t.kind, 'local')
  })

  it('Supabase sin --production → aborta', () => {
    assert.throws(
      () =>
        assertScriptDatabaseAccess(SUPABASE_POOLER, {
          mode: 'local-only',
        }),
      /ABORT/
    )
  })

  it('dry-run producción + --production → permitido', () => {
    const t = assertScriptDatabaseAccess(SUPABASE_POOLER, {
      mode: 'production-readonly',
      allowProduction: true,
    })
    assert.equal(t.kind, 'production-supabase')
  })

  it('apply producción sin confirm → aborta', () => {
    assert.throws(
      () =>
        assertScriptDatabaseAccess(SUPABASE_POOLER, {
          mode: 'production-write',
          allowProduction: true,
          confirmProduction: false,
        }),
      /confirm-production/
    )
  })

  it('apply producción con confirmaciones → pasa guardrail', () => {
    const t = assertScriptDatabaseAccess(SUPABASE_POOLER, {
      mode: 'production-write',
      allowProduction: true,
      confirmProduction: true,
    })
    assert.equal(t.kind, 'production-supabase')
  })

  it('unknown host → aborta', () => {
    assert.throws(
      () =>
        assertScriptDatabaseAccess(UNKNOWN_HOST, {
          mode: 'production-write',
          allowProduction: true,
          confirmProduction: true,
        }),
      /unknown/
    )
  })

  it('production-readonly sin allowProduction → aborta', () => {
    assert.throws(
      () =>
        assertScriptDatabaseAccess(SUPABASE_POOLER, {
          mode: 'production-readonly',
          allowProduction: false,
        }),
      /--production/
    )
  })
})

describe('sanitización', () => {
  it('sanitize / classify / format no filtran password', () => {
    const secret = 'super-secret-password'
    const t = classifyDatabaseUrl(SUPABASE_POOLER)
    const s = sanitizeDatabaseUrl(SUPABASE_POOLER)
    const log = formatDbTargetLog(t)
    assert.ok(!JSON.stringify(t).includes(secret))
    assert.ok(!JSON.stringify(s).includes(secret))
    assert.ok(!log.includes(secret))
    assert.ok(!log.includes('postgres.'))
    assert.match(log, /kind=production-supabase/)
    assert.match(log, /host=aws-1-sa-east-1\.pooler\.supabase\.com/)
  })

  it('sanitize local no expone password', () => {
    const t = sanitizeDatabaseUrl(
      'postgresql://user:secret@localhost:5433/ifedel_p1'
    )
    assert.equal(t.host, 'localhost')
    assert.ok(!JSON.stringify(t).includes('secret'))
  })
})

describe('parseProductionFlags', () => {
  it('parsea flags', () => {
    assert.deepEqual(parseProductionFlags(['--dry-run']), {
      production: false,
      confirmProduction: false,
    })
    assert.deepEqual(parseProductionFlags(['--dry-run', '--production']), {
      production: true,
      confirmProduction: false,
    })
    assert.deepEqual(
      parseProductionFlags([
        '--apply',
        '--production',
        '--confirm-production',
      ]),
      { production: true, confirmProduction: true }
    )
  })
})
