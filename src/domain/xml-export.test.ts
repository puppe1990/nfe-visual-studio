import { describe, expect, it } from "vitest";

import type { Company, Customer, Invoice } from "./types";
import {
  accessKeyCheckDigit,
  buildAccessKey,
  buildInvoiceXml,
  buildInvoiceXmlDocument,
  crtFromTaxRegime,
  resolveIbgeCityCode,
} from "./xml-export";

const company: Company = {
  id: 1,
  name: "Comercial LTDA",
  tradeName: "Comercial",
  document: "04252011000110",
  stateRegistration: "123456789012",
  email: "emit@test.com",
  phone: null,
  zip: "01001000",
  street: "Praca da Se",
  number: "100",
  complement: null,
  district: "Se",
  city: "Sao Paulo",
  state: "SP",
  taxRegime: "simples",
  nfeSeries: 1,
  nextNfeNumber: 1,
  sefazEnvironment: "homologation",
  createdAt: 0,
  updatedAt: 0,
};

const customer: Customer = {
  id: 1,
  companyId: 1,
  name: "Cliente Teste",
  document: "52998224725",
  stateRegistration: null,
  email: "cli@test.com",
  phone: null,
  zip: "01310100",
  street: "Av Paulista",
  number: "1000",
  complement: null,
  district: "Bela Vista",
  city: "Sao Paulo",
  state: "SP",
  notes: null,
  createdAt: 0,
  updatedAt: 0,
};

const invoice: Invoice = {
  id: 1,
  companyId: 1,
  customerId: 1,
  number: 1,
  series: 1,
  nature: "Venda de mercadoria",
  cfop: "5102",
  status: "draft",
  subtotalCents: 10_000,
  taxCents: 600,
  stCents: 0,
  totalCents: 10_600,
  xmlContent: null,
  rejectionReason: null,
  sefazProtocol: null,
  accessKey: null,
  cancelProtocol: null,
  cancelJustification: null,
  canceledAt: null,
  issuedAt: null,
  items: [
    {
      id: 1,
      invoiceId: 1,
      productId: 9,
      description: "Parafuso M6",
      ncm: "73181500",
      quantity: 2,
      unitPriceCents: 5_000,
      totalCents: 10_000,
      createdAt: 0,
    },
  ],
  createdAt: 0,
  updatedAt: 0,
};

describe("access key", () => {
  it("computes modulo 11 check digit", () => {
    const key = buildAccessKey({
      uf: "SP",
      issueDate: new Date("2026-07-19T12:00:00Z"),
      cnpj: "04252011000110",
      series: 1,
      number: 1,
      cNF: "12345678",
    });
    const body = key.slice(0, 43);
    expect(body).toHaveLength(43);
    expect(accessKeyCheckDigit(body)).toBe(key.slice(-1));
  });

  it("builds 44-digit access key", () => {
    const key = buildAccessKey({
      uf: "SP",
      issueDate: new Date("2026-07-19T12:00:00Z"),
      cnpj: "04252011000110",
      series: 1,
      number: 1,
      cNF: "12345678",
    });
    expect(key).toHaveLength(44);
    expect(key.startsWith("35")).toBe(true);
    expect(key.slice(6, 20)).toBe("04252011000110");
  });
});

describe("buildInvoiceXml layout 4.00", () => {
  it("includes required groups for homologation", () => {
    const { nfeXml, accessKey, infNFeId } = buildInvoiceXmlDocument({
      company,
      customer,
      invoice,
      issueDate: new Date("2026-07-19T15:00:00Z"),
      cNF: "87654321",
    });

    expect(accessKey).toHaveLength(44);
    expect(infNFeId).toBe(`NFe${accessKey}`);
    expect(nfeXml).toContain(`Id="${infNFeId}"`);
    expect(nfeXml).toContain('versao="4.00"');
    expect(nfeXml).toContain("<mod>55</mod>");
    expect(nfeXml).toContain("<tpAmb>2</tpAmb>");
    expect(nfeXml).toContain("<CRT>1</CRT>");
    expect(nfeXml).toContain("<enderEmit>");
    expect(nfeXml).toContain("<enderDest>");
    expect(nfeXml).toContain("<cMun>3550308</cMun>");
    expect(nfeXml).toContain("<CFOP>5102</CFOP>");
    expect(nfeXml).toContain("<NCM>73181500</NCM>");
    expect(nfeXml).toContain("<ICMSSN102>");
    expect(nfeXml).toContain("<CSOSN>102</CSOSN>");
    expect(nfeXml).toContain("<PISNT>");
    expect(nfeXml).toContain("<COFINSNT>");
    expect(nfeXml).toContain("<ICMSTot>");
    expect(nfeXml).toContain("<vProd>100.00</vProd>");
    expect(nfeXml).toContain("<vNF>100.00</vNF>");
    expect(nfeXml).toContain("<modFrete>9</modFrete>");
    expect(nfeXml).toContain("<detPag>");
    expect(nfeXml).toContain("<tPag>99</tPag>");
    // nome forçado em homologação
    expect(nfeXml).toContain(
      "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL",
    );
    // CFOP só no item (prod), não no ide
    expect(nfeXml).toMatch(/<\/ide>[\s\S]*<CFOP>5102<\/CFOP>/);
    expect(nfeXml).not.toMatch(/<ide>[\s\S]*?<CFOP>[\s\S]*?<\/ide>/);
  });

  it("uses normal ICMS group for non-simples", () => {
    const xml = buildInvoiceXml({
      company: { ...company, taxRegime: "presumido" },
      customer,
      invoice,
      cNF: "11111111",
    });
    expect(xml).toContain("<ICMS00>");
    expect(xml).toContain("<CRT>3</CRT>");
  });

  it("maps helpers", () => {
    expect(crtFromTaxRegime("simples")).toBe("1");
    expect(crtFromTaxRegime("real")).toBe("3");
    expect(resolveIbgeCityCode("Sao Paulo", "SP")).toBe("3550308");
  });
});
