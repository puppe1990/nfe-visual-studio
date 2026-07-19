import { getSefazEndpoint, UF_CODE } from "./sefaz-endpoints";
import {
  extractNFeXml,
  loadA1FromPfx,
  signInfEventoXml,
  signInfInutXml,
  signNFeXml,
} from "./sefaz-sign";
import {
  buildAutorizacaoSoap,
  buildEnviNFe,
  buildInutilizacaoSoap,
  buildRecepcaoEventoSoap,
  buildRetAutorizacaoSoap,
  parseAuthorizeResponse,
  parseTag,
  sefazSoapPost,
  type SoapPostOptions,
} from "./sefaz-soap";
import type {
  SefazAuthorizeRequest,
  SefazAuthorizeResult,
  SefazCancelRequest,
  SefazCancelResult,
  SefazClient,
  SefazInutilizeRequest,
  SefazInutilizeResult,
} from "./sefaz";

export type RealSefazClientOptions = {
  /** UF do emitente (default SP). */
  uf?: string;
  /** Override do POST (testes). */
  postFn?: SoapPostOptions["postFn"];
};

function requireMaterial(
  certificate: SefazAuthorizeRequest["certificate"],
): { pfxBase64: string; password: string } | { error: string } {
  if (!certificate?.pfxBase64 || !certificate.password) {
    return {
      error:
        "Certificado A1 (PFX + senha) é obrigatório para chamadas diretas à SEFAZ",
    };
  }
  return {
    pfxBase64: certificate.pfxBase64,
    password: certificate.password,
  };
}

/**
 * Cliente SEFAZ **direto** (sem provedor intermediário).
 * - mTLS com A1
 * - Assinatura XML da NF-e
 * - NFeAutorizacao4 / RetAutorizacao / RecepcaoEvento / Inutilizacao
 *
 * Homologação e produção usam as mesmas rotinas; muda só URL + tpAmb no XML.
 */
export class RealSefazClient implements SefazClient {
  private readonly uf: string;
  private readonly postFn?: SoapPostOptions["postFn"];

  constructor(options: RealSefazClientOptions = {}) {
    this.uf = (options.uf ?? "SP").toUpperCase();
    this.postFn = options.postFn;
  }

