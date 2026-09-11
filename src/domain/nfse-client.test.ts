import { describe, expect, it } from "vitest";

import { NFSE_SP_ENDPOINT, NFSE_SP_FALLBACK, callNfseSoap } from "./nfse-client";

const SOAP_OK = `<soap:Envelope><soap:Body><EnvioRPSResponse xmlns="http://www.prefeitura.sp.gov.br/nfe"><RetornoXML><RetornoEnvioRPS><Cabecalho Versao="1"><Sucesso>true</Sucesso></Cabecalho></RetornoEnvioRPS></RetornoXML></EnvioRPSResponse></soap:Body></soap:Envelope>`;

describe("callNfseSoap fallback", () => {
  it("retries the Pref SP fallback when the primary endpoint is unreachable", async () => {
    const urls: string[] = [];
    const result = await callNfseSoap({
      method: "EnvioRPS",
      mensagemXml: "<PedidoEnvioRPS/>",
      pfxBase64: Buffer.from("x").toString("base64"),
      password: "x",
      postFn: async ({ url }) => {
        urls.push(url);
        if (url === NFSE_SP_ENDPOINT) {
          throw new Error("Timeout na chamada da Prefeitura de São Paulo");
        }
        return { statusCode: 200, body: SOAP_OK };
      },
    });
    expect(urls).toEqual([NFSE_SP_ENDPOINT, NFSE_SP_FALLBACK]);
    expect(result.statusCode).toBe(200);
    expect(result.retornoXml).toContain("Sucesso");
  });
});
