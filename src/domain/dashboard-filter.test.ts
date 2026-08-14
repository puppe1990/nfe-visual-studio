import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDbClient, migrate } from "../db/client";
import type { LibsqlClient } from "../db/client";
import * as companies from "./companies";
import * as customers from "./customers";
import { getDashboardMetrics } from "./invoices";

const VALID_CNPJ = "04252011000110";
const AVANT_CNPJ = "25238319000180";

describe("dashboard filters", () => {
  let client: LibsqlClient;
  let dbDir: string;
  let companyId: number;
  let customerId: number;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "dash-"));
    client = createDbClient({ url: `file:${join(dbDir, "test.db")}` });
    await migrate(client);
    const company = await companies.createCompany(client, {
      name: "Emitente",
      document: VALID_CNPJ,
    });
    if (!company.ok) throw new Error("company");
    companyId = company.data.company.id;
    const customer = await customers.createCustomer(client, companyId, {
      name: "AVANT",
      document: AVANT_CNPJ,
    });
    if (!customer.ok) throw new Error("customer");
    customerId = customer.data.customer.id;

    await client.execute({
      sql: `INSERT INTO service_invoices (
              company_id, customer_id, rps_series, rps_number, nfse_number,
              service_code, discrimination, status, subtotal_cents, iss_cents,
              total_cents, issued_at
            ) VALUES
              (?, ?, 'A', 1, 10, '01880', 'antiga', 'authorized', 100000, 5000, 100000, unixepoch('2026-03-20')),
              (?, ?, 'A', 2, 11, '01880', 'recente', 'authorized', 200000, 10000, 200000, unixepoch('2026-08-14'))`,
      args: [companyId, customerId, companyId, customerId],
    });
  });

  afterEach(() => {
    client.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it("counts all authorized NFS-e without filter", async () => {
    const metrics = await getDashboardMetrics(client, companyId);
    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.data.authorizedCount).toBe(2);
    expect(metrics.data.revenueCents).toBe(300000);
  });

  it("filters authorized notes by period", async () => {
    const metrics = await getDashboardMetrics(client, companyId, {
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });
    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.data.authorizedCount).toBe(1);
    expect(metrics.data.revenueCents).toBe(200000);
    expect(metrics.data.recentItems).toHaveLength(1);
    expect(metrics.data.recentItems[0]?.numberLabel).toBe("NFS-e 11");
  });

  it("filters by document kind", async () => {
    const onlyNfe = await getDashboardMetrics(client, companyId, {
      kind: "nfe",
    });
    expect(onlyNfe.ok).toBe(true);
    if (!onlyNfe.ok) return;
    expect(onlyNfe.data.authorizedCount).toBe(0);

    const onlyNfse = await getDashboardMetrics(client, companyId, {
      kind: "nfse",
    });
    expect(onlyNfse.ok).toBe(true);
    if (!onlyNfse.ok) return;
    expect(onlyNfse.data.authorizedCount).toBe(2);
  });
});

describe("dashboard list pagination", () => {
  let client: LibsqlClient;
  let dbDir: string;
  let companyId: number;
  let customerId: number;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "dash-page-"));
    client = createDbClient({ url: `file:${join(dbDir, "test.db")}` });
    await migrate(client);
    const company = await companies.createCompany(client, {
      name: "Emitente",
      document: VALID_CNPJ,
    });
    if (!company.ok) throw new Error("company");
    companyId = company.data.company.id;
    const customer = await customers.createCustomer(client, companyId, {
      name: "AVANT",
      document: AVANT_CNPJ,
    });
    if (!customer.ok) throw new Error("customer");
    customerId = customer.data.customer.id;

    const values: string[] = [];
    const args: Array<string | number> = [];
    for (let n = 1; n <= 12; n++) {
      values.push("(?, ?, 'A', ?, ?, '01880', 'svc', 'authorized', 100000, 5000, 100000, ?)");
      args.push(
        companyId,
        customerId,
        n,
        n,
        1_700_000_000 + n * 86_400,
      );
    }
    await client.execute({
      sql: `INSERT INTO service_invoices (
              company_id, customer_id, rps_series, rps_number, nfse_number,
              service_code, discrimination, status, subtotal_cents, iss_cents,
              total_cents, issued_at
            ) VALUES ${values.join(", ")}`,
      args,
    });
  });

  afterEach(() => {
    client.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it("returns 10 notes by default and the full matching total", async () => {
    const metrics = await getDashboardMetrics(client, companyId);
    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.data.recentItems).toHaveLength(10);
    expect(metrics.data.recentTotal).toBe(12);
    expect(metrics.data.page).toBe(1);
    expect(metrics.data.pageSize).toBe(10);
    expect(metrics.data.recentItems[0]?.numberLabel).toBe("NFS-e 12");
    expect(metrics.data.recentItems[9]?.numberLabel).toBe("NFS-e 3");
  });

  it("returns the next page of notes", async () => {
    const metrics = await getDashboardMetrics(client, companyId, { page: 2 });
    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.data.recentItems).toHaveLength(2);
    expect(metrics.data.recentTotal).toBe(12);
    expect(metrics.data.page).toBe(2);
    expect(metrics.data.recentItems.map((item) => item.numberLabel)).toEqual([
      "NFS-e 2",
      "NFS-e 1",
    ]);
  });
});
