import type { Client } from "@libsql/client";

import { getActiveCertificateMaterial } from "./certificates";
import { getCompany } from "./companies";
import { createCustomer, getCustomer } from "./customers";
import { callNfseSoap, type NfsePostFn } from "./nfse-client";
import { buildRpsSignPayload, signRpsPayload } from "./nfse-rps";
import {
  buildConsultaCnpjXml,
  buildConsultaNfePeriodoXml,
  buildPedidoEnvioRpsXml,
  parseConsultaCnpjReturn,
  parseConsultaNfeReturn,
  parseEnvioRpsReturn,
  signPedidoXml,
} from "./nfse-xml";
import { resolveIbgeCityCode } from "./xml-export";
import { loadA1FromPfx } from "./sefaz-sign";
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

function mapServiceInvoice(row: Record<string, unknown>): ServiceInvoice {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    customerId: Number(row.customer_id),
    customerName:
      row.customer_name == null ? undefined : String(row.customer_name),
    rpsSeries: String(row.rps_series),
    rpsNumber: Number(row.rps_number),
    nfseNumber: row.nfse_number == null ? null : Number(row.nfse_number),
    verificationCode:
      row.verification_code == null ? null : String(row.verification_code),
    serviceCode: String(row.service_code),
    discrimination: String(row.discrimination),
    taxation: String(row.taxation),
    issRate: Number(row.iss_rate),
    issWithheld: Number(row.iss_withheld) === 1,
    status: row.status as ServiceInvoice["status"],
    subtotalCents: Number(row.subtotal_cents),
    issCents: Number(row.iss_cents),
    totalCents: Number(row.total_cents),
    xmlContent: row.xml_content == null ? null : String(row.xml_content),
    returnXml: row.return_xml == null ? null : String(row.return_xml),
    rejectionReason:
      row.rejection_reason == null ? null : String(row.rejection_reason),
    issuedAt: row.issued_at == null ? null : Number(row.issued_at) * 1000,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
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

function dayStartUnix(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(new Date(year, month - 1, day, 0, 0, 0).getTime() / 1000);
}

function dayEndUnix(iso: string): number {
  const [year, month, day] = iso.split("-").map(Number);
  return Math.floor(new Date(year, month - 1, day, 23, 59, 59).getTime() / 1000);
}

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

export async function getServiceInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ invoice: ServiceInvoice }>> {
  const result = await client.execute({
    sql: `SELECT s.*, c.name AS customer_name
          FROM service_invoices s
          JOIN customers c ON c.id = s.customer_id
          WHERE s.id = ? AND s.company_id = ?`,
    args: [invoiceId, companyId],
  });
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "NFS-e não encontrada" },
    };
  }
  return {
    ok: true,
    data: {
      invoice: mapServiceInvoice(
        result.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  };
}

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

export async function consultIssuerCnpj(
  client: Client,
  companyId: number,
  options?: { postFn?: NfsePostFn; endpoint?: string },
): Promise<
  ServiceResult<{ municipalRegistration: string; emitsNfse: boolean }>
> {
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  const material = await getActiveCertificateMaterial(client, companyId);
  if (!material.ok || !material.data) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Cadastre o certificado A1" },
    };
  }

  const a1 = loadA1FromPfx(material.data.pfxBase64, material.data.password);
  const unsigned = buildConsultaCnpjXml(
    company.data.company.document,
    company.data.company.document,
  );
  const signed = signPedidoXml(unsigned, a1, "PedidoConsultaCNPJ");
  const soap = await callNfseSoap({
    method: "ConsultaCNPJ",
    mensagemXml: signed,
    pfxBase64: material.data.pfxBase64,
    password: material.data.password,
    endpoint: options?.endpoint,
    postFn: options?.postFn,
  });
  const parsed = parseConsultaCnpjReturn(soap.retornoXml);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: parsed.code, message: parsed.message },
    };
  }
  return { ok: true, data: parsed };
}

function monthWindows(
  from: string,
  to: string,
): Array<{ from: string; to: string }> {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const windows: Array<{ from: string; to: string }> = [];
  let cursor = start;
  while (cursor <= end) {
    const windowEnd = new Date(cursor);
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 30);
    const capped = windowEnd > end ? end : windowEnd;
    windows.push({
      from: cursor.toISOString().slice(0, 10),
      to: capped.toISOString().slice(0, 10),
    });
    cursor = new Date(capped);
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return windows;
}

