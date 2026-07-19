import type { SefazEnvironment } from "./types";

export type SefazAuthorizeRequest = {
  companyDocument: string;
  series: number;
  number: number;
  environment: SefazEnvironment;
  xml: string;
  hasCertificate: boolean;
};

export type SefazAuthorizeResult =
  | {
      ok: true;
      protocol: string;
      accessKey: string;
      authorizedXml: string;
    }
  | { ok: false; rejectionReason: string };

export type SefazCancelRequest = {
  accessKey: string;
  protocol: string;
  justification: string;
  environment: SefazEnvironment;
  hasCertificate: boolean;
};

export type SefazCancelResult =
  | { ok: true; protocol: string }
  | { ok: false; rejectionReason: string };

export type SefazInutilizeRequest = {
  companyDocument: string;
  series: number;
  numberFrom: number;
  numberTo: number;
  year: number;
  justification: string;
  environment: SefazEnvironment;
  hasCertificate: boolean;
};

export type SefazInutilizeResult =
  | { ok: true; protocol: string; xml: string }
  | { ok: false; rejectionReason: string };

/**
 * Adapter SEFAZ — produção real exige WS da SEFAZ + A1 assinado.
 * Implementações: SimulatedSefazClient (default), FakeSefazClient (testes).
 */
export interface SefazClient {
  authorize(req: SefazAuthorizeRequest): Promise<SefazAuthorizeResult>;
  cancel(req: SefazCancelRequest): Promise<SefazCancelResult>;
  inutilize(req: SefazInutilizeRequest): Promise<SefazInutilizeResult>;
}

function pad(n: number, size: number): string {
  return String(n).padStart(size, "0");
}

function buildAccessKey(document: string, series: number, number: number): string {
  // 44 digits mock (UF+AAMM+CNPJ+mod+serie+nNF+tpEmis+cNF+cDV) — não é chave real SEFAZ
  const cnpj = document.replace(/\D/g, "").padStart(14, "0").slice(0, 14);
  const body = `35${pad(new Date().getFullYear() % 100, 2)}${pad(new Date().getMonth() + 1, 2)}${cnpj}55${pad(series, 3)}${pad(number, 9)}1${pad(number % 100000000, 8)}`;
  const dv = String(
    body.split("").reduce((s, d) => s + Number(d), 0) % 10,
  );
  return `${body}${dv}`.slice(0, 44);
}

function requireCert(
  environment: SefazEnvironment,
  hasCertificate: boolean,
): string | null {
  if (environment === "production" && !hasCertificate) {
    return "Certificado A1 obrigatório em produção";
  }
  return null;
}

/**
 * Cliente SEFAZ simulado (homologação e dev).
 * Em produção exige certificado cadastrado; não chama WS real.
 */
export class SimulatedSefazClient implements SefazClient {
  async authorize(req: SefazAuthorizeRequest): Promise<SefazAuthorizeResult> {
    const certError = requireCert(req.environment, req.hasCertificate);
    if (certError) return { ok: false, rejectionReason: certError };

    if (!req.xml.includes("<NFe>") && !req.xml.includes("<nfe")) {
      return { ok: false, rejectionReason: "XML inválido para transmissão" };
    }

    const accessKey = buildAccessKey(
      req.companyDocument,
      req.series,
      req.number,
    );
    const protocol = `SIM-${Date.now()}-${req.number}`;
    const authorizedXml = req.xml.replace(
      "</nfeProc>",
      `  <protNFe><infProt><nProt>${protocol}</nProt><chNFe>${accessKey}</chNFe></infProt></protNFe>\n</nfeProc>`,
    );

    return {
      ok: true,
      protocol,
      accessKey,
      authorizedXml: authorizedXml.includes("protNFe")
        ? authorizedXml
        : `${req.xml}\n<!-- protocol ${protocol} accessKey ${accessKey} -->`,
    };
  }

  async cancel(req: SefazCancelRequest): Promise<SefazCancelResult> {
    const certError = requireCert(req.environment, req.hasCertificate);
    if (certError) return { ok: false, rejectionReason: certError };

    if (req.justification.trim().length < 15) {
      return {
        ok: false,
        rejectionReason: "Justificativa deve ter ao menos 15 caracteres",
      };
    }
    if (!req.accessKey || !req.protocol) {
      return {
        ok: false,
        rejectionReason: "Protocolo e chave de acesso são obrigatórios",
      };
    }

    return { ok: true, protocol: `CANC-${Date.now()}` };
  }

  async inutilize(req: SefazInutilizeRequest): Promise<SefazInutilizeResult> {
    const certError = requireCert(req.environment, req.hasCertificate);
    if (certError) return { ok: false, rejectionReason: certError };

    if (req.numberFrom > req.numberTo) {
      return {
        ok: false,
        rejectionReason: "Número inicial maior que o final",
      };
    }
    if (req.justification.trim().length < 15) {
      return {
        ok: false,
        rejectionReason: "Justificativa deve ter ao menos 15 caracteres",
      };
    }

    const protocol = `INUT-${Date.now()}-${req.numberFrom}-${req.numberTo}`;
    const xml = `<?xml version="1.0"?>
<inutNFe>
  <infInut>
    <tpAmb>${req.environment === "production" ? "1" : "2"}</tpAmb>
    <CNPJ>${req.companyDocument}</CNPJ>
    <serie>${req.series}</serie>
    <nNFIni>${req.numberFrom}</nNFIni>
    <nNFFin>${req.numberTo}</nNFFin>
    <xJust>${req.justification}</xJust>
    <nProt>${protocol}</nProt>
  </infInut>
</inutNFe>`;

    return { ok: true, protocol, xml };
  }
}

/** Cliente fake para forçar rejeições em testes. */
export class FakeSefazClient implements SefazClient {
  constructor(
    private readonly behavior: {
      authorize?: SefazAuthorizeResult;
      cancel?: SefazCancelResult;
      inutilize?: SefazInutilizeResult;
    } = {},
  ) {}

  private readonly fallback = new SimulatedSefazClient();

  async authorize(req: SefazAuthorizeRequest): Promise<SefazAuthorizeResult> {
    if (this.behavior.authorize) return this.behavior.authorize;
    return this.fallback.authorize(req);
  }

  async cancel(req: SefazCancelRequest): Promise<SefazCancelResult> {
    if (this.behavior.cancel) return this.behavior.cancel;
    return this.fallback.cancel(req);
  }

  async inutilize(req: SefazInutilizeRequest): Promise<SefazInutilizeResult> {
    if (this.behavior.inutilize) return this.behavior.inutilize;
    return this.fallback.inutilize(req);
  }
}

let defaultClient: SefazClient = new SimulatedSefazClient();

export function getSefazClient(): SefazClient {
  return defaultClient;
}

export function setSefazClient(client: SefazClient): void {
  defaultClient = client;
}

export function resetSefazClient(): void {
  defaultClient = new SimulatedSefazClient();
}
