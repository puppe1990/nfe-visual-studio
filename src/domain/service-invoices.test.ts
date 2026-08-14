import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { migrate } from "../db/client";
import { createFileDbClient as createDbClient } from "../db/file-client";
import type { LibsqlClient } from "../db/client";
import * as certificates from "./certificates";
import * as companies from "./companies";
import * as customers from "./customers";
import { generateTestPfx } from "./sefaz-sign";
import * as invoices from "./invoices";
import {
  createServiceInvoiceDraft,
  transmitServiceInvoice,
} from "./service-invoices";

const VALID_CNPJ = "04252011000110";
const AVANT_CNPJ = "25238319000180";

describe("NFS-e service invoices", () => {
  let client: LibsqlClient;
  let dbDir: string;
  let companyId: number;
  let customerId: number;

  beforeEach(async () => {
    dbDir = mkdtempSync(join(tmpdir(), "nfse-"));
    client = createDbClient({ url: `file:${join(dbDir, "test.db")}` });
    await migrate(client);

    const company = await companies.createCompany(client, {
      name: "MATHEUS NUNES PUPPE 02399708024",
      document: VALID_CNPJ,
      taxRegime: "simples",
    });
    if (!company.ok) throw new Error("company");
    companyId = company.data.company.id;
    await companies.updateCompany(client, companyId, {
      municipalRegistration: "62105809",
      rpsSeries: "A",
      nextRpsNumber: 1,
    });

    const { pfxBase64, password } = generateTestPfx("x");
    const cert = await certificates.registerCertificate(client, companyId, {
      subject: "A1 teste",
      pfxBase64,
      password,
    });
    if (!cert.ok) throw new Error("cert");

    const customer = await customers.createCustomer(client, companyId, {
      name: "AVANT-PROJETOS, INVESTIMENTOS E PARTICIPACOES LTDA",
      document: AVANT_CNPJ,
      email: "tiago.pagani@ploomes.com",
      street: "CARLOS GOMES",
      number: "700",
      complement: "ANDAR 8",
      district: "BOA VISTA",
      city: "Porto Alegre",
      state: "RS",
      zip: "90480000",
    });
    if (!customer.ok) throw new Error("customer");
    customerId = customer.data.customer.id;
  });

  afterEach(() => {
    client.close();
    rmSync(dbDir, { recursive: true, force: true });
  });

  it("creates a draft and authorizes via injected Pref SP SOAP", async () => {
    const draft = await createServiceInvoiceDraft(client, companyId, {
      customerId,
      discrimination: "Servicos de assistencia tecnica no site institucional.",
      serviceCents: 150_000,
      serviceCode: "01880",
    });
    expect(draft.ok).toBe(true);
    if (!draft.ok) return;
    expect(draft.data.invoice.rpsNumber).toBe(1);
    expect(draft.data.invoice.serviceCode).toBe("01880");

    const tx = await transmitServiceInvoice(
      client,
      companyId,
      draft.data.invoice.id,
      {
        issuedOn: "2026-08-14",
        postFn: async () => ({
          statusCode: 200,
          body: `<soap:Envelope><soap:Body><EnvioRPSResponse xmlns="http://www.prefeitura.sp.gov.br/nfe"><RetornoXML>&lt;RetornoEnvioRPS&gt;&lt;Cabecalho Versao="1"&gt;&lt;Sucesso&gt;true&lt;/Sucesso&gt;&lt;/Cabecalho&gt;&lt;ChaveNFeRPS&gt;&lt;ChaveNFe&gt;&lt;InscricaoPrestador&gt;62105809&lt;/InscricaoPrestador&gt;&lt;NumeroNFe&gt;72&lt;/NumeroNFe&gt;&lt;CodigoVerificacao&gt;NBIK-9INN&lt;/CodigoVerificacao&gt;&lt;/ChaveNFe&gt;&lt;/ChaveNFeRPS&gt;&lt;/RetornoEnvioRPS&gt;</RetornoXML></EnvioRPSResponse></soap:Body></soap:Envelope>`,
        }),
      },
    );
    expect(tx.ok).toBe(true);
    if (!tx.ok) return;
    expect(tx.data.invoice.status).toBe("authorized");
    expect(tx.data.invoice.nfseNumber).toBe(72);
    expect(tx.data.invoice.verificationCode).toBe("NBIK-9INN");

    const metrics = await invoices.getDashboardMetrics(client, companyId);
    expect(metrics.ok).toBe(true);
    if (!metrics.ok) return;
    expect(metrics.data.authorizedCount).toBe(1);
    expect(metrics.data.revenueCents).toBe(150_000);
    expect(metrics.data.recentItems.some((item) => item.kind === "nfse")).toBe(
      true,
    );
  });
});
