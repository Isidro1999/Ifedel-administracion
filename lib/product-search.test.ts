import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  MAX_PRODUCT_SEARCH_TOKENS,
  foldAccents,
  tokenizeProductSearch,
} from './product-search'

describe('foldAccents', () => {
  it('quita diacríticos', () => {
    assert.equal(foldAccents('Electrificación'), 'Electrificacion')
    assert.equal(foldAccents('Gáll'), 'Gall')
  })
})

describe('tokenizeProductSearch', () => {
  it('normaliza Gallagher y variantes de mayúsculas', () => {
    assert.deepEqual(tokenizeProductSearch('Gallagher'), ['gallagher'])
    assert.deepEqual(tokenizeProductSearch('GALLAGHER'), ['gallagher'])
    assert.deepEqual(tokenizeProductSearch('gall'), ['gall'])
  })

  it('soporta multi-palabra en cualquier orden', () => {
    assert.deepEqual(tokenizeProductSearch('gall energ'), ['gall', 'energ'])
    assert.deepEqual(tokenizeProductSearch('energ gall'), ['energ', 'gall'])
  })

  it('colapsa espacios y aplica fold de acentos', () => {
    assert.deepEqual(tokenizeProductSearch('  gall   energ '), [
      'gall',
      'energ',
    ])
    assert.deepEqual(tokenizeProductSearch('  Gáll   Énerg  '), [
      'gall',
      'energ',
    ])
    assert.deepEqual(tokenizeProductSearch('electrificacion'), [
      'electrificacion',
    ])
    assert.deepEqual(tokenizeProductSearch('Electrificación'), [
      'electrificacion',
    ])
  })

  it('limita cantidad de tokens', () => {
    const q = Array.from({ length: 12 }, (_, i) => `t${i}`).join(' ')
    const tokens = tokenizeProductSearch(q)
    assert.equal(tokens.length, MAX_PRODUCT_SEARCH_TOKENS)
  })

  it('devuelve vacío si no hay texto útil', () => {
    assert.deepEqual(tokenizeProductSearch(''), [])
    assert.deepEqual(tokenizeProductSearch('   '), [])
  })
})
