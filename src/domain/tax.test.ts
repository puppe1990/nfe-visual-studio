import { describe, expect, it } from 'vitest'

import { calculateTaxCents, lineTotalCents } from './tax'

describe('tax', () => {
  it('calculates line total', () => {
    expect(lineTotalCents(2, 1500)).toBe(3000)
    expect(lineTotalCents(0, 1500)).toBe(0)
    expect(lineTotalCents(1.5, 100)).toBe(150)
  })

  it('applies simples regime rate', () => {
    const r = calculateTaxCents({ subtotalCents: 10_000, taxRegime: 'simples' })
    expect(r.taxCents).toBe(600)
    expect(r.totalCents).toBe(10_600)
  })

  it('applies presumido regime rate', () => {
    const r = calculateTaxCents({
      subtotalCents: 10_000,
      taxRegime: 'presumido',
    })
    expect(r.taxCents).toBe(1_200)
    expect(r.totalCents).toBe(11_200)
  })
})
