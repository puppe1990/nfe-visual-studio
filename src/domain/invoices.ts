import type { Client } from '@libsql/client'

import {
  getActiveCertificateMaterial,
  hasActiveCertificate,
} from './certificates'
import { companyExists, getCompany } from './companies'
import { getCustomer } from './customers'
import type { MailSender } from './mail'
import { getMailSender } from './mail'
import type { SefazClient } from './sefaz'
import { getSefazClient } from './sefaz'
import { calculateTaxCents, lineTotalCents } from './tax'
import type {
  DashboardFilter,
  DashboardMetrics,
  DashboardRecentItem,
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  ServiceResult,
} from './types'
import {
  formatSchemaIssues,
  validateNFeXmlSchema,
} from './nfe-schema-validate'
import { formatSefazRejection } from './sefaz-cstat'
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
 * Transmissão via adapter SEFAZ (simulado por padrão).
 * Produção exige certificado A1 ativo.
 */
export async function transmitInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  sefaz: SefazClient = getSefazClient(),
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

  let xml: string
  try {
    xml = buildInvoiceXml({
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
  } catch (err) {
    const message =
      err instanceof Error ? err.message : 'Falha ao montar XML da NF-e'
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [message, invoiceId, companyId],
    })
    await addEvent(client, invoiceId, 'rejected', message)
    return getInvoice(client, companyId, invoiceId)
  }

  // Validação pré-envio alinhada ao XSD 4.00 (evita cStat 215/225 cegos)
  const schema = validateNFeXmlSchema(xml)
  if (!schema.ok) {
    const message = formatSchemaIssues(schema.issues)
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [message, invoiceId, companyId],
    })
    await addEvent(client, invoiceId, 'schema_invalid', message)
    return getInvoice(client, companyId, invoiceId)
  }

  const hasCert = await hasActiveCertificate(client, companyId)
  const certMaterial = await getActiveCertificateMaterial(client, companyId)
  const certificate =
    certMaterial.ok && certMaterial.data ? certMaterial.data : null

  const sefazResult = await sefaz.authorize({
    companyDocument: company.data.company.document,
    series,
    number,
    environment: company.data.company.sefazEnvironment,
    xml,
    hasCertificate: hasCert,
    certificate,
    uf: company.data.company.state ?? 'SP',
  })

  if (!sefazResult.ok) {
    // Se o adapter já formatou cStat, mantém; senão tenta enriquecer
    const reason = sefazResult.rejectionReason.includes('[cStat')
      ? sefazResult.rejectionReason
      : sefazResult.rejectionReason.includes('cStat=')
        ? formatSefazRejection(
            sefazResult.rejectionReason.match(/cStat=(\d+)/)?.[1],
            sefazResult.rejectionReason,
          )
        : sefazResult.rejectionReason
    await client.execute({
      sql: `UPDATE invoices SET
              status = 'rejected',
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [reason, invoiceId, companyId],
    })
    await addEvent(client, invoiceId, 'rejected', reason)
    return getInvoice(client, companyId, invoiceId)
  }

  await client.execute({
    sql: `UPDATE invoices SET
            status = 'authorized',
            number = ?,
            series = ?,
            xml_content = ?,
            sefaz_protocol = ?,
            access_key = ?,
            rejection_reason = NULL,
            issued_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [
      number,
      series,
      sefazResult.authorizedXml,
      sefazResult.protocol,
      sefazResult.accessKey,
      invoiceId,
      companyId,
    ],
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
    `NF-e ${series}/${number} autorizada · prot ${sefazResult.protocol}`,
  )

  return getInvoice(client, companyId, invoiceId)
}

export async function cancelInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  justification: string,
  sefaz: SefazClient = getSefazClient(),
): Promise<ServiceResult<{ invoice: Invoice }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'authorized') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Somente notas autorizadas podem ser canceladas',
      },
    }
  }

  const just = justification.trim()
  if (just.length < 15) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Justificativa deve ter ao menos 15 caracteres',
      },
    }
  }

  const company = await getCompany(client, companyId)
  if (!company.ok) return company

  const hasCert = await hasActiveCertificate(client, companyId)
  const certMaterial = await getActiveCertificateMaterial(client, companyId)
  const certificate =
    certMaterial.ok && certMaterial.data ? certMaterial.data : null

  const sefazResult = await sefaz.cancel({
    accessKey: invoice.accessKey ?? '',
    protocol: invoice.sefazProtocol ?? '',
    justification: just,
    environment: company.data.company.sefazEnvironment,
    hasCertificate: hasCert,
    certificate,
    uf: company.data.company.state ?? 'SP',
  })

  if (!sefazResult.ok) {
    return {
      ok: false,
      error: { code: 'SEFAZ', message: sefazResult.rejectionReason },
    }
  }

  await client.execute({
    sql: `UPDATE invoices SET
            status = 'canceled',
            cancel_protocol = ?,
            cancel_justification = ?,
            canceled_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [sefazResult.protocol, just, invoiceId, companyId],
  })
  await addEvent(
    client,
    invoiceId,
    'canceled',
    `Cancelada · prot ${sefazResult.protocol}`,
  )

  return getInvoice(client, companyId, invoiceId)
}

export async function sendInvoiceEmail(
  client: Client,
  companyId: number,
  invoiceId: number,
  recipient?: string | null,
  mail: MailSender = getMailSender(),
): Promise<ServiceResult<{ messageId: string }>> {
  const current = await getInvoice(client, companyId, invoiceId)
  if (!current.ok) return current

  const invoice = current.data.invoice
  if (invoice.status !== 'authorized' && invoice.status !== 'canceled') {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Envie e-mail apenas para notas autorizadas ou canceladas',
      },
    }
  }

  const customer = await getCustomer(client, companyId, invoice.customerId)
  if (!customer.ok) return customer

  const to = (recipient?.trim() || customer.data.customer.email || '').trim()
  if (!to) {
    return {
      ok: false,
      error: {
        code: 'VALIDATION',
        message: 'Destinatário sem e-mail cadastrado',
      },
    }
  }

  const subject = `NF-e ${invoice.series}/${invoice.number ?? '—'} — ${customer.data.customer.name}`
  const body = `Segue XML da NF-e ${invoice.series}/${invoice.number ?? ''}.\nProtocolo: ${invoice.sefazProtocol ?? '—'}\nChave: ${invoice.accessKey ?? '—'}`

  const result = await mail.send({
    to,
    subject,
    body,
    attachments: invoice.xmlContent
      ? [
          {
            filename: `nfe-${invoice.id}.xml`,
            content: invoice.xmlContent,
            contentType: 'application/xml',
          },
        ]
      : [],
  })

  if (!result.ok) {
    await client.execute({
      sql: `INSERT INTO invoice_mail_log (invoice_id, recipient, subject, status, error_message)
            VALUES (?, ?, ?, 'failed', ?)`,
      args: [invoiceId, to, subject, result.error],
    })
    return {
      ok: false,
      error: { code: 'MAIL', message: result.error },
    }
  }

  await client.execute({
    sql: `INSERT INTO invoice_mail_log (invoice_id, recipient, subject, status)
          VALUES (?, ?, ?, 'sent')`,
    args: [invoiceId, to, subject],
  })
  await addEvent(client, invoiceId, 'email_sent', `E-mail enviado para ${to}`)

  return { ok: true, data: { messageId: result.messageId } }
}

function dayStartUnix(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000)
}

function dayEndUnix(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number)
  return Math.floor(new Date(year, month - 1, day, 23, 59, 59).getTime() / 1000)
}

const DEFAULT_DASHBOARD_PAGE_SIZE = 10
const MAX_DASHBOARD_PAGE_SIZE = 100

function normalizeDashboardPage(filter?: DashboardFilter): {
  page: number
  pageSize: number
} {
  const rawSize = filter?.pageSize ?? DEFAULT_DASHBOARD_PAGE_SIZE
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(MAX_DASHBOARD_PAGE_SIZE, Math.max(1, Math.floor(rawSize)))
    : DEFAULT_DASHBOARD_PAGE_SIZE
  const rawPage = filter?.page ?? 1
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1
  return { page, pageSize }
}

async function countListedNotes(
  client: Client,
  companyId: number,
  filter: DashboardFilter | undefined,
  includeNfe: boolean,
  includeNfse: boolean,
  tableStatus: string | null,
): Promise<number> {
  const unions: string[] = []
  const args: Array<string | number> = []
  if (includeNfe) {
    const scope = dashboardScopeSql('invoices', companyId, filter, {
      status: tableStatus ?? undefined,
    })
    unions.push(`SELECT 1 AS x FROM invoices WHERE ${scope.sql}`)
    args.push(...scope.args)
  }
  if (includeNfse) {
    const scope = dashboardScopeSql('service_invoices', companyId, filter, {
      status: tableStatus ?? undefined,
    })
    unions.push(`SELECT 1 AS x FROM service_invoices WHERE ${scope.sql}`)
    args.push(...scope.args)
  }
  if (unions.length === 0) return 0
  const result = await client.execute({
    sql: `SELECT COUNT(*) AS c FROM (${unions.join(' UNION ALL ')})`,
    args,
  })
  const row = result.rows[0] as unknown as Record<string, unknown>
  return Number(row.c ?? 0)
}

function dashboardScopeSql(
  tableAlias: string,
  companyId: number,
  filter: DashboardFilter | undefined,
  opts?: { status?: string | string[]; requireIssued?: boolean },
): { sql: string; args: Array<string | number> } {
  const parts = [`${tableAlias}.company_id = ?`]
  const args: Array<string | number> = [companyId]
  if (opts?.status) {
    const statuses = Array.isArray(opts.status) ? opts.status : [opts.status]
    parts.push(
      `${tableAlias}.status IN (${statuses.map(() => '?').join(', ')})`,
    )
    args.push(...statuses)
  }
  if (filter?.customerId) {
    parts.push(`${tableAlias}.customer_id = ?`)
    args.push(filter.customerId)
  }
  const timeCol = `COALESCE(${tableAlias}.issued_at, ${tableAlias}.created_at)`
  if (filter?.dateFrom) {
    parts.push(`${timeCol} >= ?`)
    args.push(dayStartUnix(filter.dateFrom))
  }
  if (filter?.dateTo) {
    parts.push(`${timeCol} <= ?`)
    args.push(dayEndUnix(filter.dateTo))
  }
  if (opts?.requireIssued) {
    parts.push(`${tableAlias}.issued_at IS NOT NULL`)
  }
  return { sql: parts.join(' AND '), args }
}

export async function getDashboardMetrics(
  client: Client,
  companyId: number,
  filter?: DashboardFilter,
): Promise<ServiceResult<DashboardMetrics>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: 'NOT_FOUND', message: 'Empresa não encontrada' },
    }
  }

  const includeNfe = filter?.kind !== 'nfse'
  const includeNfse = filter?.kind !== 'nfe'
  const tableStatus = filter?.status && filter.status !== 'all' ? filter.status : null

  async function countStatus(status: string | string[]): Promise<{
    c: number
    revenue: number
  }> {
    const unions: string[] = []
    const args: Array<string | number> = []
    if (includeNfe) {
      const scope = dashboardScopeSql('invoices', companyId, filter, { status })
      unions.push(
        `SELECT total_cents FROM invoices WHERE ${scope.sql}`,
      )
      args.push(...scope.args)
    }
    if (includeNfse) {
      const scope = dashboardScopeSql('service_invoices', companyId, filter, {
        status,
      })
      unions.push(
        `SELECT total_cents FROM service_invoices WHERE ${scope.sql}`,
      )
      args.push(...scope.args)
    }
    if (unions.length === 0) return { c: 0, revenue: 0 }
    const result = await client.execute({
      sql: `SELECT COUNT(*) AS c, COALESCE(SUM(total_cents), 0) AS revenue
            FROM (${unions.join(' UNION ALL ')})`,
      args,
    })
    const row = result.rows[0] as unknown as Record<string, unknown>
    return { c: Number(row.c ?? 0), revenue: Number(row.revenue ?? 0) }
  }

  const authorized = await countStatus('authorized')
  const pending = await countStatus(['draft', 'pending'])
  const rejected = await countStatus('rejected')

  const chartStart = filter?.dateFrom
    ? dayStartUnix(filter.dateFrom)
    : Math.floor(Date.now() / 1000) - 6 * 86400
  const chartUnions: string[] = []
  const chartArgs: Array<string | number> = []
  if (includeNfe) {
    const scope = dashboardScopeSql('invoices', companyId, filter, {
      status: 'authorized',
      requireIssued: true,
    })
    chartUnions.push(
      `SELECT issued_at FROM invoices WHERE ${scope.sql} AND issued_at >= ?`,
    )
    chartArgs.push(...scope.args, chartStart)
  }
  if (includeNfse) {
    const scope = dashboardScopeSql('service_invoices', companyId, filter, {
      status: 'authorized',
      requireIssued: true,
    })
    chartUnions.push(
      `SELECT issued_at FROM service_invoices WHERE ${scope.sql} AND issued_at >= ?`,
    )
    chartArgs.push(...scope.args, chartStart)
  }
  const last7 = chartUnions.length
    ? await client.execute({
        sql: `SELECT date(issued_at, 'unixepoch', 'localtime') AS day, COUNT(*) AS c
              FROM (${chartUnions.join(' UNION ALL ')})
              GROUP BY day
              ORDER BY day ASC`,
        args: chartArgs,
      })
    : { rows: [] }

  const dayMap = new Map<string, number>()
  for (const row of last7.rows) {
    const r = row as unknown as Record<string, unknown>
    dayMap.set(String(r.day), Number(r.c))
  }
  const last7Days: { day: string; count: number }[] = []
  const chartDays = filter?.dateFrom && filter.dateTo
    ? Math.min(
        62,
        Math.round(
          (dayEndUnix(filter.dateTo) - dayStartUnix(filter.dateFrom)) / 86400,
        ) + 1,
      )
    : 7
  for (let i = chartDays - 1; i >= 0; i--) {
    const d = filter?.dateTo
      ? new Date(dayStartUnix(filter.dateTo) * 1000)
      : new Date()
    d.setHours(0, 0, 0, 0)
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    last7Days.push({ day: key, count: dayMap.get(key) ?? 0 })
  }

  const requested = normalizeDashboardPage(filter)
  const recentTotal = await countListedNotes(
    client,
    companyId,
    filter,
    includeNfe,
    includeNfse,
    tableStatus,
  )
  const totalPages = Math.max(1, Math.ceil(recentTotal / requested.pageSize))
  const page = Math.min(requested.page, totalPages)
  const pageSize = requested.pageSize
  const fetchLimit = page * pageSize

  const recentInvoices: Invoice[] = []
  const recentItems: DashboardRecentItem[] = []

  if (includeNfe) {
    const scope = dashboardScopeSql('i', companyId, filter, {
      status: tableStatus ?? undefined,
    })
    const recent = await client.execute({
      sql: `SELECT i.*, c.name AS customer_name
            FROM invoices i
            JOIN customers c ON c.id = i.customer_id
            WHERE ${scope.sql}
            ORDER BY COALESCE(i.issued_at, i.created_at) DESC
            LIMIT ?`,
      args: [...scope.args, fetchLimit],
    })
    recentInvoices.push(
      ...recent.rows.map((r) =>
        mapInvoice(r as unknown as Record<string, unknown>),
      ),
    )
    for (const invoice of recentInvoices) {
      recentItems.push({
        id: `nfe-${invoice.id}`,
        kind: 'nfe',
        numberLabel:
          invoice.number != null
            ? `${invoice.series}/${invoice.number}`
            : `Rascunho ${invoice.id}`,
        customerName: invoice.customerName ?? '—',
        issuedAt: invoice.issuedAt,
        createdAt: invoice.createdAt,
        totalCents: invoice.totalCents,
        status: invoice.status,
      })
    }
  }

  if (includeNfse) {
    const scope = dashboardScopeSql('s', companyId, filter, {
      status: tableStatus ?? undefined,
    })
    const recentNfse = await client.execute({
      sql: `SELECT s.id, s.nfse_number, s.rps_series, s.rps_number, s.status,
                   s.total_cents, s.issued_at, s.created_at, c.name AS customer_name
            FROM service_invoices s
            JOIN customers c ON c.id = s.customer_id
            WHERE ${scope.sql}
            ORDER BY COALESCE(s.issued_at, s.created_at) DESC
            LIMIT ?`,
      args: [...scope.args, fetchLimit],
    })
    for (const row of recentNfse.rows) {
      const r = row as unknown as Record<string, unknown>
      const nfseNumber = r.nfse_number == null ? null : Number(r.nfse_number)
      recentItems.push({
        id: `nfse-${Number(r.id)}`,
        kind: 'nfse',
        numberLabel:
          nfseNumber != null
            ? `NFS-e ${nfseNumber}`
            : `RPS ${String(r.rps_series)}/${Number(r.rps_number)}`,
        customerName: r.customer_name == null ? '—' : String(r.customer_name),
        issuedAt: r.issued_at == null ? null : Number(r.issued_at) * 1000,
        createdAt: Number(r.created_at) * 1000,
        totalCents: Number(r.total_cents),
        status: String(r.status) as InvoiceStatus,
      })
    }
  }

  recentItems.sort(
    (a, b) => (b.issuedAt ?? b.createdAt) - (a.issuedAt ?? a.createdAt),
  )
  const start = (page - 1) * pageSize
  const slicedItems = recentItems.slice(start, start + pageSize)

  return {
    ok: true,
    data: {
      authorizedCount: authorized.c,
      revenueCents: authorized.revenue,
      pendingCount: pending.c,
      rejectedCount: rejected.c,
      last7Days,
      recentInvoices,
      recentItems: slicedItems,
      recentTotal,
      page,
      pageSize,
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
