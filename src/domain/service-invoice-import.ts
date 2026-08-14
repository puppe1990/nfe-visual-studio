import type { Client } from "@libsql/client";

import { getActiveCertificateMaterial } from "./certificates";
import { getCompany } from "./companies";
import { createCustomer } from "./customers";
import { callNfseSoap, type NfsePostFn } from "./nfse-client";
import {
  buildConsultaNfePeriodoXml,
  parseConsultaNfeReturn,
  signPedidoXml,
} from "./nfse-xml";
import { loadA1FromPfx } from "./sefaz-sign";
import type { ServiceResult } from "./types";

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
