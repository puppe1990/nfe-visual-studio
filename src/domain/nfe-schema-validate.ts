/**
 * Validação estrutural alinhada ao XSD NF-e 4.00 (modelo 55).
 *
 * Não embute o pacote PL oficial completo (dezenas de XSD com imports),
 * mas aplica as regras de campos obrigatórios/formatos que a SEFAZ
 * valida no schema (cStat 215/225 quando falham).
 */

export type SchemaIssue = {
  /** Código interno estável */
  code: string;
  /** Caminho lógico no XML */
  path: string;
  message: string;
  howToFix: string;
};

export type SchemaValidationResult =
  | { ok: true; issues: [] }
  | { ok: false; issues: SchemaIssue[] };

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : null;
}

function hasTag(xml: string, name: string): boolean {
  return new RegExp(`<${name}(?:\\s|>)`, "i").test(xml);
}

function attr(xml: string, element: string, attribute: string): string | null {
  const m = xml.match(
    new RegExp(`<${element}[^>]*\\s${attribute}="([^"]+)"`, "i"),
  );
  return m ? m[1] : null;
}

function issue(
  code: string,
  path: string,
  message: string,
  howToFix: string,
): SchemaIssue {
  return { code, path, message, howToFix };
}

/**
 * Valida XML de NFe (com ou sem assinatura) contra regras do layout 4.00.
 */
