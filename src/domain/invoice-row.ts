import type { Client } from '@libsql/client'

import { getCompany } from './companies'
import { calculateTaxCents } from './tax'
import type { Invoice, InvoiceItem, InvoiceStatus } from './types'

export function mapInvoiceItem(row: Record<string, unknown>): InvoiceItem {
  return {
    id: Number(row.id),
    invoiceId: Number(row.invoice_id),
    productId: row.product_id == null ? null : Number(row.product_id),
    description: String(row.description),
    ncm: row.ncm == null ? null : String(row.ncm),
    quantity: Number(row.quantity),
    unitPriceCents: Number(row.unit_price_cents),
    totalCents: Number(row.total_cents),
    createdAt: Number(row.created_at) * 1000,
  }
}

export function mapInvoice(row: Record<string, unknown>): Invoice {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    customerId: Number(row.customer_id),
    customerName:
      row.customer_name == null ? undefined : String(row.customer_name),
    number: row.number == null ? null : Number(row.number),
    series: Number(row.series),
    nature: String(row.nature),
    cfop: String(row.cfop),
    status: String(row.status) as InvoiceStatus,
    subtotalCents: Number(row.subtotal_cents),
    taxCents: Number(row.tax_cents),
    stCents: Number(row.st_cents ?? 0),
    totalCents: Number(row.total_cents),
    xmlContent: row.xml_content == null ? null : String(row.xml_content),
    rejectionReason:
      row.rejection_reason == null ? null : String(row.rejection_reason),
    sefazProtocol:
      row.sefaz_protocol == null ? null : String(row.sefaz_protocol),
    accessKey: row.access_key == null ? null : String(row.access_key),
    cancelProtocol:
      row.cancel_protocol == null ? null : String(row.cancel_protocol),
    cancelJustification:
      row.cancel_justification == null
        ? null
        : String(row.cancel_justification),
    canceledAt:
      row.canceled_at == null ? null : Number(row.canceled_at) * 1000,
    issuedAt: row.issued_at == null ? null : Number(row.issued_at) * 1000,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  }
}

export async function loadInvoiceItems(
  client: Client,
  invoiceId: number,
): Promise<InvoiceItem[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
    args: [invoiceId],
  })
  return result.rows.map((r) =>
    mapInvoiceItem(r as unknown as Record<string, unknown>),
  )
}

export async function recomputeInvoiceTotals(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<void> {
  const company = await getCompany(client, companyId)
  if (!company.ok) return

  const items = await loadInvoiceItems(client, invoiceId)
  const subtotalCents = items.reduce((s, i) => s + i.totalCents, 0)
  const { taxCents, stCents, totalCents } = calculateTaxCents({
    subtotalCents,
    taxRegime: company.data.company.taxRegime,
  })

  await client.execute({
    sql: `UPDATE invoices SET
            subtotal_cents = ?, tax_cents = ?, st_cents = ?, total_cents = ?,
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [subtotalCents, taxCents, stCents, totalCents, invoiceId, companyId],
  })
}

export async function addInvoiceEvent(
  client: Client,
  invoiceId: number,
  eventType: string,
  message?: string,
): Promise<void> {
  await client.execute({
    sql: `INSERT INTO invoice_events (invoice_id, event_type, message)
          VALUES (?, ?, ?)`,
    args: [invoiceId, eventType, message ?? null],
  })
}
