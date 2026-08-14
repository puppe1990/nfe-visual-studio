import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../db/client";
import { createFileDbClient as createDbClient } from "../db/file-client";
import type { LibsqlClient } from "../db/client";
import * as companies from "./companies";
import * as customers from "./customers";
import { listServiceInvoices } from "./service-invoices";

const VALID_CNPJ = "04252011000110";
const AVANT_CNPJ = "25238319000180";
const OTHER_CNPJ = "11444777000161";

describe("listServiceInvoices filters, sort and pagination", () => {
  let client: LibsqlClient;
  let dbDir: string;
  let companyId: number;
  let customerId: number;
  let otherCustomerId: number;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "nfse-list-"));
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

    const other = await customers.createCustomer(client, companyId, {
      name: "OUTRO",
      document: OTHER_CNPJ,
    });
    if (!other.ok) throw new Error("other");
    otherCustomerId = other.data.customer.id;

    const values: string[] = [];
    const args: Array<string | number> = [];
    for (let n = 1; n <= 12; n++) {
      const day = String(n).padStart(2, "0");
      values.push("(?, ?, 'A', ?, ?, '01880', 'svc', ?, ?, 0, ?, ?)");
      args.push(
        companyId,
        n === 1 ? otherCustomerId : customerId,
        n,
        n,
        n === 2 ? "canceled" : "authorized",
        n * 10_000,
        n * 10_000,
        Math.floor(Date.parse(`2026-01-${day}T12:00:00Z`) / 1000),
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

  it("returns 10 notes by default, newest first", async () => {
    const result = await listServiceInvoices(client, companyId);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.invoices).toHaveLength(10);
    expect(result.data.total).toBe(12);
    expect(result.data.page).toBe(1);
    expect(result.data.pageSize).toBe(10);
    expect(result.data.invoices[0]?.nfseNumber).toBe(12);
    expect(result.data.invoices[9]?.nfseNumber).toBe(3);
  });

  it("returns the next page", async () => {
    const result = await listServiceInvoices(client, companyId, { page: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.invoices.map((row) => row.nfseNumber)).toEqual([2, 1]);
    expect(result.data.total).toBe(12);
    expect(result.data.page).toBe(2);
  });

  it("filters by period", async () => {
    const result = await listServiceInvoices(client, companyId, {
      dateFrom: "2026-01-03",
      dateTo: "2026-01-05",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.total).toBe(3);
    expect(result.data.invoices.map((row) => row.nfseNumber)).toEqual([
      5, 4, 3,
    ]);
  });

  it("filters by status and customer", async () => {
    const canceled = await listServiceInvoices(client, companyId, {
      status: "canceled",
    });
    expect(canceled.ok).toBe(true);
    if (!canceled.ok) return;
    expect(canceled.data.total).toBe(1);
    expect(canceled.data.invoices[0]?.nfseNumber).toBe(2);

    const other = await listServiceInvoices(client, companyId, {
      customerId: otherCustomerId,
    });
    expect(other.ok).toBe(true);
    if (!other.ok) return;
    expect(other.data.total).toBe(1);
    expect(other.data.invoices[0]?.customerName).toBe("OUTRO");
  });

  it("sorts by total ascending", async () => {
    const result = await listServiceInvoices(client, companyId, {
      sort: "total",
      dir: "asc",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.invoices[0]?.nfseNumber).toBe(1);
    expect(result.data.invoices[1]?.nfseNumber).toBe(2);
    expect(result.data.invoices.map((row) => row.totalCents)).toEqual([
      10_000, 20_000, 30_000, 40_000, 50_000, 60_000, 70_000, 80_000, 90_000,
      100_000,
    ]);
  });
});
