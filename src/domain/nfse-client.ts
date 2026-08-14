import https from "node:https";
import { URL } from "node:url";

export const NFSE_SP_ENDPOINT =
  "https://nfews.prefeitura.sp.gov.br/lotenfe.asmx";
export const NFSE_SP_FALLBACK =
  "https://nfe.prefeitura.sp.gov.br/ws/lotenfe.asmx";

export type NfseSoapMethod =
  | "EnvioRPS"
  | "ConsultaCNPJ"
  | "ConsultaNFeEmitidas";

const SOAP_ACTION: Record<NfseSoapMethod, string> = {
  EnvioRPS: "http://www.prefeitura.sp.gov.br/nfe/ws/envioRPS",
  ConsultaCNPJ: "http://www.prefeitura.sp.gov.br/nfe/ws/consultaCNPJ",
  ConsultaNFeEmitidas:
    "http://www.prefeitura.sp.gov.br/nfe/ws/consultaNFeEmitidas",
};

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildNfseSoap(
  method: NfseSoapMethod,
  mensagemXml: string,
  schemaVersion = 1,
): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <${method}Request xmlns="http://www.prefeitura.sp.gov.br/nfe">
      <VersaoSchema>${schemaVersion}</VersaoSchema>
      <MensagemXML>${esc(mensagemXml)}</MensagemXML>
    </${method}Request>
  </soap:Body>
</soap:Envelope>`;
}

export function extractRetornoXml(soapBody: string): string {
  const tagged = soapBody.match(
    /<RetornoXML[^>]*>([\s\S]*?)<\/RetornoXML>/i,
  );
  if (!tagged) return soapBody;
  return tagged[1]
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .trim();
}

export type NfsePostFn = (input: {
  url: string;
  body: string;
  soapAction: string;
  pfx: Buffer;
  passphrase: string;
}) => Promise<{ statusCode: number; body: string }>;

export function nfseSoapPostHttps(input: {
  url: string;
  body: string;
  soapAction: string;
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
          "Content-Type": "text/xml; charset=utf-8",
          SOAPAction: `"${input.soapAction}"`,
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
      req.destroy(new Error("Timeout na chamada da Prefeitura de São Paulo"));
    });
    req.write(input.body, "utf8");
    req.end();
  });
}

export async function callNfseSoap(options: {
  method: NfseSoapMethod;
  mensagemXml: string;
  pfxBase64: string;
  password: string;
  endpoint?: string;
  postFn?: NfsePostFn;
}): Promise<{ statusCode: number; soapBody: string; retornoXml: string }> {
  const url = options.endpoint ?? NFSE_SP_ENDPOINT;
  const body = buildNfseSoap(options.method, options.mensagemXml);
  const post = options.postFn ?? nfseSoapPostHttps;
  const response = await post({
    url,
    body,
    soapAction: SOAP_ACTION[options.method],
    pfx: Buffer.from(options.pfxBase64.replace(/\s/g, ""), "base64"),
    passphrase: options.password,
  });
  return {
    statusCode: response.statusCode,
    soapBody: response.body,
    retornoXml: extractRetornoXml(response.body),
  };
}