  async authorize(req: SefazAuthorizeRequest): Promise<SefazAuthorizeResult> {
    const material = requireMaterial(req.certificate);
    if ("error" in material) {
      return { ok: false, rejectionReason: material.error };
    }

    try {
      const a1 = loadA1FromPfx(material.pfxBase64, material.password);
      const nfe = extractNFeXml(req.xml);
      const signed = signNFeXml(nfe, a1);
      const loteId = String(Date.now()).slice(-15);
      const envi = buildEnviNFe(signed, loteId);
      const soap = buildAutorizacaoSoap(envi);
      const url = getSefazEndpoint({
        uf: this.uf,
        environment: req.environment,
        service: "autorizacao",
      });

      const response = await sefazSoapPost({
        url,
        body: soap,
        pfxBase64: material.pfxBase64,
        password: material.password,
        postFn: this.postFn,
      });

      if (response.statusCode >= 400) {
        return {
          ok: false,
          rejectionReason: `HTTP ${response.statusCode} na SEFAZ`,
        };
      }

      let parsed = parseAuthorizeResponse(response.body);

      // Lote recebido assíncrono → consulta recibo
      if (parsed.nRec && (!parsed.nProt || parsed.cStat === "103")) {
        const cons = `<consReciNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${req.environment === "production" ? "1" : "2"}</tpAmb><nRec>${parsed.nRec}</nRec></consReciNFe>`;
        const retUrl = getSefazEndpoint({
          uf: this.uf,
          environment: req.environment,
          service: "retAutorizacao",
        });
        const ret = await sefazSoapPost({
          url: retUrl,
          body: buildRetAutorizacaoSoap(cons),
          pfxBase64: material.pfxBase64,
          password: material.password,
          postFn: this.postFn,
        });
        parsed = parseAuthorizeResponse(ret.body);
      }

      const cStat = parsed.cStat ?? "";
      // 100 = autorizado; 104 = lote processado com prot dentro
      const authorized =
        cStat === "100" ||
        (cStat === "104" && Boolean(parsed.nProt)) ||
        Boolean(parsed.nProt && parsed.chNFe);

      if (!authorized) {
        return {
          ok: false,
          rejectionReason:
            parsed.xMotivo ||
            `SEFAZ rejeitou (cStat=${cStat || "desconhecido"})`,
        };
      }

      const protocol = parsed.nProt ?? `SEFAZ-${Date.now()}`;
      const accessKey =
        parsed.chNFe ??
        nfe.match(/Id="NFe([^"]+)"/i)?.[1] ??
        "".padStart(44, "0");

      const authorizedXml = parsed.protXml
        ? `<?xml version="1.0" encoding="UTF-8"?><nfeProc versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">${signed}${parsed.protXml}</nfeProc>`
        : signed;

      return {
        ok: true,
        protocol,
        accessKey: accessKey.slice(0, 44),
        authorizedXml,
      };
    } catch (err) {
      return {
        ok: false,
        rejectionReason:
          err instanceof Error ? err.message : "Falha na transmissão SEFAZ",
      };
    }
  }

  async cancel(req: SefazCancelRequest): Promise<SefazCancelResult> {
    const material = requireMaterial(req.certificate);
    if ("error" in material) {
      return { ok: false, rejectionReason: material.error };
    }
    if (req.justification.trim().length < 15) {
      return {
        ok: false,
        rejectionReason: "Justificativa deve ter ao menos 15 caracteres",
      };
    }

    try {
      const a1 = loadA1FromPfx(material.pfxBase64, material.password);
      const tpAmb = req.environment === "production" ? "1" : "2";
      const cOrgao = UF_CODE[this.uf] ?? "35";
      const dhEvento = new Date().toISOString().replace(/\.\d{3}Z$/, "-03:00");
      const nSeqEvento = "1";
      const id = `ID110111${req.accessKey}${nSeqEvento.padStart(2, "0")}`;

      const infEvento = `<infEvento Id="${id}"><cOrgao>${cOrgao}</cOrgao><tpAmb>${tpAmb}</tpAmb><chNFe>${req.accessKey}</chNFe><dhEvento>${dhEvento}</dhEvento><tpEvento>110111</tpEvento><nSeqEvento>${nSeqEvento}</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Cancelamento</descEvento><nProt>${req.protocol}</nProt><xJust>${escapeXml(req.justification)}</xJust></detEvento></infEvento>`;
      const eventoXml = `<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">${infEvento}</evento>`;
      const signedEvento = signInfEventoXml(eventoXml, a1, id);
      const envEvento = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now().toString().slice(-15)}</idLote>${signedEvento}</envEvento>`;

      const url = getSefazEndpoint({
        uf: this.uf,
        environment: req.environment,
        service: "recepcaoEvento",
      });
      const response = await sefazSoapPost({
        url,
        body: buildRecepcaoEventoSoap(envEvento),
        pfxBase64: material.pfxBase64,
        password: material.password,
        postFn: this.postFn,
      });

      const cStat = parseTag(response.body, "cStat");
      const xMotivo = parseTag(response.body, "xMotivo");
      const nProt = parseTag(response.body, "nProt");

      // 135 = evento registrado e vinculado
      if (cStat === "135" || cStat === "136" || nProt) {
        return { ok: true, protocol: nProt ?? `CANC-SEFAZ-${Date.now()}` };
      }
      return {
        ok: false,
        rejectionReason: xMotivo || `Cancelamento rejeitado (cStat=${cStat})`,
      };
    } catch (err) {
      return {
        ok: false,
        rejectionReason:
          err instanceof Error ? err.message : "Falha no cancelamento SEFAZ",
      };
    }
  }

  async inutilize(req: SefazInutilizeRequest): Promise<SefazInutilizeResult> {
    const material = requireMaterial(req.certificate);
    if ("error" in material) {
      return { ok: false, rejectionReason: material.error };
    }
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

    try {
      const a1 = loadA1FromPfx(material.pfxBase64, material.password);
      const tpAmb = req.environment === "production" ? "1" : "2";
      const cUF = UF_CODE[this.uf] ?? "35";
      const ano = String(req.year).slice(-2);
      const cnpj = req.companyDocument.replace(/\D/g, "");
      const id = `ID${cUF}${ano}${cnpj}55${String(req.series).padStart(3, "0")}${String(req.numberFrom).padStart(9, "0")}${String(req.numberTo).padStart(9, "0")}`;

      const infInut = `<infInut Id="${id}"><tpAmb>${tpAmb}</tpAmb><xServ>INUTILIZAR</xServ><cUF>${cUF}</cUF><ano>${ano}</ano><CNPJ>${cnpj}</CNPJ><mod>55</mod><serie>${req.series}</serie><nNFIni>${req.numberFrom}</nNFIni><nNFFin>${req.numberTo}</nNFFin><xJust>${escapeXml(req.justification)}</xJust></infInut>`;
      const inutNFe = `<inutNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">${infInut}</inutNFe>`;
      const signed = signInfInutXml(inutNFe, a1, id);

      const url = getSefazEndpoint({
        uf: this.uf,
        environment: req.environment,
        service: "inutilizacao",
      });
      const response = await sefazSoapPost({
        url,
        body: buildInutilizacaoSoap(signed),
        pfxBase64: material.pfxBase64,
        password: material.password,
        postFn: this.postFn,
      });

      const cStat = parseTag(response.body, "cStat");
      const xMotivo = parseTag(response.body, "xMotivo");
      const nProt = parseTag(response.body, "nProt");

      if (cStat === "102" || nProt) {
        return {
          ok: true,
          protocol: nProt ?? `INUT-SEFAZ-${Date.now()}`,
          xml: response.body,
        };
      }
      return {
        ok: false,
        rejectionReason: xMotivo || `Inutilização rejeitada (cStat=${cStat})`,
      };
    } catch (err) {
      return {
        ok: false,
        rejectionReason:
          err instanceof Error ? err.message : "Falha na inutilização SEFAZ",
      };
    }
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}


