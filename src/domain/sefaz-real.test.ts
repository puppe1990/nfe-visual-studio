import { describe, expect, it } from "vitest";

import { getSefazEndpoint, resolveSefazAuthority } from "./sefaz-endpoints";
import { RealSefazClient } from "./sefaz-real";
import {
  extractNFeXml,
  generateTestPfx,
  loadA1FromPfx,
  signNFeXml,
} from "./sefaz-sign";
import { buildAutorizacaoSoap, buildEnviNFe, parseAuthorizeResponse } from "./sefaz-soap";

const sampleNFe = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="NFe35260704252011000110550010000000011000000010" versao="4.00">
    <ide><cUF>35</cUF><mod>55</mod><serie>1</serie><nNF>1</nNF><tpAmb>2</tpAmb></ide>
    <emit><CNPJ>04252011000110</CNPJ><xNome>Teste</xNome></emit>
    <total><ICMSTot><vNF>10.00</vNF></ICMSTot></total>
  </infNFe>
</NFe>`;

describe("sefaz endpoints", () => {
  it("resolves SP and SVRS", () => {
    expect(resolveSefazAuthority("SP")).toBe("SP");
    expect(resolveSefazAuthority("SC")).toBe("SVRS");
    expect(
      getSefazEndpoint({
        uf: "SP",
        environment: "homologation",
        service: "autorizacao",
      }),
    ).toContain("homologacao.nfe.fazenda.sp.gov.br");
  });
});

describe("sefaz sign", () => {
  it("loads test PFX and signs NFe with Signature node", () => {
    const { pfxBase64, password } = generateTestPfx("senha-teste");
    const a1 = loadA1FromPfx(pfxBase64, password);
    expect(a1.privateKeyPem).toContain("PRIVATE KEY");
    expect(a1.certificatePem).toContain("CERTIFICATE");

    const nfe = extractNFeXml(sampleNFe);
    const signed = signNFeXml(nfe, a1);
    expect(signed).toContain("Signature");
    expect(signed).toContain("SignatureValue");
    expect(signed).toContain("infNFe");
  });
});

describe("sefaz soap parse", () => {
  it("parses authorized response", () => {
    const soap = `<?xml version="1.0"?><soap:Envelope><soap:Body>
      <retEnviNFe><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo>
      <protNFe><infProt><nProt>135260000000001</nProt><chNFe>35260704252011000110550010000000011000000010</chNFe></infProt></protNFe>
      </retEnviNFe></soap:Body></soap:Envelope>`;
    const parsed = parseAuthorizeResponse(soap);
    expect(parsed.cStat).toBe("100");
    expect(parsed.nProt).toBe("135260000000001");
    expect(parsed.chNFe).toHaveLength(44);
  });
});

describe("RealSefazClient", () => {
  it("rejects without certificate material", async () => {
    const client = new RealSefazClient({ uf: "SP" });
    const result = await client.authorize({
      companyDocument: "04252011000110",
      series: 1,
      number: 1,
      environment: "homologation",
      xml: sampleNFe,
      hasCertificate: false,
      certificate: null,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejectionReason).toMatch(/Certificado A1/i);
  });

  it("authorize posts SOAP and maps SEFAZ success", async () => {
    const { pfxBase64, password } = generateTestPfx("x");
    const client = new RealSefazClient({
      uf: "SP",
      postFn: async ({ body }) => {
        expect(body).toContain("nfeDadosMsg");
        expect(body).toContain("enviNFe");
        expect(body).toContain("Signature");
        return {
          statusCode: 200,
          body: `<?xml version="1.0"?><soap:Envelope><soap:Body>
            <retEnviNFe><cStat>100</cStat><xMotivo>Autorizado</xMotivo>
            <protNFe><infProt><nProt>135999</nProt><chNFe>35260704252011000110550010000000011000000010</chNFe></infProt></protNFe>
            </retEnviNFe></soap:Body></soap:Envelope>`,
        };
      },
    });

    const result = await client.authorize({
      companyDocument: "04252011000110",
      series: 1,
      number: 1,
      environment: "homologation",
      xml: sampleNFe,
      hasCertificate: true,
      certificate: { pfxBase64, password },
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.protocol).toBe("135999");
    expect(result.accessKey).toHaveLength(44);
    expect(result.authorizedXml).toContain("protNFe");
  });

  it("authorize maps SEFAZ rejection", async () => {
    const { pfxBase64, password } = generateTestPfx("x");
    const client = new RealSefazClient({
      uf: "SP",
      postFn: async () => ({
        statusCode: 200,
        body: `<retEnviNFe><cStat>215</cStat><xMotivo>Falha no schema XML</xMotivo></retEnviNFe>`,
      }),
    });

    const result = await client.authorize({
      companyDocument: "04252011000110",
      series: 1,
      number: 1,
      environment: "homologation",
      xml: sampleNFe,
      hasCertificate: true,
      certificate: { pfxBase64, password },
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.rejectionReason).toMatch(/schema/i);
  });

  it("builds enviNFe envelope helpers", () => {
    const envi = buildEnviNFe("<NFe/>", "123");
    expect(envi).toContain("idLote>123");
    expect(buildAutorizacaoSoap(envi)).toContain("NFeAutorizacao4");
  });
});