function issuedAtUnix(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t)
    ? Math.floor(t / 1000)
    : Math.floor(Date.now() / 1000);
}

async function findOrCreateTaker(
  client: Client,
  companyId: number,
  document: string | null,
  name: string | null,
  email: string | null,
): Promise<number | null> {
  const digits = (document ?? "").replace(/\D/g, "");
  if (digits.length !== 11 && digits.length !== 14) return null;
  const existing = await client.execute({
    sql: "SELECT id FROM customers WHERE company_id = ? AND document = ?",
    args: [companyId, digits],
  });
  if (existing.rows.length > 0) {
    return Number(
      (existing.rows[0] as unknown as { id: number }).id,
    );
  }
  const created = await createCustomer(client, companyId, {
    name: name?.trim() || `Tomador ${digits}`,
    document: digits,
    email,
  });
  if (!created.ok) return null;
  return created.data.customer.id;
}

export async function importHistoricServiceInvoices(
  client: Client,
  companyId: number,
  options?: {
    postFn?: NfsePostFn;
    endpoint?: string;
    dateFrom?: string;
    dateTo?: string;
  },
): Promise<
  ServiceResult<{ imported: number; skipped: number; fetched: number }>
> {
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  const im = company.data.company.municipalRegistration?.replace(/\D/g, "");
  if (!im || im.length !== 8) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Informe a inscrição municipal em Configurações",
      },
    };
  }
  const material = await getActiveCertificateMaterial(client, companyId);
  if (!material.ok || !material.data) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Cadastre o certificado A1" },
    };
  }

  const a1 = loadA1FromPfx(material.data.pfxBase64, material.data.password);
  const dateFrom = options?.dateFrom ?? "2016-01-01";
  const dateTo = options?.dateTo ?? new Date().toISOString().slice(0, 10);

  let fetched = 0;
  let imported = 0;
  let skipped = 0;
  let maxRps = company.data.company.nextRpsNumber ?? 1;
  let firstError: { code: string; message: string } | null = null;

  for (const window of monthWindows(dateFrom, dateTo)) {
    for (let page = 1; page <= 20; page++) {
      const unsigned = buildConsultaNfePeriodoXml({
        senderDocument: company.data.company.document,
        municipalRegistration: im,
        dateFrom: window.from,
        dateTo: window.to,
        page,
      });
      const signed = signPedidoXml(unsigned, a1, "PedidoConsultaNFePeriodo");
      const soap = await callNfseSoap({
        method: "ConsultaNFeEmitidas",
        mensagemXml: signed,
        pfxBase64: material.data.pfxBase64,
        password: material.data.password,
        endpoint: options?.endpoint,
        postFn: options?.postFn,
      });
      const parsed = parseConsultaNfeReturn(soap.retornoXml);
      if (!parsed.ok) {
        firstError ??= { code: parsed.code, message: parsed.message };
        break;
      }
      if (parsed.notes.length === 0) break;
      fetched += parsed.notes.length;

      for (const note of parsed.notes) {
        const exists = await client.execute({
          sql: `SELECT id FROM service_invoices
                WHERE company_id = ? AND nfse_number = ?`,
          args: [companyId, note.nfseNumber],
        });
        if (exists.rows.length > 0) {
          skipped += 1;
          continue;
        }
        const customerId = await findOrCreateTaker(
          client,
          companyId,
          note.takerDocument,
          note.takerName,
          note.takerEmail,
        );
        if (customerId == null) {
          skipped += 1;
          continue;
        }
        const status = note.canceled ? "canceled" : "authorized";
        await client.execute({
          sql: `INSERT INTO service_invoices (
                  company_id, customer_id, rps_series, rps_number, nfse_number,
                  verification_code, service_code, discrimination, taxation,
                  iss_rate, iss_withheld, status, subtotal_cents, iss_cents,
                  total_cents, issued_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            companyId,
            customerId,
            note.rpsSeries || "A",
            note.rpsNumber || note.nfseNumber,
            note.nfseNumber,
            note.verificationCode || null,
            note.serviceCode || "01880",
            note.discrimination,
            note.taxation || "T",
            note.issRate || 0.05,
            note.issWithheld ? 1 : 0,
            status,
            note.serviceCents,
            note.issCents,
            note.serviceCents,
            issuedAtUnix(note.issuedAt),
          ],
        });
        imported += 1;
        maxRps = Math.max(maxRps, (note.rpsNumber || 0) + 1);
      }

      if (parsed.notes.length < 50) break;
    }
  }

  if (fetched === 0 && imported === 0 && firstError) {
    return { ok: false, error: firstError };
  }

  await client.execute({
    sql: `UPDATE companies SET next_rps_number = MAX(next_rps_number, ?),
          updated_at = unixepoch() WHERE id = ?`,
    args: [maxRps, companyId],
  });

  return { ok: true, data: { imported, skipped, fetched } };
}

export async function transmitServiceInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  options?: { postFn?: NfsePostFn; endpoint?: string; issuedOn?: string },
): Promise<ServiceResult<{ invoice: ServiceInvoice }>> {
  const current = await getServiceInvoice(client, companyId, invoiceId);
  if (!current.ok) return current;
  if (
    current.data.invoice.status !== "draft" &&
    current.data.invoice.status !== "rejected"
  ) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Somente rascunhos ou rejeitadas podem ser transmitidas",
      },
    };
  }

  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  const im = company.data.company.municipalRegistration?.replace(/\D/g, "");
  if (!im || im.length !== 8) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Informe a inscrição municipal (8 dígitos) em Configurações",
      },
    };
  }

  const customer = await getCustomer(
    client,
    companyId,
    current.data.invoice.customerId,
  );
  if (!customer.ok) return customer;

  const material = await getActiveCertificateMaterial(client, companyId);
  if (!material.ok || !material.data) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Cadastre o certificado A1" },
    };
  }

  const invoice = current.data.invoice;
  const issuedOn = options?.issuedOn ?? new Date().toISOString().slice(0, 10);
  const a1 = loadA1FromPfx(material.data.pfxBase64, material.data.password);
  const payload = buildRpsSignPayload({
    municipalRegistration: im,
    rpsSeries: invoice.rpsSeries,
    rpsNumber: invoice.rpsNumber,
    issuedOn,
    taxation: "T",
    status: "N",
    issWithheld: invoice.issWithheld,
    serviceCents: invoice.subtotalCents,
    deductionCents: 0,
    serviceCode: invoice.serviceCode,
    takerDocument: customer.data.customer.document,
  });
  const rpsSignature = signRpsPayload(payload, a1);

  const unsigned = buildPedidoEnvioRpsXml({
    senderDocument: company.data.company.document,
    municipalRegistration: im,
    rpsSeries: invoice.rpsSeries,
    rpsNumber: invoice.rpsNumber,
    issuedOn,
    taxation: "T",
    status: "N",
    issWithheld: invoice.issWithheld,
    serviceCents: invoice.subtotalCents,
    deductionCents: 0,
    serviceCode: invoice.serviceCode,
    discrimination: invoice.discrimination,
    issRate: invoice.issRate,
    rpsSignature,
    taker: {
      document: customer.data.customer.document,
      name: customer.data.customer.name,
      email: customer.data.customer.email,
      streetType: "Rua",
      street: customer.data.customer.street,
      number: customer.data.customer.number,
      complement: customer.data.customer.complement,
      district: customer.data.customer.district,
      cityIbge: resolveIbgeCityCode(
        customer.data.customer.city,
        customer.data.customer.state,
      ),
      state: customer.data.customer.state,
      zip: customer.data.customer.zip,
    },
  });
  const signed = signPedidoXml(unsigned, a1, "PedidoEnvioRPS");

  const soap = await callNfseSoap({
    method: "EnvioRPS",
    mensagemXml: signed,
    pfxBase64: material.data.pfxBase64,
    password: material.data.password,
    endpoint: options?.endpoint,
    postFn: options?.postFn,
  });
  const parsed = parseEnvioRpsReturn(soap.retornoXml);

  if (!parsed.ok) {
    await client.execute({
      sql: `UPDATE service_invoices SET
              status = 'rejected',
              xml_content = ?,
              return_xml = ?,
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [
        signed,
        soap.retornoXml,
        `${parsed.code}: ${parsed.message}`,
        invoiceId,
        companyId,
      ],
    });
    return getServiceInvoice(client, companyId, invoiceId);
  }

  await client.execute({
    sql: `UPDATE service_invoices SET
            status = 'authorized',
            nfse_number = ?,
            verification_code = ?,
            xml_content = ?,
            return_xml = ?,
            rejection_reason = NULL,
            issued_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [
      parsed.nfseNumber,
      parsed.verificationCode,
      signed,
      soap.retornoXml,
      invoiceId,
      companyId,
    ],
  });
  return getServiceInvoice(client, companyId, invoiceId);
}
