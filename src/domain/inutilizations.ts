import type { Client } from "@libsql/client";

import {
  getActiveCertificateMaterial,
  hasActiveCertificate,
} from "./certificates";
import { companyExists, getCompany } from "./companies";
import type { SefazClient } from "./sefaz";
import { getSefazClient } from "./sefaz";
import type { Inutilization, ServiceResult } from "./types";

function mapInut(row: Record<string, unknown>): Inutilization {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    series: Number(row.series),
    numberFrom: Number(row.number_from),
    numberTo: Number(row.number_to),
    year: Number(row.year),
    justification: String(row.justification),
    protocol: row.protocol == null ? null : String(row.protocol),
    status: String(row.status),
    xmlContent: row.xml_content == null ? null : String(row.xml_content),
    createdAt: Number(row.created_at) * 1000,
  };
}

export async function listInutilizations(
  client: Client,
  companyId: number,
): Promise<ServiceResult<{ inutilizations: Inutilization[] }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Empresa não encontrada" },
    };
  }

  const result = await client.execute({
    sql: `SELECT * FROM inutilizations
          WHERE company_id = ?
          ORDER BY id DESC`,
    args: [companyId],
  });

  return {
    ok: true,
    data: {
      inutilizations: result.rows.map((r) =>
        mapInut(r as unknown as Record<string, unknown>),
      ),
    },
  };
}

export async function inutilizeNumbers(
  client: Client,
  companyId: number,
  payload: {
    series?: number;
    numberFrom?: number;
    numberTo?: number;
    year?: number;
    justification?: string;
  },
  sefaz: SefazClient = getSefazClient(),
): Promise<ServiceResult<{ inutilization: Inutilization }>> {
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;

  const series = payload.series ?? company.data.company.nfeSeries;
  const numberFrom = payload.numberFrom;
  const numberTo = payload.numberTo;
  const year = payload.year ?? new Date().getFullYear();
  const justification = payload.justification?.trim() ?? "";

  if (
    numberFrom == null ||
    numberTo == null ||
    !Number.isFinite(numberFrom) ||
    !Number.isFinite(numberTo)
  ) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Informe a faixa de numeração a inutilizar",
      },
    };
  }
  if (numberFrom > numberTo) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Número inicial maior que o final",
      },
    };
  }
  if (justification.length < 15) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Justificativa deve ter ao menos 15 caracteres",
      },
    };
  }

  // Não inutilizar números já usados em notas autorizadas/canceladas
  const used = await client.execute({
    sql: `SELECT number FROM invoices
          WHERE company_id = ?
            AND series = ?
            AND number IS NOT NULL
            AND number BETWEEN ? AND ?
            AND status IN ('authorized', 'canceled', 'pending')`,
    args: [companyId, series, numberFrom, numberTo],
  });
  if (used.rows.length > 0) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Faixa contém numeração já utilizada em notas",
      },
    };
  }

  const hasCert = await hasActiveCertificate(client, companyId);
  const certMaterial = await getActiveCertificateMaterial(client, companyId);
  const certificate =
    certMaterial.ok && certMaterial.data ? certMaterial.data : null;

  const sefazResult = await sefaz.inutilize({
    companyDocument: company.data.company.document,
    series,
    numberFrom,
    numberTo,
    year,
    justification,
    environment: company.data.company.sefazEnvironment,
    hasCertificate: hasCert,
    certificate,
    uf: company.data.company.state ?? "SP",
  });

  if (!sefazResult.ok) {
    return {
      ok: false,
      error: { code: "SEFAZ", message: sefazResult.rejectionReason },
    };
  }

  const insert = await client.execute({
    sql: `INSERT INTO inutilizations (
            company_id, series, number_from, number_to, year,
            justification, protocol, status, xml_content
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'authorized', ?)
          RETURNING *`,
    args: [
      companyId,
      series,
      numberFrom,
      numberTo,
      year,
      justification,
      sefazResult.protocol,
      sefazResult.xml,
    ],
  });

  // Avança próximo número se a faixa inutilizada cobrir o próximo
  const next = company.data.company.nextNfeNumber;
  if (numberFrom <= next && numberTo >= next) {
    await client.execute({
      sql: `UPDATE companies SET next_nfe_number = ?, updated_at = unixepoch()
            WHERE id = ?`,
      args: [numberTo + 1, companyId],
    });
  }

  return {
    ok: true,
    data: {
      inutilization: mapInut(
        insert.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  };
}
