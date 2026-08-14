import type { Client } from '@libsql/client'

import { companyExists } from './companies'
import { loadInvoiceItems, mapInvoice } from './invoice-row'
import type { Invoice, InvoiceStatus, ServiceResult } from './types'

export async function getInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ invoice: Invoice }>> {
  const result = await client.execute({
    sql: `SELECT i.*, c.name AS customer_name
          FROM invoices i
          JOIN customers c ON c.id = i.customer_id
          WHERE i.id = ? AND i.company_id = ?`,
    args: [invoiceId, companyId],
  })
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Nota não encontrada' },
    }
  }
  const invoice = mapInvoice(
    result.rows[0] as unknown as Record<string, unknown>,
  )
  invoice.items = await loadInvoiceItems(client, invoiceId)
  return { ok: true, data: { invoice } }
}

export async function listInvoices(
  client: Client,
  companyId: number,
  options?: { status?: InvoiceStatus | 'all' },
): Promise<ServiceResult<{ invoices: Invoice[] }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const status = options?.status ?? 'all'
  const result =
    status === 'all'
      ? await client.execute({
          sql: `SELECT i.*, c.name AS customer_name
                FROM invoices i
                JOIN customers c ON c.id = i.customer_id
                WHERE i.company_id = ?
                ORDER BY i.id DESC`,
          args: [companyId],
        })
      : await client.execute({
          sql: `SELECT i.*, c.name AS customer_name
                FROM invoices i
                JOIN customers c ON c.id = i.customer_id
                WHERE i.company_id = ? AND i.status = ?
                ORDER BY i.id DESC`,
          args: [companyId, status],
        })

  return {
    ok: true,
    data: {
      invoices: result.rows.map((r) =>
        mapInvoice(r as unknown as Record<string, unknown>),
      ),
    },
  }
}
