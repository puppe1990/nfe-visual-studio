import type { Client } from "@libsql/client";

import { getCompany } from "./companies";
import { getCustomer } from "./customers";
import { dayEndUnix, dayStartUnix } from "./iso-day-unix";
import {
  getServiceInvoice,
  mapServiceInvoice,
} from "./service-invoice-row";
import type {
  NfseListDir,
  NfseListFilter,
  NfseListResult,
  NfseListSort,
  ServiceInvoice,
  ServiceResult,
} from "./types";

export type ServiceInvoiceDraftInput = {
  customerId: number;
  discrimination: string;
  serviceCents: number;
  serviceCode?: string;
  issRate?: number;
  issWithheld?: boolean;
};

export async function createServiceInvoiceDraft(
  client: Client,
  companyId: number,
  payload: ServiceInvoiceDraftInput,
): Promise<ServiceResult<{ invoice: ServiceInvoice }>> {
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;

  const discrimination = payload.discrimination.trim();
  if (discrimination.length < 8) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Discriminação do serviço é obrigatória (mín. 8 caracteres)",
      },
    };
  }
  if (!Number.isFinite(payload.serviceCents) || payload.serviceCents <= 0) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Valor do serviço deve ser maior que zero" },
    };
  }

  const customer = await getCustomer(client, companyId, payload.customerId);
  if (!customer.ok) return customer;

  const issRate = payload.issRate ?? 0.05;
  const issCents = Math.round(payload.serviceCents * issRate);
  const rpsSeries = company.data.company.rpsSeries || "A";
  const rpsNumber = company.data.company.nextRpsNumber || 1;
  const serviceCode = (payload.serviceCode ?? "01880").replace(/\D/g, "");

  const inserted = await client.execute({
    sql: `INSERT INTO service_invoices (
            company_id, customer_id, rps_series, rps_number, service_code,
            discrimination, taxation, iss_rate, iss_withheld, status,
            subtotal_cents, iss_cents, total_cents
          ) VALUES (?, ?, ?, ?, ?, ?, 'T', ?, ?, 'draft', ?, ?, ?)
          RETURNING *`,
    args: [
      companyId,
      payload.customerId,
      rpsSeries,
      rpsNumber,
      serviceCode.padStart(5, "0"),
      discrimination,
      issRate,
      payload.issWithheld ? 1 : 0,
      payload.serviceCents,
      issCents,
      payload.serviceCents,
    ],
  });

  await client.execute({
    sql: `UPDATE companies SET next_rps_number = ?, updated_at = unixepoch()
          WHERE id = ?`,
    args: [rpsNumber + 1, companyId],
  });

  return {
    ok: true,
    data: {
      invoice: mapServiceInvoice(
        inserted.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  };
}


const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 100;

const SORT_COLUMNS: Record<NfseListSort, string> = {
  issuedAt: "COALESCE(s.issued_at, s.created_at)",
  nfseNumber: "s.nfse_number",
  total: "s.total_cents",
  customer: "c.name COLLATE NOCASE",
  status: "s.status",
};

function normalizeNfseListFilter(filter?: NfseListFilter): {
  page: number;
  pageSize: number;
  sort: NfseListSort;
  dir: NfseListDir;
} {
  const rawSize = filter?.pageSize ?? DEFAULT_PAGE_SIZE;
  const pageSize = Number.isFinite(rawSize)
    ? Math.min(MAX_PAGE_SIZE, Math.max(1, Math.floor(rawSize)))
    : DEFAULT_PAGE_SIZE;
  const rawPage = filter?.page ?? 1;
  const page = Number.isFinite(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  const sort =
    filter?.sort && filter.sort in SORT_COLUMNS ? filter.sort : "issuedAt";
  const dir = filter?.dir === "asc" ? "asc" : "desc";
  return { page, pageSize, sort, dir };
}

export async function listServiceInvoices(
  client: Client,
  companyId: number,
  filter?: NfseListFilter,
): Promise<ServiceResult<NfseListResult>> {
  const requested = normalizeNfseListFilter(filter);
  const where: string[] = ["s.company_id = ?"];
  const args: Array<string | number> = [companyId];

  if (filter?.status && filter.status !== "all") {
    where.push("s.status = ?");
    args.push(filter.status);
  }
  if (filter?.customerId) {
    where.push("s.customer_id = ?");
    args.push(filter.customerId);
  }
  const timeCol = "COALESCE(s.issued_at, s.created_at)";
  if (filter?.dateFrom) {
    where.push(`${timeCol} >= ?`);
    args.push(dayStartUnix(filter.dateFrom));
  }
  if (filter?.dateTo) {
    where.push(`${timeCol} <= ?`);
    args.push(dayEndUnix(filter.dateTo));
  }

  const whereSql = where.join(" AND ");
  const count = await client.execute({
    sql: `SELECT COUNT(*) AS c
          FROM service_invoices s
          JOIN customers c ON c.id = s.customer_id
          WHERE ${whereSql}`,
    args,
  });
  const total = Number(
    (count.rows[0] as unknown as Record<string, unknown>).c ?? 0,
  );
  const totalPages = Math.max(1, Math.ceil(total / requested.pageSize));
  const page = Math.min(requested.page, totalPages);
  const offset = (page - 1) * requested.pageSize;
  const orderCol = SORT_COLUMNS[requested.sort];
  const dirSql = requested.dir === "asc" ? "ASC" : "DESC";

  const result = await client.execute({
    sql: `SELECT s.*, c.name AS customer_name
          FROM service_invoices s
          JOIN customers c ON c.id = s.customer_id
          WHERE ${whereSql}
          ORDER BY ${orderCol} ${dirSql}, s.id DESC
          LIMIT ? OFFSET ?`,
    args: [...args, requested.pageSize, offset],
  });
  return {
    ok: true,
    data: {
      invoices: result.rows.map((r) =>
        mapServiceInvoice(r as unknown as Record<string, unknown>),
      ),
      total,
      page,
      pageSize: requested.pageSize,
      sort: requested.sort,
      dir: requested.dir,
    },
  };
}


export { getServiceInvoice } from "./service-invoice-row";
export { consultIssuerCnpj } from "./service-invoice-consult";
export { importHistoricServiceInvoices } from "./service-invoice-import";
export { transmitServiceInvoice } from "./service-invoice-transmit";
