import { describe, expect, it } from 'vitest'

import {
  digitsOnly,
  documentType,
  isValidCnpj,
  isValidCpf,
  isValidDocument,
} from './document'

describe('document', () => {
  it('strips non-digits', () => {
    expect(digitsOnly('12.345.678/0001-95')).toBe('12345678000195')
  })

  it('validates a known valid CPF', () => {
    // 529.982.247-25 is a commonly used valid CPF check-digit example
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('111.111.111-11')).toBe(false)
  })

  it('validates a known valid CNPJ', () => {
    // Receita Federal example pattern — 04.252.011/0001-10
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true)
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
  })

  it('detects document type', () => {
    expect(documentType('529.982.247-25')).toBe('cpf')
    expect(documentType('04.252.011/0001-10')).toBe('cnpj')
    expect(documentType('123')).toBe('invalid')
    expect(isValidDocument('04.252.011/0001-10')).toBe(true)
  })
})
