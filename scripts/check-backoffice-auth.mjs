#!/usr/bin/env node
/**
 * Verificación de auth server-side del backoffice IFEDEL.
 * Uso: node scripts/check-backoffice-auth.mjs [baseUrl]
 * Default: http://localhost:3000
 *
 * Sin cookies de sesión: APIs internas 401/403; catálogo 200;
 * páginas privadas redirigen a /login (o /pending).
 */
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '')

let failed = 0

function ok(msg) {
  console.log(`OK  ${msg}`)
}
function fail(msg) {
  failed += 1
  console.error(`FAIL ${msg}`)
}

async function checkApi(path, expectStatus) {
  const res = await fetch(`${base}${path}`, {
    headers: { Accept: 'application/json' },
    redirect: 'manual',
  })
  if (res.status === expectStatus) {
    ok(`${path} → ${res.status}`)
  } else {
    fail(`${path} → ${res.status} (esperaba ${expectStatus})`)
  }
  return res
}

async function checkPageRedirectsToLogin(path) {
  const res = await fetch(`${base}${path}`, {
    redirect: 'manual',
    headers: { Accept: 'text/html' },
  })
  const loc = res.headers.get('location') || ''
  const body = await res.text()
  const toLoginHeader =
    (res.status === 307 || res.status === 302 || res.status === 303) &&
    (loc.includes('/login') || loc.endsWith('/login'))
  // App Router a menudo responde 200 con NEXT_REDIRECT /login en el flight,
  // sin filtrar datos privados en el HTML.
  const toLoginBody =
    res.status === 200 &&
    (body.includes('NEXT_REDIRECT') || body.includes('/login')) &&
    !/"quoteNumber"/.test(body) &&
    !body.includes('Cotizaciones guardadas') &&
    !body.includes('Cuentas por cobrar') &&
    !body.includes('Panel general')
  // /products es client: no hay Prisma en HTML; exigir no filtrar costos y sí login/redir
  const productsOk =
    path.startsWith('/products') &&
    res.status === 200 &&
    (body.includes('/login') || body.includes('Redirigiendo') || body.includes('NEXT_REDIRECT')) &&
    !/"cost"\s*:/.test(body)

  if (toLoginHeader || toLoginBody || productsOk) {
    ok(`${path} → ${res.status} (bloqueado sin sesión)`)
  } else {
    fail(
      `${path} → ${res.status} Location=${loc || '(none)'} (esperaba redirect/bloqueo a /login)`,
    )
  }
}

async function checkCatalogPublic() {
  const res = await fetch(`${base}/api/catalog/products`, {
    headers: { Accept: 'application/json' },
  })
  const text = await res.text()
  let body
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const leaks = ['cost', 'costCurrency', '"prices"', 'netPrice', 'taxRate'].filter(
    (k) => (k.startsWith('"') ? text.includes(k) : new RegExp(`"${k}"\\s*:`).test(text)),
  )
  if (res.status === 200 && leaks.length === 0 && body && Array.isArray(body.items)) {
    ok(`/api/catalog/products → 200 sin campos sensibles`)
  } else {
    fail(
      `/api/catalog/products → ${res.status} leaks=${leaks.join(',') || 'none'} items=${
        body && Array.isArray(body.items) ? 'yes' : 'no'
      }`,
    )
  }

  const page = await fetch(`${base}/catalogo/productos`, {
    redirect: 'manual',
    headers: { Accept: 'text/html' },
  })
  // Público: 200 (o rewrite). No debe ir a /login.
  const loc = page.headers.get('location') || ''
  if (page.status === 200 || (page.status >= 300 && page.status < 400 && !loc.includes('/login'))) {
    ok(`/catalogo/productos → ${page.status} (público)`)
  } else {
    fail(`/catalogo/productos → ${page.status} Location=${loc}`)
  }
}

async function main() {
  console.log(`Base: ${base}\n`)

  await checkApi('/api/products', 401)
  await checkApi('/api/products/1', 401)
  // GET /api/quotes no existe (solo POST).
  {
    const res = await fetch(`${base}/api/quotes`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    })
    if (res.status === 401 || res.status === 403) {
      ok(`POST /api/quotes → ${res.status}`)
    } else {
      fail(`POST /api/quotes → ${res.status} (esperaba 401/403)`)
    }
  }
  {
    const res = await fetch(`${base}/api/purchases`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: '{}',
      redirect: 'manual',
    })
    if (res.status === 401 || res.status === 403) {
      ok(`POST /api/purchases → ${res.status}`)
    } else {
      fail(`POST /api/purchases → ${res.status} (esperaba 401/403)`)
    }
  }
  await checkApi('/api/payment-terms', 401)
  await checkApi('/api/settings/exchange-rate', 401)

  await checkCatalogPublic()

  await checkPageRedirectsToLogin('/products')
  await checkPageRedirectsToLogin('/quotes')
  await checkPageRedirectsToLogin('/analytics/period')
  await checkPageRedirectsToLogin('/cash')
  await checkPageRedirectsToLogin('/finance')
  await checkPageRedirectsToLogin('/admin/users')

  if (failed > 0) {
    console.error(`\n${failed} verificación(es) fallaron.`)
    process.exit(1)
  }
  console.log('\nVerificación OK.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
