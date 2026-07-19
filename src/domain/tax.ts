import type { TaxRegime } from './types'

/**
 * Cálculo de impostos simplificado (MVP).
 * Não substitui apuração fiscal real — apenas estimativa para totais da NF.
 */
export function calculateTaxCents(input: {
  subtotalCents: number
  taxRegime: TaxRegime
}): { taxCents: number; totalCents: number } {
  const subtotal = Math.max(0, Math.round(input.subtotalCents))
  let rate = 0

  switch (input.taxRegime) {
    case 'simples':
      // Aproximação DAS / ICMS embutido no MVP
      rate = 0.06
      break
    case 'presumido':
      rate = 0.12
      break
    case 'real':
      rate = 0.15
      break
    default:
      rate = 0.06
  }

  const taxCents = Math.round(subtotal * rate)
  return {
    taxCents,
    totalCents: subtotal + taxCents,
  }
}

export function lineTotalCents(
  quantity: number,
  unitPriceCents: number,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) return 0
  return Math.round(quantity * unitPriceCents)
}
