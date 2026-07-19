import { UF_CODE } from "./sefaz-endpoints";
import type { Company, Customer, Invoice, InvoiceItem, TaxRegime } from "./types";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function onlyDigits(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

function money(cents: number): string {
  return (Math.max(0, cents) / 100).toFixed(2);
}

function qty(value: number): string {
  return Number(value).toFixed(4);
}

function pad(n: number | string, size: number): string {
  return String(n).padStart(size, "0");
}

/** Mapa mínimo IBGE (capitais / defaults). Expandível. */
const IBGE_CITY: Record<string, string> = {
  "SP|SAO PAULO": "3550308",
  "SP|SÃO PAULO": "3550308",
  "RJ|RIO DE JANEIRO": "3304557",
  "MG|BELO HORIZONTE": "3106200",
  "PR|CURITIBA": "4106902",
  "RS|PORTO ALEGRE": "4314902",
  "SC|FLORIANOPOLIS": "4205407",
  "SC|FLORIANÓPOLIS": "4205407",
  "BA|SALVADOR": "2927408",
  "PE|RECIFE": "2611606",
  "CE|FORTALEZA": "2304400",
  "DF|BRASILIA": "5300108",
  "DF|BRASÍLIA": "5300108",
  "GO|GOIANIA": "5208707",
  "GO|GOIÂNIA": "5208707",
};

export function resolveIbgeCityCode(
  city: string | null | undefined,
  uf: string | null | undefined,
): string {
  const u = (uf ?? "SP").toUpperCase();
  const c = (city ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .trim();
  const key = `${u}|${c}`;
  if (IBGE_CITY[key]) return IBGE_CITY[key];
  // fallback SP capital (homologação)
  if (u === "SP") return "3550308";
  if (u === "RJ") return "3304557";
  return "3550308";
}

export function crtFromTaxRegime(regime: TaxRegime): "1" | "3" {
  return regime === "simples" ? "1" : "3";
}

/**
 * Dígito verificador da chave NF-e (módulo 11).
 */
export function accessKeyCheckDigit(key43: string): string {
  const weights = [2, 3, 4, 5, 6, 7, 8, 9];
  let sum = 0;
  let w = 0;
  for (let i = key43.length - 1; i >= 0; i--) {
    sum += Number(key43[i]) * weights[w];
    w = (w + 1) % weights.length;
  }
  const mod = sum % 11;
  const dv = mod === 0 || mod === 1 ? 0 : 11 - mod;
  return String(dv);
}

/**
 * Monta chave de acesso 44 dígitos (sem assinatura).
 */
export function buildAccessKey(input: {
  uf: string;
  issueDate?: Date;
  cnpj: string;
  model?: string;
  series: number;
  number: number;
  tpEmis?: string;
  cNF?: string;
}): string {
  const d = input.issueDate ?? new Date();
  const cUF = UF_CODE[input.uf.toUpperCase()] ?? "35";
  const aamm = `${pad(d.getFullYear() % 100, 2)}${pad(d.getMonth() + 1, 2)}`;
  const cnpj = pad(onlyDigits(input.cnpj).slice(0, 14), 14);
  const mod = input.model ?? "55";
  const serie = pad(input.series, 3);
  const nNF = pad(input.number, 9);
  const tpEmis = input.tpEmis ?? "1";
  const cNF = pad(input.cNF ?? String(Math.floor(Math.random() * 1e8)), 8);
  const key43 = `${cUF}${aamm}${cnpj}${mod}${serie}${nNF}${tpEmis}${cNF}`;
  return `${key43}${accessKeyCheckDigit(key43)}`;
}

function dhEmiIso(date = new Date()): string {
  // America/Sao_Paulo aproximado -03:00 (sem DST)
  const offset = -3 * 60;
  const local = new Date(date.getTime() + offset * 60_000);
  const yyyy = local.getUTCFullYear();
  const mm = pad(local.getUTCMonth() + 1, 2);
  const dd = pad(local.getUTCDate(), 2);
  const hh = pad(local.getUTCHours(), 2);
  const mi = pad(local.getUTCMinutes(), 2);
  const ss = pad(local.getUTCSeconds(), 2);
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}-03:00`;
}

function enderXml(
  tag: "enderEmit" | "enderDest",
  party: {
    street: string | null;
    number: string | null;
    complement: string | null;
    district: string | null;
    city: string | null;
    state: string | null;
    zip: string | null;
  },
): string {
  const uf = (party.state ?? "SP").toUpperCase();
  const cMun = resolveIbgeCityCode(party.city, uf);
  const xMun = esc(party.city?.trim() || "SAO PAULO");
  const xLgr = esc(party.street?.trim() || "RUA NAO INFORMADA");
  const nro = esc(party.number?.trim() || "S/N");
  const xBairro = esc(party.district?.trim() || "CENTRO");
  const cep = pad(onlyDigits(party.zip).slice(0, 8) || "01001000", 8);
  const xCpl = party.complement?.trim()
    ? `<xCpl>${esc(party.complement.trim())}</xCpl>`
    : "";

  return `<${tag}>
      <xLgr>${xLgr}</xLgr>
      <nro>${nro}</nro>
      ${xCpl}
      <xBairro>${xBairro}</xBairro>
      <cMun>${cMun}</cMun>
      <xMun>${xMun}</xMun>
      <UF>${uf}</UF>
      <CEP>${cep}</CEP>
      <cPais>1058</cPais>
      <xPais>BRASIL</xPais>
    </${tag}>`;
}

function impostoXml(item: InvoiceItem, taxRegime: TaxRegime): string {
  // PIS/COFINS operação sem incidência (CST 07) — layout válido para vários cenários
  const pis = `<PIS><PISNT><CST>07</CST></PISNT></PIS>`;
  const cofins = `<COFINS><COFINSNT><CST>07</CST></COFINSNT></COFINS>`;

  if (taxRegime === "simples") {
    // CSOSN 102 — tributada sem permissão de crédito
    return `<imposto>
        <vTotTrib>${money(0)}</vTotTrib>
        <ICMS>
          <ICMSSN102>
            <orig>0</orig>
            <CSOSN>102</CSOSN>
          </ICMSSN102>
        </ICMS>
        ${pis}
        ${cofins}
      </imposto>`;
  }

  // Regime normal — ICMS 00 alíquota 0 (placeholder; ajustar por operação real)
  return `<imposto>
        <vTotTrib>${money(0)}</vTotTrib>
        <ICMS>
          <ICMS00>
            <orig>0</orig>
            <CST>00</CST>
            <modBC>3</modBC>
            <vBC>${money(item.totalCents)}</vBC>
            <pICMS>0.00</pICMS>
            <vICMS>0.00</vICMS>
          </ICMS00>
        </ICMS>
        ${pis}
        ${cofins}
      </imposto>`;
}

function detXml(
  items: InvoiceItem[],
  cfop: string,
  taxRegime: TaxRegime,
): string {
  return items
    .map((item, index) => {
      const ncm = onlyDigits(item.ncm).padStart(8, "0").slice(0, 8) || "00000000";
      const uCom = "UN";
      const qCom = qty(item.quantity);
      const vUn = money(item.unitPriceCents);
      const vProd = money(item.totalCents);
      const cProd = esc(String(item.productId ?? index + 1));
      const xProd = esc(item.description || `ITEM ${index + 1}`);
      const itemCfop = onlyDigits(cfop).slice(0, 4) || "5102";

      return `<det nItem="${index + 1}">
      <prod>
        <cProd>${cProd}</cProd>
        <cEAN>SEM GTIN</cEAN>
        <xProd>${xProd}</xProd>
        <NCM>${ncm}</NCM>
        <CFOP>${itemCfop}</CFOP>
        <uCom>${uCom}</uCom>
        <qCom>${qCom}</qCom>
        <vUnCom>${vUn}</vUnCom>
        <vProd>${vProd}</vProd>
        <cEANTrib>SEM GTIN</cEANTrib>
        <uTrib>${uCom}</uTrib>
        <qTrib>${qCom}</qTrib>
        <vUnTrib>${vUn}</vUnTrib>
        <indTot>1</indTot>
      </prod>
      ${impostoXml(item, taxRegime)}
    </det>`;
    })
    .join("\n    ");
}

export type BuildInvoiceXmlResult = {
  /** XML da NFe (ainda sem Signature) — usar para assinar/transmitir */
  nfeXml: string;
  /** Chave de acesso 44 dígitos */
  accessKey: string;
  /** Id do infNFe (NFe + chave) */
  infNFeId: string;
};

/**
 * Monta NF-e modelo 55 layout 4.00 com grupos obrigatórios para homologação SEFAZ.
 * Ainda precisa de assinatura digital (RealSefazClient / sefaz-sign).
 */
export function buildInvoiceXmlDocument(input: {
  company: Company;
  customer: Customer;
  invoice: Invoice;
  issueDate?: Date;
  cNF?: string;
}): BuildInvoiceXmlResult {
  const { company, customer, invoice } = input;
  const items = invoice.items ?? [];
  if (items.length === 0) {
    throw new Error("NF-e exige ao menos um item");
  }

  const uf = (company.state ?? "SP").toUpperCase();
  const cUF = UF_CODE[uf] ?? "35";
  const number = invoice.number ?? 1;
  const series = invoice.series || 1;
  const issueDate = input.issueDate ?? new Date();
  const cNF = input.cNF ?? String(Math.floor(Math.random() * 90_000_000) + 10_000_000);

  const accessKey = buildAccessKey({
    uf,
    issueDate,
    cnpj: company.document,
    series,
    number,
    cNF,
  });
  const infNFeId = `NFe${accessKey}`;
  const tpAmb = company.sefazEnvironment === "production" ? "1" : "2";
  const cMunFG = resolveIbgeCityCode(company.city, uf);
  const crt = crtFromTaxRegime(company.taxRegime);
  const emitIE = onlyDigits(company.stateRegistration) || "ISENTO";

  const destDoc = onlyDigits(customer.document);
  const destIsCpf = destDoc.length === 11;
  const destDocTag = destIsCpf
    ? `<CPF>${destDoc}</CPF>`
    : `<CNPJ>${pad(destDoc, 14)}</CNPJ>`;

  // Homologação: nome do destinatário exigido pela SEFAZ
  const destName =
    tpAmb === "2"
      ? "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL"
      : esc(customer.name);

  const destIE = onlyDigits(customer.stateRegistration);
  const indIEDest = destIE ? "1" : "9";
  const destIEXml =
    indIEDest === "1" ? `<IE>${destIE}</IE>` : "";

  const vProd = money(invoice.subtotalCents);
  // Totais oficiais: vNF normalmente = vProd + frete + outros - descontos (+ ST se houver)
  // Usamos subtotal dos produtos como base fiscal do layout; impostos estimados no domínio
  // ficam em vTotTrib informativo.
  const vNF = money(invoice.subtotalCents);
  const vTotTrib = money(invoice.taxCents + (invoice.stCents ?? 0));

  const nfeXml = `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
  <infNFe Id="${infNFeId}" versao="4.00">
    <ide>
      <cUF>${cUF}</cUF>
      <cNF>${pad(cNF, 8)}</cNF>
      <natOp>${esc(invoice.nature || "VENDA")}</natOp>
      <mod>55</mod>
      <serie>${series}</serie>
      <nNF>${number}</nNF>
      <dhEmi>${dhEmiIso(issueDate)}</dhEmi>
      <tpNF>1</tpNF>
      <idDest>1</idDest>
      <cMunFG>${cMunFG}</cMunFG>
      <tpImp>1</tpImp>
      <tpEmis>1</tpEmis>
      <cDV>${accessKey.slice(-1)}</cDV>
      <tpAmb>${tpAmb}</tpAmb>
      <finNFe>1</finNFe>
      <indFinal>1</indFinal>
      <indPres>1</indPres>
      <procEmi>0</procEmi>
      <verProc>NFeFacil 1.0</verProc>
    </ide>
    <emit>
      <CNPJ>${pad(onlyDigits(company.document), 14)}</CNPJ>
      <xNome>${esc(company.name)}</xNome>
      ${company.tradeName ? `<xFant>${esc(company.tradeName)}</xFant>` : ""}
      ${enderXml("enderEmit", company)}
      <IE>${esc(emitIE)}</IE>
      <CRT>${crt}</CRT>
    </emit>
    <dest>
      ${destDocTag}
      <xNome>${destName}</xNome>
      ${enderXml("enderDest", customer)}
      <indIEDest>${indIEDest}</indIEDest>
      ${destIEXml}
      ${customer.email ? `<email>${esc(customer.email)}</email>` : ""}
    </dest>
    ${detXml(items, invoice.cfop, company.taxRegime)}
    <total>
      <ICMSTot>
        <vBC>0.00</vBC>
        <vICMS>0.00</vICMS>
        <vICMSDeson>0.00</vICMSDeson>
        <vFCP>0.00</vFCP>
        <vBCST>0.00</vBCST>
        <vST>0.00</vST>
        <vFCPST>0.00</vFCPST>
        <vFCPSTRet>0.00</vFCPSTRet>
        <vProd>${vProd}</vProd>
        <vFrete>0.00</vFrete>
        <vSeg>0.00</vSeg>
        <vDesc>0.00</vDesc>
        <vII>0.00</vII>
        <vIPI>0.00</vIPI>
        <vIPIDevol>0.00</vIPIDevol>
        <vPIS>0.00</vPIS>
        <vCOFINS>0.00</vCOFINS>
        <vOutro>0.00</vOutro>
        <vNF>${vNF}</vNF>
        <vTotTrib>${vTotTrib}</vTotTrib>
      </ICMSTot>
    </total>
    <transp>
      <modFrete>9</modFrete>
    </transp>
    <pag>
      <detPag>
        <indPag>0</indPag>
        <tPag>99</tPag>
        <vPag>${vNF}</vPag>
      </detPag>
    </pag>
    <infAdic>
      <infCpl>${esc(
        tpAmb === "2"
          ? "NF-e emitida em ambiente de homologacao - sem valor fiscal. Gerada por NFeFacil."
          : "Documento gerado por NFeFacil.",
      )}</infCpl>
    </infAdic>
  </infNFe>
</NFe>`;

  return { nfeXml, accessKey, infNFeId };
}

/**
 * Compatível com o fluxo de transmissão: retorna o XML da NFe (sem nfeProc).
 * A assinatura e o nfeProc são feitos no RealSefazClient / após autorização.
 */
export function buildInvoiceXml(input: {
  company: Company;
  customer: Customer;
  invoice: Invoice;
  issueDate?: Date;
  cNF?: string;
}): string {
  return buildInvoiceXmlDocument(input).nfeXml;
}
