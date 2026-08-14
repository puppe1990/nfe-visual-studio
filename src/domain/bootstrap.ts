import type { Client } from "@libsql/client";

import { attachOwnerToCompany } from "./auth";
import { createCompany, getCompany } from "./companies";
import type { Company, ServiceResult } from "./types";

/** CNPJ de demo (válido) para ambiente local sem auth. */
export const DEMO_COMPANY_DOCUMENT = "04252011000110";

/**
 * Garante uma empresa de trabalho no banco.
 * MVP: sem login — usa a primeira empresa ou cria a demo.
 */
export async function ensureWorkspace(
  client: Client,
): Promise<ServiceResult<{ company: Company }>> {
  const existing = await client.execute({
    sql: "SELECT id FROM companies ORDER BY id ASC LIMIT 1",
    args: [],
  });

  if (existing.rows.length > 0) {
    const id = Number((existing.rows[0] as unknown as { id: number }).id);
    return getCompany(client, id);
  }

  return createCompany(client, {
    name: "Comercial LTDA",
    tradeName: "NFeFácil Demo",
    document: DEMO_COMPANY_DOCUMENT,
    stateRegistration: "Isento",
    email: "contato@comercial.demo",
    city: "São Paulo",
    state: "SP",
    taxRegime: "simples",
    nfeSeries: 1,
    nextNfeNumber: 1,
    sefazEnvironment: "homologation",
  });
}

export const OWNER_EMAIL = "matheus.puppe@gmail.com";

/** Liga o emitente existente ao e-mail do dono. */
export async function seedOwnerAccount(client: Client): Promise<void> {
  const companies = await client.execute(
    "SELECT id FROM companies ORDER BY id ASC LIMIT 1",
  );
  if (companies.rows.length === 0) return;
  const companyId = Number(
    (companies.rows[0] as unknown as { id: number }).id,
  );
  const password = process.env.OWNER_BOOTSTRAP_PASSWORD;
  if (!password) return;
  const email = process.env.OWNER_BOOTSTRAP_EMAIL ?? OWNER_EMAIL;
  await attachOwnerToCompany(client, {
    email,
    name: "Matheus Nunes Puppe",
    password,
    companyId,
  });
  await client.execute({
    sql: `UPDATE companies SET email = ?, updated_at = unixepoch() WHERE id = ?`,
    args: [email, companyId],
  });
}
