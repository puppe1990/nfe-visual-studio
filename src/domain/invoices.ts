import type { Client } from '@libsql/client'

import { companyExists, getCompany } from './companies'
import { getCustomer } from './customers'
import { addInvoiceEvent, recomputeInvoiceTotals } from './invoice-row'
import { getInvoice } from './invoice-read'
import { lineTotalCents } from './tax'
import type { Invoice, InvoiceStatus, ServiceResult } from './types'

export type DraftItemInput = {
  productId?: number | null
  description?: string
  ncm?: string | null
  quantity?: number
  unitPriceCents?: number
}

export async function createInvoiceDraft(
  client: Client,
  companyId: number,
  payload: {
    customerId?: number
    nature?: string
    cfop?: string
    items?: DraftItemInput[]
  },
): Promise<ServiceResult<{ invoice: Invoice }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const customerId = payload.customerId
  if (!customerId) {
    return {
      ok: false,
      error: { code: 'VALIDATION', message: 'Cliente é obrigatório' },
    }
  }

  const customer = await getCustomer(client, companyId, customerId)
  if (!customer.ok) return customer

  const items = payload.items ?? []
  if (items.length === 0) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Informe ao menos um item na nota',
      },
    }
  }

  for (const item of items) {
    const desc = item.description?.trim()
    if (!desc) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Descrição do item é obrigatória',
        },
      }
    }
    if (
      item.quantity == null ||
      !Number.isFinite(item.quantity) ||
      item.quantity <= 0
    ) {
      return {
        ok: false,
        error: { code: 'VALIDATION', message: 'Quantidade do item inválida' },
      }
    }
    if (
      item.unitPriceCents == null ||
      !Number.isFinite(item.unitPriceCents) ||
      item.unitPriceCents < 0
    ) {
      return {
        ok: false,
        error: {
          code: 'VALIDATION',
          message: 'Valor unitário do item inválido',
        },
      }
    }
  }

  const company = await getCompany(client, companyId)
  if (!company.ok) return company

  const insert = await client.execute({
    sql: `INSERT INTO invoices (
            company_id, customer_id, series, nature, cfop, status
          ) VALUES (?, ?, ?, ?, ?, 'draft')
          RETURNING *`,
    args: [
      companyId,
      customerId,
      company.data.company.nfeSeries,
      payload.nature?.trim() || 'Venda de mercadoria',
      payload.cfop?.trim() || '5102',
    ],
  })

  const invoiceRow = insert.rows[0] as unknown as Record<string, unknown>
  const invoiceId = Number(invoiceRow.id)

  for (const item of items) {
    const description = item.description!.trim()
    const quantity = item.quantity!
    const unitPriceCents = Math.round(item.unitPriceCents!)
    const totalCents = lineTotalCents(quantity, unitPriceCents)
    await client.execute({
      sql: `INSERT INTO invoice_items (
              invoice_id, product_id, description, ncm, quantity,
              unit_price_cents, total_cents
            ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      args: [
        invoiceId,
        item.productId ?? null,
        description,
        item.ncm?.replace(/\D/g, '') || null,
        quantity,
        unitPriceCents,
        totalCents,
      ],
    })
  }

  await recomputeInvoiceTotals(client, companyId, invoiceId)
  await addInvoiceEvent(client, invoiceId, 'created', 'Rascunho criado')

  return getInvoice(client, companyId, invoiceId)
}

export { getInvoice, listInvoices } from './invoice-read'

export { getDashboardMetrics } from './invoice-dashboard'
export { sendInvoiceEmail, exportInvoiceXml } from './invoice-delivery'
export { transmitInvoice, cancelInvoice } from './invoice-lifecycle'
