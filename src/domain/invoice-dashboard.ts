import type { Client } from '@libsql/client'

import { companyExists } from './companies'
import {
  buildChartSeries,
  chooseChartBucket,
} from './dashboard-chart'
import { mapInvoice } from './invoice-row'
import { dayEndUnix, dayStartUnix } from './iso-day-unix'
import type {
  DashboardFilter,
  DashboardMetrics,
  DashboardRecentItem,
  Invoice,
  InvoiceStatus,
  ServiceResult,
} from './types'

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

  const chartUnions: string[] = []
  const chartArgs: Array<string | number> = []
  if (includeNfe) {
    const scope = dashboardScopeSql('invoices', companyId, filter, {
      status: 'authorized',
      requireIssued: true,
    })
    chartUnions.push(`SELECT issued_at FROM invoices WHERE ${scope.sql}`)
    chartArgs.push(...scope.args)
  }
  if (includeNfse) {
    const scope = dashboardScopeSql('service_invoices', companyId, filter, {
      status: 'authorized',
      requireIssued: true,
    })
    chartUnions.push(
      `SELECT issued_at FROM service_invoices WHERE ${scope.sql}`,
    )
    chartArgs.push(...scope.args)
  }
  const issuedRows = chartUnions.length
    ? await client.execute({
        sql: `SELECT issued_at FROM (${chartUnions.join(' UNION ALL ')})`,
        args: chartArgs,
      })
    : { rows: [] }
  const issuedAtSeconds = issuedRows.rows.map((row) =>
    Number((row as unknown as Record<string, unknown>).issued_at),
  )

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const toUnix = filter?.dateTo
    ? dayStartUnix(filter.dateTo)
    : Math.floor(today.getTime() / 1000)
  const fromUnix = filter?.dateFrom
    ? dayStartUnix(filter.dateFrom)
    : issuedAtSeconds.length > 0
      ? Math.min(
          ...issuedAtSeconds.map((stamp) => {
            const d = new Date(stamp * 1000)
            d.setHours(0, 0, 0, 0)
            return Math.floor(d.getTime() / 1000)
          }),
        )
      : toUnix - 6 * 86400
  const chartSeries = buildChartSeries(issuedAtSeconds, fromUnix, toUnix)
  const chartBucket = chooseChartBucket(fromUnix, toUnix)

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
      chartSeries,
      chartBucket,
      recentInvoices,
      recentItems: slicedItems,
      recentTotal,
      page,
      pageSize,
    },
  }
}