export function validateNFeXmlSchema(xml: string): SchemaValidationResult {
  const issues: SchemaIssue[] = [];
  const push = (
    code: string,
    path: string,
    message: string,
    howToFix: string,
  ) => {
    issues.push(issue(code, path, message, howToFix));
  };

  if (!xml || !xml.trim()) {
    return {
      ok: false,
      issues: [
        issue(
          "XSD-EMPTY",
          "/",
          "XML vazio",
          "Gere a NF-e novamente antes de transmitir.",
        ),
      ],
    };
  }

  if (!/<NFe[\s>]/i.test(xml)) {
    push(
      "XSD-NFE",
      "/NFe",
      "Elemento NFe ausente",
      "O documento precisa conter a tag NFe do namespace portalfiscal.",
    );
    return { ok: false, issues };
  }

  const infId = attr(xml, "infNFe", "Id");
  if (!infId || !/^NFe\d{44}$/.test(infId)) {
    push(
      "XSD-ID",
      "/NFe/infNFe/@Id",
      "Id do infNFe inválido (esperado NFe + 44 dígitos)",
      "Recalcule a chave de acesso e use Id=\"NFe{chave44}\".",
    );
  }

  const versao = attr(xml, "infNFe", "versao");
  if (versao !== "4.00") {
    push(
      "XSD-VER",
      "/NFe/infNFe/@versao",
      `Versão do layout inválida (${versao ?? "ausente"})`,
      "Use versao=\"4.00\" no infNFe.",
    );
  }

  // —— ide ——
  const ideFields: Array<[string, RegExp | null, string]> = [
    ["cUF", /^\d{2}$/, "código UF IBGE com 2 dígitos"],
    ["cNF", /^\d{8}$/, "código numérico com 8 dígitos"],
    ["natOp", /.+/, "natureza da operação"],
    ["mod", /^55$/, "modelo 55 (NF-e)"],
    ["serie", /^\d{1,3}$/, "série da NF-e"],
    ["nNF", /^\d{1,9}$/, "número da NF-e"],
    ["dhEmi", /.+/, "data/hora de emissão"],
    ["tpNF", /^[01]$/, "tipo de operação (0/1)"],
    ["idDest", /^[123]$/, "identificador de destino"],
    ["cMunFG", /^\d{7}$/, "município IBGE 7 dígitos"],
    ["tpImp", /^\d$/, "formato de impressão"],
    ["tpEmis", /^\d$/, "tipo de emissão"],
    ["cDV", /^\d$/, "dígito verificador da chave"],
    ["tpAmb", /^[12]$/, "ambiente (1 produção / 2 homologação)"],
    ["finNFe", /^\d$/, "finalidade"],
    ["indFinal", /^[01]$/, "consumidor final"],
    ["indPres", /^\d$/, "indicador de presença"],
    ["procEmi", /^\d$/, "processo de emissão"],
    ["verProc", /.+/, "versão do processo"],
  ];

  if (!hasTag(xml, "ide")) {
    push("XSD-IDE", "/NFe/infNFe/ide", "Grupo ide ausente", "Inclua o grupo de identificação da NF-e.");
  } else {
    for (const [name, re, label] of ideFields) {
      const v = tag(xml, name);
      // Only check tags that appear inside ide region approximately
      if (v == null || v === "") {
        // cNF etc. only once at document - ok for our generator
        if (!new RegExp(`<ide[\\s\\S]*?<${name}>`, "i").test(xml)) {
          push(
            `XSD-IDE-${name}`,
            `/NFe/infNFe/ide/${name}`,
            `Campo ide/${name} ausente`,
            `Preencha ${label}.`,
          );
        }
      } else if (re && !re.test(v)) {
        // For fields that exist multiple times (unlikely for ide), check first in ide block
        const ideBlock = xml.match(/<ide[\s\S]*?<\/ide>/i)?.[0] ?? "";
        const iv = tag(ideBlock, name);
        if (iv != null && !re.test(iv)) {
          push(
            `XSD-IDE-${name}`,
            `/NFe/infNFe/ide/${name}`,
            `Campo ide/${name} inválido ("${iv}")`,
            `Use ${label}.`,
          );
        }
      }
    }
  }

  // —— emit ——
  if (!hasTag(xml, "emit")) {
    push("XSD-EMIT", "/NFe/infNFe/emit", "Grupo emit ausente", "Cadastre o emitente em Configurações.");
  } else {
    const emitBlock = xml.match(/<emit[\s\S]*?<\/emit>/i)?.[0] ?? "";
    const cnpj = tag(emitBlock, "CNPJ");
    if (!cnpj || !/^\d{14}$/.test(cnpj)) {
      push(
        "XSD-EMIT-CNPJ",
        "/NFe/infNFe/emit/CNPJ",
        "CNPJ do emitente inválido",
        "Informe CNPJ com 14 dígitos em Configurações.",
      );
    }
    if (!tag(emitBlock, "xNome")) {
      push(
        "XSD-EMIT-NOME",
        "/NFe/infNFe/emit/xNome",
        "Razão social do emitente ausente",
        "Preencha o nome da empresa.",
      );
    }
    if (!hasTag(emitBlock, "enderEmit")) {
      push(
        "XSD-EMIT-END",
        "/NFe/infNFe/emit/enderEmit",
        "Endereço do emitente ausente",
        "Preencha rua, número, bairro, município, UF e CEP em Configurações.",
      );
    } else {
      for (const f of ["xLgr", "nro", "xBairro", "cMun", "xMun", "UF", "CEP"]) {
        if (!tag(emitBlock, f)) {
          push(
            `XSD-EMIT-${f}`,
            `/NFe/infNFe/emit/enderEmit/${f}`,
            `Endereço emitente sem ${f}`,
            "Complete o endereço do emitente.",
          );
        }
      }
      const cMun = tag(emitBlock, "cMun");
      if (cMun && !/^\d{7}$/.test(cMun)) {
        push(
          "XSD-EMIT-CMUN",
          "/NFe/infNFe/emit/enderEmit/cMun",
          "cMun do emitente deve ter 7 dígitos IBGE",
          "Selecione município válido (código IBGE).",
        );
      }
    }
    if (!tag(emitBlock, "IE")) {
      push(
        "XSD-EMIT-IE",
        "/NFe/infNFe/emit/IE",
        "IE do emitente ausente",
        "Informe inscrição estadual ou ISENTO quando aplicável.",
      );
    }
    const crt = tag(emitBlock, "CRT");
    if (!crt || !/^[123]$/.test(crt)) {
      push(
        "XSD-EMIT-CRT",
        "/NFe/infNFe/emit/CRT",
        "CRT inválido",
        "Use 1 (Simples), 2 ou 3 (regime normal).",
      );
    }
  }

  // —— dest ——
  if (!hasTag(xml, "dest")) {
    push(
      "XSD-DEST",
      "/NFe/infNFe/dest",
      "Grupo dest ausente",
      "Selecione um cliente destinatário.",
    );
  } else {
    const destBlock = xml.match(/<dest[\s\S]*?<\/dest>/i)?.[0] ?? "";
    const cpf = tag(destBlock, "CPF");
    const cnpj = tag(destBlock, "CNPJ");
    if (!cpf && !cnpj) {
      push(
        "XSD-DEST-DOC",
        "/NFe/infNFe/dest",
        "Destinatário sem CPF/CNPJ",
        "Cadastre documento válido no cliente.",
      );
    }
    if (cpf && !/^\d{11}$/.test(cpf)) {
      push(
        "XSD-DEST-CPF",
        "/NFe/infNFe/dest/CPF",
        "CPF do destinatário inválido",
        "Use 11 dígitos.",
      );
    }
    if (cnpj && !/^\d{14}$/.test(cnpj)) {
      push(
        "XSD-DEST-CNPJ",
        "/NFe/infNFe/dest/CNPJ",
        "CNPJ do destinatário inválido",
        "Use 14 dígitos.",
      );
    }
    if (!tag(destBlock, "xNome")) {
      push(
        "XSD-DEST-NOME",
        "/NFe/infNFe/dest/xNome",
        "Nome do destinatário ausente",
        "Preencha o nome do cliente.",
      );
    }
    if (!hasTag(destBlock, "enderDest")) {
      push(
        "XSD-DEST-END",
        "/NFe/infNFe/dest/enderDest",
        "Endereço do destinatário ausente",
        "Complete o endereço do cliente.",
      );
    }
    if (!tag(destBlock, "indIEDest")) {
      push(
        "XSD-DEST-INDIE",
        "/NFe/infNFe/dest/indIEDest",
        "indIEDest ausente",
        "Informe indicador de IE do destinatário (1, 2 ou 9).",
      );
    }

    const tpAmb = (() => {
      const ide = xml.match(/<ide[\s\S]*?<\/ide>/i)?.[0] ?? "";
      return tag(ide, "tpAmb");
    })();
    const destName = tag(destBlock, "xNome") ?? "";
    if (
      tpAmb === "2" &&
      !destName.toUpperCase().includes("HOMOLOGACAO") &&
      !destName.toUpperCase().includes("HOMOLOGAÇÃO")
    ) {
      push(
        "XSD-DEST-HOMOLOG",
        "/NFe/infNFe/dest/xNome",
        "Em homologação o xNome do dest deve ser o texto oficial da SEFAZ",
        'Use "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL".',
      );
    }
  }

  // —— det ——
  const dets = xml.match(/<det\b[\s\S]*?<\/det>/gi) ?? [];
  if (dets.length === 0) {
    push(
      "XSD-DET",
      "/NFe/infNFe/det",
      "Nenhum item (det) na NF-e",
      "Inclua ao menos um produto/serviço.",
    );
  } else {
    dets.forEach((det, i) => {
      const path = `/NFe/infNFe/det[${i + 1}]`;
      if (!hasTag(det, "prod")) {
        push(`XSD-DET-PROD`, `${path}/prod`, "Grupo prod ausente", "Preencha os dados do item.");
        return;
      }
      for (const f of ["cProd", "xProd", "NCM", "CFOP", "uCom", "qCom", "vUnCom", "vProd", "indTot"]) {
        if (!tag(det, f)) {
          push(
            `XSD-DET-${f}`,
            `${path}/prod/${f}`,
            `Item sem ${f}`,
            "Complete descrição, NCM, CFOP, quantidades e valores.",
          );
        }
      }
      const ncm = tag(det, "NCM");
      if (ncm && !/^\d{8}$/.test(ncm)) {
        push(
          "XSD-DET-NCM",
          `${path}/prod/NCM`,
          `NCM inválido (${ncm})`,
          "NCM deve ter exatamente 8 dígitos.",
        );
      }
      const cfop = tag(det, "CFOP");
      if (cfop && !/^\d{4}$/.test(cfop)) {
        push(
          "XSD-DET-CFOP",
          `${path}/prod/CFOP`,
          `CFOP inválido (${cfop})`,
          "CFOP deve ter 4 dígitos.",
        );
      }
      if (!hasTag(det, "imposto")) {
        push(
          "XSD-DET-IMP",
          `${path}/imposto`,
          "Grupo imposto ausente no item",
          "Informe ICMS (ou ICMSSN) e PIS/COFINS do item.",
        );
      } else if (
        !hasTag(det, "ICMS") &&
        !hasTag(det, "ICMSSN102") &&
        !/<ICMS[\s\S]*?CSOSN/i.test(det)
      ) {
        // ICMS group wraps ICMSSN*
        if (!/<ICMS[\s>]/i.test(det)) {
          push(
            "XSD-DET-ICMS",
            `${path}/imposto/ICMS`,
            "ICMS/ICMSSN ausente no item",
            "Inclua tributação de ICMS compatível com o CRT.",
          );
        }
      }
    });
  }

  // —— total ——
  if (!hasTag(xml, "ICMSTot")) {
    push(
      "XSD-TOTAL",
      "/NFe/infNFe/total/ICMSTot",
      "Totais ICMSTot ausentes",
      "Informe vProd e vNF nos totais.",
    );
  } else {
    const totalBlock = xml.match(/<ICMSTot[\s\S]*?<\/ICMSTot>/i)?.[0] ?? "";
    for (const f of ["vProd", "vNF", "vBC", "vICMS", "vPIS", "vCOFINS"]) {
      if (!tag(totalBlock, f)) {
        push(
          `XSD-TOTAL-${f}`,
          `/NFe/infNFe/total/ICMSTot/${f}`,
          `Total sem ${f}`,
          "Preencha os totais obrigatórios do ICMSTot.",
        );
      }
    }
  }

  // —— transp / pag ——
  if (!hasTag(xml, "modFrete")) {
    push(
      "XSD-TRANSP",
      "/NFe/infNFe/transp/modFrete",
      "modFrete ausente",
      "Informe a modalidade de frete (ex.: 9 = sem frete).",
    );
  }
  if (!hasTag(xml, "detPag")) {
    push(
      "XSD-PAG",
      "/NFe/infNFe/pag/detPag",
      "Forma de pagamento ausente",
      "Inclua detPag com tPag e vPag.",
    );
  }

  // Defaults fracos: bloqueiam só em produção (homologação permite ir afinando)
  const tpAmbRoot = (() => {
    const ide = xml.match(/<ide[\s\S]*?<\/ide>/i)?.[0] ?? ""
    return tag(ide, "tpAmb")
  })()
  if (tpAmbRoot === "1" && /RUA NAO INFORMADA/i.test(xml)) {
    push(
      "XSD-ADDR-DEFAULT",
      "/NFe/infNFe//xLgr",
      "Endereço com logradouro padrão não informado",
      "Preencha o endereço real do emitente e do destinatário antes de emitir em produção.",
    );
  }

  if (issues.length === 0) {
    return { ok: true, issues: [] };
  }
  return { ok: false, issues };
}

/**
 * Formata issues de schema para uma mensagem única (UI / rejection_reason).
 */
export function formatSchemaIssues(issues: SchemaIssue[]): string {
  if (issues.length === 0) return "";
  const head = `[Validação layout 4.00] ${issues.length} problema(s)`;
  const body = issues
    .slice(0, 8)
    .map(
      (i, idx) =>
        `${idx + 1}. ${i.message} (${i.path}) — ${i.howToFix}`,
    )
    .join(" ");
  const more =
    issues.length > 8 ? ` … e mais ${issues.length - 8} item(ns).` : "";
  return `${head}: ${body}${more}`;
}
