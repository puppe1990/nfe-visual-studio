import type { SefazEnvironment } from "./types";

export type SefazService =
  | "autorizacao"
  | "retAutorizacao"
  | "recepcaoEvento"
  | "inutilizacao"
  | "statusServico";

/**
 * Endpoints NF-e 4.00 (principais). Completar por UF conforme necessidade.
 * Fonte operacional: portais SEFAZ / SVRS.
 */
const HOMOLOG: Partial<Record<string, Partial<Record<SefazService, string>>>> =
  {
    // São Paulo
    SP: {
      autorizacao:
        "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
      retAutorizacao:
        "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
      recepcaoEvento:
        "https://homologacao.nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
      inutilizacao:
        "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
      statusServico:
        "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    },
    // SVRS (várias UFs) — homologação nacional virtual
    SVRS: {
      autorizacao:
        "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
      retAutorizacao:
        "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
      recepcaoEvento:
        "https://nfe-homologacao.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
      inutilizacao:
        "https://nfe-homologacao.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
      statusServico:
        "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    },
  };

const PRODUCTION: Partial<
  Record<string, Partial<Record<SefazService, string>>>
> = {
  SP: {
    autorizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx",
    retAutorizacao: "https://nfe.fazenda.sp.gov.br/ws/nferetautorizacao4.asmx",
    recepcaoEvento: "https://nfe.fazenda.sp.gov.br/ws/nferecepcaoevento4.asmx",
    inutilizacao: "https://nfe.fazenda.sp.gov.br/ws/nfeinutilizacao4.asmx",
    statusServico: "https://nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
  },
  SVRS: {
    autorizacao:
      "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx",
    retAutorizacao:
      "https://nfe.svrs.rs.gov.br/ws/NfeRetAutorizacao/NFeRetAutorizacao4.asmx",
    recepcaoEvento:
      "https://nfe.svrs.rs.gov.br/ws/recepcaoevento/recepcaoevento4.asmx",
    inutilizacao:
      "https://nfe.svrs.rs.gov.br/ws/nfeinutilizacao/nfeinutilizacao4.asmx",
    statusServico:
      "https://nfe.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
  },
};

/** UFs que usam SVRS para NF-e modelo 55 (lista operacional comum). */
const SVRS_UFS = new Set([
  "AC",
  "AL",
  "AP",
  "DF",
  "ES",
  "PB",
  "RJ",
  "RN",
  "RO",
  "RR",
  "SC",
  "SE",
  "TO",
]);

export function resolveSefazAuthority(uf: string): string {
  const code = uf.trim().toUpperCase();
  if (code === "SP") return "SP";
  if (SVRS_UFS.has(code) || code === "SVRS") return "SVRS";
  // fallback SVRS para UFs não mapeadas (pode exigir ajuste por UF)
  return "SVRS";
}

export function getSefazEndpoint(input: {
  uf: string;
  environment: SefazEnvironment;
  service: SefazService;
}): string {
  const authority = resolveSefazAuthority(input.uf);
  const table =
    input.environment === "production" ? PRODUCTION : HOMOLOG;
  const url = table[authority]?.[input.service];
  if (!url) {
    throw new Error(
      `Endpoint SEFAZ não configurado para ${authority}/${input.service}/${input.environment}`,
    );
  }
  return url;
}

export const UF_CODE: Record<string, string> = {
  RO: "11",
  AC: "12",
  AM: "13",
  RR: "14",
  PA: "15",
  AP: "16",
  TO: "17",
  MA: "21",
  PI: "22",
  CE: "23",
  RN: "24",
  PB: "25",
  PE: "26",
  AL: "27",
  SE: "28",
  BA: "29",
  MG: "31",
  ES: "32",
  RJ: "33",
  SP: "35",
  PR: "41",
  SC: "42",
  RS: "43",
  MS: "50",
  MT: "51",
  GO: "52",
  DF: "53",
};
