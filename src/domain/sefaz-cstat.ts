/**
 * Mapa de cStat SEFAZ → mensagem acionável.
 * Códigos oficiais de retorno da NF-e (autorização, eventos, inutilização).
 */

export type SefazStatusInfo = {
  cStat: string;
  title: string;
  /** O que o usuário deve fazer */
  howToFix: string;
  kind: "success" | "pending" | "reject" | "denegado" | "info";
};

const TABLE: Record<string, Omit<SefazStatusInfo, "cStat">> = {
  "100": {
    title: "Autorizado o uso da NF-e",
    howToFix: "Nenhuma ação. Guarde o XML e o protocolo.",
    kind: "success",
  },
  "101": {
    title: "Cancelamento de NF-e homologado",
    howToFix: "Cancelamento aceito. Atualize o status da nota.",
    kind: "success",
  },
  "102": {
    title: "Inutilização de número homologada",
    howToFix: "Faixa inutilizada com sucesso.",
    kind: "success",
  },
  "103": {
    title: "Lote recebido com sucesso",
    howToFix: "Aguarde o processamento e consulte o recibo (RetAutorizacao).",
    kind: "pending",
  },
  "104": {
    title: "Lote processado",
    howToFix: "Verifique o protocolo individual de cada NF-e do lote.",
    kind: "info",
  },
  "105": {
    title: "Lote em processamento",
    howToFix: "Aguarde alguns segundos e consulte o recibo novamente.",
    kind: "pending",
  },
  "106": {
    title: "Lote não localizado",
    howToFix: "Confira o nRec ou reenvie o lote se necessário.",
    kind: "reject",
  },
  "110": {
    title: "Uso denegado",
    howToFix:
      "A nota foi denegada. Corrija o cadastro fiscal (IE/CNPJ) e emita com nova numeração se permitido.",
    kind: "denegado",
  },
  "150": {
    title: "Autorizado fora de prazo",
    howToFix: "Uso autorizado, mas fora do prazo. Guarde o XML mesmo assim.",
    kind: "success",
  },
  "204": {
    title: "Duplicidade de NF-e",
    howToFix:
      "Já existe NF-e com esta chave. Não reenvie o mesmo número; consulte a nota na SEFAZ.",
    kind: "reject",
  },
  "205": {
    title: "NF-e está denegada na base de dados da SEFAZ",
    howToFix: "Não é possível usar esta numeração. Avance a sequência.",
    kind: "denegado",
  },
  "206": {
    title: "NF-e já está inutilizada na Base de dados da SEFAZ",
    howToFix: "Use o próximo número livre da série.",
    kind: "reject",
  },
  "213": {
    title: "CNPJ-Base do Emitente difere do CNPJ-Base do Certificado Digital",
    howToFix:
      "Use o certificado A1 do mesmo CNPJ do emitente cadastrado em Configurações.",
    kind: "reject",
  },
  "215": {
    title: "Falha no schema XML",
    howToFix:
      "O XML não passou na validação XSD. Complete endereço, NCM (8 dígitos), CFOP, impostos e campos obrigatórios; confira o relatório de validação pré-envio.",
    kind: "reject",
  },
  "225": {
    title: "Falha no Schema XML do lote de NFe",
    howToFix:
      "Mesmo tipo de erro 215 no lote. Valide o XML antes de transmitir (layout 4.00).",
    kind: "reject",
  },
  "539": {
    title: "Duplicidade de NF-e com diferença na Chave de Acesso",
    howToFix:
      "Conflito de numeração. Verifique série/número e não reutilize numeração já autorizada.",
    kind: "reject",
  },
  "590": {
    title: "Informado CST para emissor do Simples Nacional",
    howToFix:
      "No Simples Nacional use CSOSN (ex.: 102), não CST de regime normal. Ajuste o CRT e o grupo de ICMS.",
    kind: "reject",
  },
  "778": {
    title: "Informado NCM inexistente",
    howToFix: "Corrija o NCM do produto para um código válido de 8 dígitos.",
    kind: "reject",
  },
  "806": {
    title: "Operação com ICMS-ST sem informação do ICMS-ST",
    howToFix: "Preencha o grupo de ST ou altere o CFOP/CST da operação.",
    kind: "reject",
  },
};

export function getSefazStatusInfo(cStat: string | null | undefined): SefazStatusInfo {
  const code = (cStat ?? "").trim();
  const known = TABLE[code];
  if (known) {
    return { cStat: code, ...known };
  }
  return {
    cStat: code || "—",
    title: code
      ? `Retorno SEFAZ cStat ${code}`
      : "Retorno SEFAZ sem cStat",
    howToFix:
      "Consulte o motivo (xMotivo) retornado e a documentação de rejeições da NF-e. Corrija o XML ou o cadastro e tente de novo.",
    kind: "reject",
  };
}

/**
 * Formata rejeição/retorno SEFAZ para exibir ao usuário.
 */
export function formatSefazRejection(
  cStat: string | null | undefined,
  xMotivo: string | null | undefined,
): string {
  const info = getSefazStatusInfo(cStat);
  const motivo = (xMotivo ?? "").trim();
  const parts = [
    `[cStat ${info.cStat}] ${info.title}`,
    `O que fazer: ${info.howToFix}`,
  ];
  if (motivo && motivo !== info.title) {
    parts.push(`SEFAZ: ${motivo}`);
  }
  return parts.join(" · ");
}

export function isSefazAuthorizedCStat(cStat: string | null | undefined): boolean {
  return cStat === "100" || cStat === "150";
}
