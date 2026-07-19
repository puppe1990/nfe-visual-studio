import type { TaxRegime } from "./types";

/**
 * Cálculo de impostos + ST opcional.
 * Não substitui apuração fiscal real — estimativa para totais da NF.
 */
export function calculateTaxCents(input: {
  subtotalCents: number;
  taxRegime: TaxRegime;
  hasSt?: boolean;
  /** Alíquota ST adicional (default 0.18 quando hasSt). */
  stRate?: number;
}): { taxCents: number; stCents: number; totalCents: number } {
  const subtotal = Math.max(0, Math.round(input.subtotalCents));
  let rate = 0;

  switch (input.taxRegime) {
    case "simples":
      rate = 0.06;
      break;
    case "presumido":
      rate = 0.12;
      break;
    case "real":
      rate = 0.15;
      break;
    default:
      rate = 0.06;
  }

  const taxCents = Math.round(subtotal * rate);
  const stRate = input.hasSt ? (input.stRate ?? 0.18) : 0;
  const stCents = Math.round(subtotal * stRate);
  return {
    taxCents,
    stCents,
    totalCents: subtotal + taxCents + stCents,
  };
}

export function lineTotalCents(
  quantity: number,
  unitPriceCents: number,
): number {
  if (!Number.isFinite(quantity) || quantity <= 0) return 0;
  if (!Number.isFinite(unitPriceCents) || unitPriceCents < 0) return 0;
  return Math.round(quantity * unitPriceCents);
}
