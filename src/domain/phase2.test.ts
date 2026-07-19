import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createDbClient, migrate } from "../db/client";
import type { LibsqlClient } from "../db/client";
import * as certificates from "./certificates";
import * as companies from "./companies";
import * as customers from "./customers";
import * as invoices from "./invoices";
import * as inutilizations from "./inutilizations";
import { InMemoryMailSender } from "./mail";
import * as products from "./products";
import { FakeSefazClient, SimulatedSefazClient } from "./sefaz";

const VALID_CNPJ = "04252011000110";
const VALID_CPF = "52998224725";

describe("phase 2 — sefaz, A1, cancel, inutilize, mail", () => {
  let client: LibsqlClient;
  let dbDir: string;
  let companyId: number;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "nfe-p2-"));
    client = createDbClient({ url: `file:${join(dbDir, "test.db")}` });
    await migrate(client);

    const company = await companies.createCompany(client, {
      name: "Comercial LTDA",
      document: VALID_CNPJ,
      taxRegime: "simples",
      sefazEnvironment: "homologation",
    });
    if (!company.ok) throw new Error("company");
    companyId = company.data.company.id;
  });

  afterEach(() => {
    client.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  async function authorizedInvoice() {
    const customer = await customers.createCustomer(client, companyId, {
      name: "Cliente",
      document: VALID_CPF,
      email: "cliente@example.com",
    });
    if (!customer.ok) throw new Error("customer");
    const product = await products.createProduct(client, companyId, {
      name: "Item",
      ncm: "99999999",
      priceCents: 10_000,
    });
    if (!product.ok) throw new Error("product");
    const draft = await invoices.createInvoiceDraft(client, companyId, {
      customerId: customer.data.customer.id,
      items: [
        {
          productId: product.data.product.id,
          description: "Item",
          ncm: "99999999",
          quantity: 1,
          unitPriceCents: 10_000,
        },
      ],
    });
    if (!draft.ok) throw new Error("draft");
    const tx = await invoices.transmitInvoice(
      client,
      companyId,
      draft.data.invoice.id,
      new SimulatedSefazClient(),
    );
    if (!tx.ok) throw new Error("tx");
    return tx.data.invoice;
  }

  describe("certificates", () => {
    it("registers A1 and exposes active cert without password", async () => {
      const reg = await certificates.registerCertificate(client, companyId, {
        subject: "CN=Comercial LTDA:04252011000110",
        serialNumber: "ABC123",
        pfxBase64: "A".repeat(32),
        password: "segredo",
      });
      expect(reg.ok).toBe(true);
      if (!reg.ok) return;
      expect(reg.data.certificate.active).toBe(true);
      expect(reg.data.certificate.hasPfx).toBe(true);

      const active = await certificates.getActiveCertificate(client, companyId);
      expect(active.ok).toBe(true);
      if (active.ok) expect(active.data.certificate?.subject).toContain("Comercial");

      expect(certificates.encryptPassword("x")).not.toBe("x");
      expect(certificates.decryptPassword(certificates.encryptPassword("x"))).toBe(
        "x",
      );
    });

    it("requires pfx and password", async () => {
      const bad = await certificates.registerCertificate(client, companyId, {
        subject: "CN=X",
        pfxBase64: "short",
        password: "",
      });
      expect(bad.ok).toBe(false);
    });
  });

  describe("sefaz adapter", () => {
    it("production without cert rejects authorize", async () => {
      await companies.updateCompany(client, companyId, {
        sefazEnvironment: "production",
      });
      const customer = await customers.createCustomer(client, companyId, {
        name: "C",
        document: VALID_CPF,
      });
      if (!customer.ok) throw new Error("c");
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId: customer.data.customer.id,
        items: [
          { description: "X", quantity: 1, unitPriceCents: 1000 },
        ],
      });
      if (!draft.ok) throw new Error("d");
      const tx = await invoices.transmitInvoice(
        client,
        companyId,
        draft.data.invoice.id,
        new SimulatedSefazClient(),
      );
      expect(tx.ok).toBe(true);
      if (!tx.ok) return;
      expect(tx.data.invoice.status).toBe("rejected");
      expect(tx.data.invoice.rejectionReason).toMatch(/Certificado/i);
    });

    it("stores protocol and access key on authorize", async () => {
      const inv = await authorizedInvoice();
      expect(inv.status).toBe("authorized");
      expect(inv.sefazProtocol).toMatch(/^SIM-/);
      expect(inv.accessKey?.length).toBe(44);
    });
  });

  describe("cancel", () => {
    it("cancels authorized invoice with valid justification", async () => {
      const inv = await authorizedInvoice();
      const cancel = await invoices.cancelInvoice(
        client,
        companyId,
        inv.id,
        "Erro de digitação no valor da nota",
        new SimulatedSefazClient(),
      );
      expect(cancel.ok).toBe(true);
      if (!cancel.ok) return;
      expect(cancel.data.invoice.status).toBe("canceled");
      expect(cancel.data.invoice.cancelProtocol).toMatch(/^CANC-/);
    });

    it("rejects short justification", async () => {
      const inv = await authorizedInvoice();
      const cancel = await invoices.cancelInvoice(
        client,
        companyId,
        inv.id,
        "curto",
      );
      expect(cancel.ok).toBe(false);
    });
  });

  describe("inutilize", () => {
    it("inutilizes free number range and advances next number", async () => {
      const company = await companies.getCompany(client, companyId);
      if (!company.ok) throw new Error("co");
      expect(company.data.company.nextNfeNumber).toBe(1);

      const result = await inutilizations.inutilizeNumbers(
        client,
        companyId,
        {
          numberFrom: 1,
          numberTo: 3,
          justification: "Quebra de sequência de numeração",
        },
        new SimulatedSefazClient(),
      );
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.data.inutilization.protocol).toMatch(/^INUT-/);

      const after = await companies.getCompany(client, companyId);
      if (!after.ok) throw new Error("after");
      expect(after.data.company.nextNfeNumber).toBe(4);
    });

    it("blocks range with used numbers", async () => {
      await authorizedInvoice(); // uses number 1
      const result = await inutilizations.inutilizeNumbers(
        client,
        companyId,
        {
          numberFrom: 1,
          numberTo: 1,
          justification: "Tentativa sobre número usado já",
        },
      );
      expect(result.ok).toBe(false);
    });
  });

  describe("mail", () => {
    it("sends xml email to customer", async () => {
      const inv = await authorizedInvoice();
      const mail = new InMemoryMailSender();
      const sent = await invoices.sendInvoiceEmail(
        client,
        companyId,
        inv.id,
        null,
        mail,
      );
      expect(sent.ok).toBe(true);
      expect(mail.sent).toHaveLength(1);
      expect(mail.sent[0].to).toBe("cliente@example.com");
      expect(mail.sent[0].attachments?.[0]?.filename).toMatch(/\.xml$/);
    });
  });

  describe("fake sefaz", () => {
    it("propagates forced rejection", async () => {
      const customer = await customers.createCustomer(client, companyId, {
        name: "C",
        document: VALID_CPF,
      });
      if (!customer.ok) throw new Error("c");
      const draft = await invoices.createInvoiceDraft(client, companyId, {
        customerId: customer.data.customer.id,
        items: [
          { description: "X", quantity: 1, unitPriceCents: 500 },
        ],
      });
      if (!draft.ok) throw new Error("d");
      const fake = new FakeSefazClient({
        authorize: { ok: false, rejectionReason: "SEFAZ offline" },
      });
      const tx = await invoices.transmitInvoice(
        client,
        companyId,
        draft.data.invoice.id,
        fake,
      );
      expect(tx.ok).toBe(true);
      if (tx.ok) {
        expect(tx.data.invoice.status).toBe("rejected");
        expect(tx.data.invoice.rejectionReason).toBe("SEFAZ offline");
      }
    });
  });
});
