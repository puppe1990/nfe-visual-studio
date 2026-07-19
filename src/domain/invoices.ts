import type { Client } from '@libsql/client'

import { companyExists, getCompany } from './companies'
import { getCustomer } from './customers'
import { calculateTaxCents, lineTotalCents } from './tax'
import type {
  DashboardMetrics,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  ServiceResult,
} from './types'
import { buildInvoiceXml } from './xml-export'

function mapItem(row: Record<string, unknown>): InvoiceItem {
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

function mapInvoice(row: Record<string, unknown>): Invoice {
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
    totalCents: Number(row.total_cents),
    xmlContent: row.xml_content == null ? null : String(row.xml_content),
    rejectionReason:
      row.rejection_reason == null ? null : String(row.rejection_reason),
    issuedAt: row.issued_at == null ? null : Number(row.issued_at) * 1000,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  }
}

async function loadItems(
  client: Client,
  invoiceId: number,
): Promise<InvoiceItem[]> {
  const result = await client.execute({
    sql: 'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id ASC',
    args: [invoiceId],
  })
  return result.rows.map((r) =>
    mapItem(r as unknown as Record<string, unknown>),
  )
}

async function recomputeTotals(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<void> {
  const company = await getCompany(client, companyId)
  if (!company.ok) return

  const items = await loadItems(client, invoiceId)
  const subtotalCents = items.reduce((s, i) => s + i.totalCents, 0)
  const { taxCents, totalCents } = calculateTaxCents({
    subtotalCents,
    taxRegime: company.data.company.taxRegime,
  })

  await client.execute({
    sql: `UPDATE invoices SET
            subtotal_cents = ?, tax_cents = ?, total_cents = ?,
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [subtotalCents, taxCents, totalCents, invoiceId, companyId],
  })
}

async function addEvent(
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

  await recomputeTotals(client, companyId, invoiceId)
  await addEvent(client, invoiceId, 'created', 'Rascunho criado')

  return getInvoice(client, companyId, invoiceId)
}

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
  invoice.items = await loadItems(client, invoiceId)
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

/**
 * Transmissão simulada (MVP): valida e marca authorized ou rejected.
 * SEFAZ real entra na Fase 2.
 */
export async function transmitInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ invoice: Invoice }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'draft' && invoice.status !== 'rejected') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente rascunhos ou rejeitadas podem ser retransmitidas',
      },
    }
  }

  const items = invoice.items ?? []
  if (items.length === 0) {
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: ['Nota sem itens', invoiceId, companyId],
    })
    await addEvent(client, invoiceId, 'rejected', 'Nota sem itens')
    return getInvoice(client, companyId, invoiceId)
  }

  if (invoice.totalCents <= 0) {
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: ['Total da nota deve ser maior que zero', invoiceId, companyId],
    })
    await addEvent(client, invoiceId, 'rejected', 'Total inválido')
    return getInvoice(client, companyId, invoiceId)
  }

  const company = await getCompany(client, companyId)
  if (!company.ok) return company

  const number = company.data.company.nextNfeNumber
  const series = company.data.company.nfeSeries
  const customer = await getCustomer(client, companyId, invoice.customerId)
  if (!customer.ok) return customer

  const xml = buildInvoiceXml({
    company: company.data.company,
    customer: customer.data.customer,
    invoice: {
      ...invoice,
      number,
      series,
      status: 'authorized',
      items,
    },
  })

  await client.execute({
    sql: `UPDATE invoices SET
            status = 'authorized',
            number = ?,
            series = ?,
            xml_content = ?,
            rejection_reason = NULL,
            issued_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [number, series, xml, invoiceId, companyId],
  })

  await client.execute({
    sql: `UPDATE companies SET
            next_nfe_number = ?,
            updated_at = unixepoch()
          WHERE id = ?`,
    args: [number + 1, companyId],
  })

  await addEvent(
    client,
    invoiceId,
    'authorized',
    `NF-e ${series}/${number} autorizada (simulado)`,
  )

  return getInvoice(client, companyId, invoiceId)
}

export async function getDashboardMetrics(
  client: Client,
  companyId: number,
): Promise<ServiceResult<DashboardMetrics>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const authorized = await client.execute({
    sql: `SELECT COUNT(*) AS c, COALESCE(SUM(total_cents), 0) AS revenue
          FROM invoices
          WHERE company_id = ? AND status = 'authorized'`,
    args: [companyId],
  })
  const pending = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM invoices
          WHERE company_id = ? AND status IN ('draft', 'pending')`,
    args: [companyId],
  })
  const rejected = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM invoices
          WHERE company_id = ? AND status = 'rejected'`,
    args: [companyId],
  })

  const last7 = await client.execute({
    sql: `SELECT date(issued_at, 'unixepoch') AS day, COUNT(*) AS c
          FROM invoices
          WHERE company_id = ?
            AND status = 'authorized'
            AND issued_at IS NOT NULL
            AND issued_at >= unixepoch('now', '-6 days')
          GROUP BY day
          ORDER BY day ASC`,
    args: [companyId],
  })

  // Build continuous 7-day series
  const dayMap = new Map<string, number>()
  for (const row of last7.rows) {
    const r = row as unknown as Record<string, unknown>
    dayMap.set(String(r.day), Number(r.c))
  }
  const last7Days: { day: string; count: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    const key = d.toISOString().slice(0, 10)
    last7Days.push({ day: key, count: dayMap.get(key) ?? 0 })
  }

  const recent = await client.execute({
    sql: `SELECT i.*, c.name AS customer_name
          FROM invoices i
          JOIN customers c ON c.id = i.customer_id
          WHERE i.company_id = ?
          ORDER BY i.id DESC
          LIMIT 5`,
    args: [companyId],
  })

  const authRow = authorized.rows[0] as unknown as Record<string, unknown>
  const pendRow = pending.rows[0] as unknown as Record<string, unknown>
  const rejRow = rejected.rows[0] as unknown as Record<string, unknown>

  return {
    ok: true,
    data: {
      authorizedCount: Number(authRow.c ?? 0),
      revenueCents: Number(authRow.revenue ?? 0),
      pendingCount: Number(pendRow.c ?? 0),
      rejectedCount: Number(rejRow.c ?? 0),
      last7Days,
      recentInvoices: recent.rows.map((r) =>
        mapInvoice(r as unknown as Record<string, unknown>),
      ),
    },
  }
}

export async function exportInvoiceXml(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ xml: string }>> {
  const invoice = await getInvoice(client, companyId, invoiceId)
  if (!invoice.ok) return invoice

  if (invoice.data.invoice.xmlContent) {
    return { ok: true, data: { xml: invoice.data.invoice.xmlContent } }
  }

  if (invoice.data.invoice.status !== 'authorized') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente notas autorizadas possuem XML de exportação',
      },
    }
  }

  return {
    ok: false,
    error: { code: 'NOT_FOUND', message: 'XML não disponível' },
  }
}
