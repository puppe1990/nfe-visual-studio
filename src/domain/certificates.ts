import type { Client } from "@libsql/client";

import { companyExists } from "./companies";
import type { ServiceResult } from "./types";

export type CompanyCertificate = {
  id: number;
  companyId: number;
  subject: string;
  serialNumber: string | null;
  notBefore: string | null;
  notAfter: string | null;
  active: boolean;
  hasPfx: boolean;
  createdAt: number;
  updatedAt: number;
};

/** Cifra simples (MVP) — não usar como segurança de produção. */
export function encryptPassword(password: string, secret = "nfe-mvp"): string {
  const key = secret;
  let out = "";
  for (let i = 0; i < password.length; i++) {
    out += String.fromCharCode(
      password.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return Buffer.from(out, "binary").toString("base64");
}

export function decryptPassword(cipher: string, secret = "nfe-mvp"): string {
  const raw = Buffer.from(cipher, "base64").toString("binary");
  const key = secret;
  let out = "";
  for (let i = 0; i < raw.length; i++) {
    out += String.fromCharCode(
      raw.charCodeAt(i) ^ key.charCodeAt(i % key.length),
    );
  }
  return out;
}

function mapCert(row: Record<string, unknown>): CompanyCertificate {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    subject: String(row.subject),
    serialNumber:
      row.serial_number == null ? null : String(row.serial_number),
    notBefore: row.not_before == null ? null : String(row.not_before),
    notAfter: row.not_after == null ? null : String(row.not_after),
    active: Number(row.active ?? 1) === 1,
    hasPfx: Boolean(row.pfx_base64 && String(row.pfx_base64).length > 0),
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  };
}

export async function registerCertificate(
  client: Client,
  companyId: number,
  payload: {
    subject?: string;
    serialNumber?: string | null;
    notBefore?: string | null;
    notAfter?: string | null;
    pfxBase64?: string;
    password?: string;
  },
): Promise<ServiceResult<{ certificate: CompanyCertificate }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Empresa não encontrada" },
    };
  }

  const subject = payload.subject?.trim();
  if (!subject) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Assunto do certificado é obrigatório" },
    };
  }
  const pfxBase64 = payload.pfxBase64?.trim();
  if (!pfxBase64 || pfxBase64.length < 16) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Conteúdo PFX (base64) é obrigatório",
      },
    };
  }
  const password = payload.password ?? "";
  if (!password) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Senha do certificado é obrigatória" },
    };
  }

  // Desativa certificados anteriores
  await client.execute({
    sql: `UPDATE company_certificates SET active = 0, updated_at = unixepoch()
          WHERE company_id = ? AND active = 1`,
    args: [companyId],
  });

  const result = await client.execute({
    sql: `INSERT INTO company_certificates (
            company_id, subject, serial_number, not_before, not_after,
            pfx_base64, password_cipher, active
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
          RETURNING *`,
    args: [
      companyId,
      subject,
      payload.serialNumber?.trim() || null,
      payload.notBefore?.trim() || null,
      payload.notAfter?.trim() || null,
      pfxBase64,
      encryptPassword(password),
    ],
  });

  return {
    ok: true,
    data: {
      certificate: mapCert(result.rows[0] as unknown as Record<string, unknown>),
    },
  };
}

export async function getActiveCertificate(
  client: Client,
  companyId: number,
): Promise<ServiceResult<{ certificate: CompanyCertificate | null }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Empresa não encontrada" },
    };
  }

  const result = await client.execute({
    sql: `SELECT * FROM company_certificates
          WHERE company_id = ? AND active = 1
          ORDER BY id DESC LIMIT 1`,
    args: [companyId],
  });

  if (result.rows.length === 0) {
    return { ok: true, data: { certificate: null } };
  }

  return {
    ok: true,
    data: {
      certificate: mapCert(
        result.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  };
}

export async function hasActiveCertificate(
  client: Client,
  companyId: number,
): Promise<boolean> {
  const result = await getActiveCertificate(client, companyId);
  return result.ok && result.data.certificate != null;
}

export async function listCertificates(
  client: Client,
  companyId: number,
): Promise<ServiceResult<{ certificates: CompanyCertificate[] }>> {
  if (!(await companyExists(client, companyId))) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "Empresa não encontrada" },
    };
  }

  const result = await client.execute({
    sql: `SELECT * FROM company_certificates
          WHERE company_id = ?
          ORDER BY id DESC`,
    args: [companyId],
  });

  return {
    ok: true,
    data: {
      certificates: result.rows.map((r) =>
        mapCert(r as unknown as Record<string, unknown>),
      ),
    },
  };
}
