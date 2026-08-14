import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../db/client";
import { createFileDbClient as createDbClient } from "../db/file-client";
import type { LibsqlClient } from "../db/client";
import {
  getWorkspaceForUser,
  hashPassword,
  changePassword,
  loginUser,
  registerTenant,
  verifyPassword,
} from "./auth";

describe("auth and multi-tenant workspace", () => {
  let client: LibsqlClient;
  let dbDir: string;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "auth-"));
    client = createDbClient({ url: `file:${join(dbDir, "test.db")}` });
    await migrate(client);
  });

  afterEach(() => {
    client.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it("hashes and verifies passwords", () => {
    const stored = hashPassword("segredo-forte");
    expect(stored).not.toBe("segredo-forte");
    expect(verifyPassword("segredo-forte", stored)).toBe(true);
    expect(verifyPassword("outra", stored)).toBe(false);
  });

  it("registers a tenant and logs in", async () => {
    const created = await registerTenant(client, {
      email: "ana@example.com",
      name: "Ana",
      password: "senha-ana-123",
      companyName: "Ana Serviços",
      document: "11444777000161",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const login = await loginUser(client, "ana@example.com", "senha-ana-123");
    expect(login.ok).toBe(true);
    if (!login.ok) return;
    expect(login.data.user.email).toBe("ana@example.com");
    expect(login.data.company.id).toBe(created.data.company.id);
  });

  it("isolates companies between users", async () => {
    const a = await registerTenant(client, {
      email: "a@example.com",
      name: "A",
      password: "senha-aaaa-11",
      companyName: "Empresa A",
      document: "04252011000110",
    });
    const b = await registerTenant(client, {
      email: "b@example.com",
      name: "B",
      password: "senha-bbbb-22",
      companyName: "Empresa B",
      document: "11444777000161",
    });
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;

    const wa = await getWorkspaceForUser(client, a.data.user.id);
    const wb = await getWorkspaceForUser(client, b.data.user.id);
    expect(wa.ok && wb.ok).toBe(true);
    if (!wa.ok || !wb.ok) return;
    expect(wa.data.company.id).not.toBe(wb.data.company.id);
    expect(wa.data.company.document).toBe("04252011000110");
    expect(wb.data.company.document).toBe("11444777000161");
  });

  it("rejects wrong password", async () => {
    await registerTenant(client, {
      email: "c@example.com",
      name: "C",
      password: "senha-certa-99",
      companyName: "C Ltda",
      document: "04252011000110",
    });
    const bad = await loginUser(client, "c@example.com", "errada");
    expect(bad.ok).toBe(false);
  });

  it("changes password only with the current password", async () => {
    const created = await registerTenant(client, {
      email: "d@example.com",
      name: "D",
      password: "senha-antiga-1",
      companyName: "D Ltda",
      document: "04252011000110",
    });
    expect(created.ok).toBe(true);
    if (!created.ok) return;

    const wrong = await changePassword(
      client,
      created.data.user.id,
      "nao-e-essa",
      "senha-nova-99",
    );
    expect(wrong.ok).toBe(false);

    const ok = await changePassword(
      client,
      created.data.user.id,
      "senha-antiga-1",
      "senha-nova-99",
    );
    expect(ok.ok).toBe(true);

    const oldLogin = await loginUser(client, "d@example.com", "senha-antiga-1");
    expect(oldLogin.ok).toBe(false);
    const newLogin = await loginUser(client, "d@example.com", "senha-nova-99");
    expect(newLogin.ok).toBe(true);
  });
});

