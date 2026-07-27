#!/usr/bin/env node
/**
 * Verificación rápida de seguridad de APIs de productos / catálogo.
 * Uso: node scripts/check-products-api-auth.mjs [baseUrl]
 * Default baseUrl: http://localhost:3000
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')

const FORBIDDEN = ['cost', 'costCurrency', 'netPrice', 'taxRate']

async function check(path, expectStatus, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = text
  }
  const okStatus = res.status === expectStatus
  const raw = typeof body === 'string' ? body : JSON.stringify(body)
  const leaks = (opts.forbidFields || []).filter((k) => {
    if (k === 'prices') {
      // catálogo no debe exponer array prices; price/priceLabel públicos sí
      return (
        /"prices"\s*:/.test(raw) ||
        (body &&
          Array.isArray(body.items) &&
          body.items.some((it) => it && 'prices' in it))
      )
    }
    return new RegExp(`"${k}"\\s*:`).test(raw)
  })
  const ok = okStatus && leaks.length === 0
  console.log(
    `${ok ? 'OK ' : 'FAIL'} ${path} → ${res.status} (esperaba ${expectStatus})${
      leaks.length ? ` LEAKS: ${leaks.join(',')}` : ''
    }`,
  )
  return ok
}

async function main() {
  const results = await Promise.all([
    check('/api/products', 401),
    check('/api/products/1', 401),
    check('/api/catalog/products', 200, {
      forbidFields: [...FORBIDDEN, 'prices'],
    }),
  ])
  const allOk = results.every(Boolean)
  if (!allOk) {
    console.error('\nFalló la verificación de seguridad.')
    process.exit(1)
  }
  console.log('\nVerificación OK.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
