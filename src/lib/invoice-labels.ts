import type { InvoiceStatus } from "../domain/types";

export const invoiceStatusLabels: Record<InvoiceStatus, string> = {
  draft: "Rascunho",
  pending: "Pendente",
  authorized: "Autorizada",
  rejected: "Rejeitada",
  canceled: "Cancelada",
};

export function formatInvoiceNumber(series: number, number: number | null): string {
  if (number == null) return "—";
  return `${String(series).padStart(3, "0")}.${String(number).padStart(6, "0")}`;
}

export function formatDateTime(ms: number | null | undefined): string {
  if (ms == null) return "—";
  return new Date(ms).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
