import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { parseArgentineNumber } from './normalize'
import {
  extractBilletesSection,
  parseBnaExchangeRate,
  BnaParseError,
} from './parse-bna-exchange-rate'

const fixturePath = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__',
  'bna-home-snippet.html',
)

function loadFixture(): string {
  return readFileSync(fixturePath, 'utf8')
}

describe('parseArgentineNumber', () => {
  it('parsea 1520,00', () => {
    assert.equal(parseArgentineNumber('1520,00'), 1520)
  })

  it('parsea 1.520,00', () => {
    assert.equal(parseArgentineNumber('1.520,00'), 1520)
  })

  it('parsea 1.520', () => {
    assert.equal(parseArgentineNumber('1.520'), 1520)
  })

  it('rechaza vacío', () => {
    assert.equal(parseArgentineNumber(''), null)
  })

  it('rechaza texto inválido', () => {
    assert.equal(parseArgentineNumber('abc'), null)
  })
})

describe('parseBnaExchangeRate', () => {
  it('extrae sección billetes y no divisas', () => {
    const html = loadFixture()
    const section = extractBilletesSection(html)
    assert.ok(section)
    assert.match(section!, /Dolar U\.S\.A/i)
    assert.ok(!/Libra Esterlina/i.test(section!))
  })

  it('encuentra Cotización Billetes / Dólar U.S.A / Venta', () => {
    const parsed = parseBnaExchangeRate(loadFixture())
    assert.equal(parsed.source, 'BNA')
    assert.equal(parsed.currency, 'USD')
    assert.equal(parsed.quoteType, 'BILLETE_VENTA')
    assert.equal(parsed.rate, 1520)
    assert.equal(parsed.providerTime, '15:02')
    assert.equal(parsed.providerDate.toISOString().slice(0, 10), '2026-08-10')
  })

  it('no toma Compra (1470)', () => {
    const parsed = parseBnaExchangeRate(loadFixture())
    assert.notEqual(parsed.rate, 1470)
  })

  it('no confunde con Divisas (1495.5000)', () => {
    const html = loadFixture()
    // Incluir divisas en el mismo documento envolviendo como home mínima
    const wrapped = `<html><body>${html}</body></html>`
    const parsed = parseBnaExchangeRate(wrapped)
    assert.equal(parsed.rate, 1520)
    assert.notEqual(parsed.rate, 1495.5)
  })

  it('acepta 1.520,00 en Venta', () => {
    const html = loadFixture().replace('1520,00', '1.520,00')
    const parsed = parseBnaExchangeRate(html)
    assert.equal(parsed.rate, 1520)
  })

  it('falla si falta fila USD', () => {
    const html = loadFixture().replace(/Dolar U\.S\.A/g, 'Yen Japonés')
    assert.throws(
      () => parseBnaExchangeRate(html),
      (err: unknown) =>
        err instanceof BnaParseError && err.code === 'row_missing',
    )
  })

  it('falla si falta Venta', () => {
    const html = loadFixture().replace(
      /<td class="tit">Dolar U\.S\.A<\/td>\s*<td>1470,00<\/td>\s*<td>1520,00<\/td>/,
      '<td class="tit">Dolar U.S.A</td><td>1470,00</td><td></td>',
    )
    assert.throws(
      () => parseBnaExchangeRate(html),
      (err: unknown) =>
        err instanceof BnaParseError &&
        (err.code === 'venta_missing' || err.code === 'invalid_number'),
    )
  })

  it('falla con número inválido', () => {
    const html = loadFixture().replace('1520,00', 'N/D')
    assert.throws(
      () => parseBnaExchangeRate(html),
      (err: unknown) =>
        err instanceof BnaParseError && err.code === 'invalid_number',
    )
  })

  it('falla con HTML inesperado', () => {
    assert.throws(
      () => parseBnaExchangeRate('<html></html>'),
      (err: unknown) =>
        err instanceof BnaParseError &&
        (err.code === 'section_missing' || err.code === 'unexpected_html'),
    )
  })

  it('falla sin sección billetes', () => {
    assert.throws(
      () =>
        parseBnaExchangeRate(
          '<div id="divisas"><table><tr><td class="tit">Dolar U.S.A</td><td>1</td><td>2</td></tr></table></div>',
        ),
      (err: unknown) =>
        err instanceof BnaParseError && err.code === 'section_missing',
    )
  })
})
