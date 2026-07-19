import https from "node:https";
import { URL } from "node:url";

export type SoapPostOptions = {
  url: string;
  body: string;
  pfxBase64: string;
  password: string;
  /** Injetável em testes */
  postFn?: typeof soapPostHttps;
};

/**
 * POST SOAP 1.2 com mTLS (certificado A1).
 */
export function soapPostHttps(input: {
  url: string;
  body: string;
  pfx: Buffer;
  passphrase: string;
  timeoutMs?: number;
}): Promise<{ statusCode: number; body: string }> {
  const u = new URL(input.url);
  const timeoutMs = input.timeoutMs ?? 60_000;

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || 443,
        path: `${u.pathname}${u.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/soap+xml; charset=utf-8",
          "Content-Length": Buffer.byteLength(input.body, "utf8"),
        },
        pfx: input.pfx,
        passphrase: input.passphrase,
        rejectUnauthorized: true,
        timeout: timeoutMs,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c) => chunks.push(Buffer.from(c)));
        res.on("end", () => {
          resolve({
            statusCode: res.statusCode ?? 0,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy(new Error("Timeout na chamada SEFAZ"));
    });
    req.write(input.body, "utf8");
    req.end();
  });
}

export async function sefazSoapPost(
  options: SoapPostOptions,
): Promise<{ statusCode: number; body: string }> {
  const post = options.postFn ?? soapPostHttps;
  return post({
    url: options.url,
    body: options.body,
    pfx: Buffer.from(options.pfxBase64.replace(/\s/g, ""), "base64"),
    passphrase: options.password,
  });
}

export function buildAutorizacaoSoap(enviNFeXml: string): string {
  // SOAP 1.2 — corpo com nfeDadosMsg (padrão NF-e 4.00)
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4">${enviNFeXml}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function buildRetAutorizacaoSoap(consReciXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRetAutorizacao4">${consReciXml}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function buildRecepcaoEventoSoap(envEventoXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${envEventoXml}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function buildInutilizacaoSoap(inutXml: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeInutilizacao4">${inutXml}</nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
}

export function buildEnviNFe(signedNFe: string, loteId: string): string {
  // indSinc=1 tenta processamento síncrono (quando a UF suporta)
  return `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${loteId}</idLote><indSinc>1</indSinc>${signedNFe}</enviNFe>`;
}

export function parseTag(xml: string, tag: string): string | null {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

export function parseAuthorizeResponse(soapBody: string): {
  cStat: string | null;
  xMotivo: string | null;
  nProt: string | null;
  chNFe: string | null;
  nRec: string | null;
  protXml: string | null;
} {
  const cStat =
    parseTag(soapBody, "cStat") ??
    // às vezes vem em retEnviNFe / protNFe
    soapBody.match(/<cStat>(\d+)<\/cStat>/i)?.[1] ??
    null;
  const xMotivo = parseTag(soapBody, "xMotivo");
  const nProt = parseTag(soapBody, "nProt");
  const chNFe = parseTag(soapBody, "chNFe");
  const nRec = parseTag(soapBody, "nRec");
  const protMatch = soapBody.match(/<protNFe[\s\S]*?<\/protNFe>/i);
  return {
    cStat,
    xMotivo,
    nProt,
    chNFe,
    nRec,
    protXml: protMatch ? protMatch[0] : null,
  };
}
