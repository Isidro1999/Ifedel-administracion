import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  displayTaxId,
  formatTaxId,
  isValidTaxIdInput,
  normalizeTaxId,
} from './tax-id'

describe('normalizeTaxId', () => {
  it('elimina guiones y espacios', () => {
    assert.equal(normalizeTaxId('20-12345678-3'), '20123456783')
    assert.equal(normalizeTaxId(' 27 12345678 4 '), '27123456784')
  })
})

describe('formatTaxId', () => {
  it('formatea 11 dígitos', () => {
    assert.equal(formatTaxId('20123456783'), '20-12345678-3')
    assert.equal(formatTaxId('20-12345678-3'), '20-12345678-3')
  })

  it('devuelve null si no hay 11 dígitos', () => {
    assert.equal(formatTaxId('123'), null)
    assert.equal(formatTaxId(null), null)
  })
})

describe('displayTaxId', () => {
  it('muestra em dash para históricos sin taxId', () => {
    assert.equal(displayTaxId(null), '—')
    assert.equal(displayTaxId(''), '—')
  })
})

describe('isValidTaxIdInput', () => {
  it('acepta formatos válidos', () => {
    assert.equal(isValidTaxIdInput('20123456783'), true)
    assert.equal(isValidTaxIdInput('20-12345678-3'), true)
    assert.equal(isValidTaxIdInput('27-12345678-4'), true)
    assert.equal(isValidTaxIdInput('30-12345678-7'), true)
  })

  it('rechaza inválidos', () => {
    assert.equal(isValidTaxIdInput(''), false)
    assert.equal(isValidTaxIdInput('123'), false)
    assert.equal(isValidTaxIdInput('201234567890'), false)
    assert.equal(isValidTaxIdInput('20-ABC-5678'), false)
  })
})
