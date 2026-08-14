import { SignedXml } from "xml-crypto";

import type { RpsStatus, RpsTaxation } from "./nfse-rps";
import type { LoadedA1 } from "./sefaz-sign";

const NS = "http://www.prefeitura.sp.gov.br/nfe";

export type NfseTakerInput = {
  document: string;
  name: string;
  email?: string | null;
  streetType?: string | null;
  street?: string | null;
  number?: string | null;
  complement?: string | null;
  district?: string | null;
  cityIbge?: string | null;
  state?: string | null;
  zip?: string | null;
};

export type PedidoEnvioRpsInput = {
  senderDocument: string;
  municipalRegistration: string;
  rpsSeries: string;
  rpsNumber: number;
  issuedOn: string;
  taxation: RpsTaxation;
  status: RpsStatus;
  issWithheld: boolean;
  serviceCents: number;
  deductionCents: number;
  serviceCode: string;
  discrimination: string;
  issRate: number;
  rpsSignature: string;
  taker: NfseTakerInput;
};

export type EnvioRpsSuccess = {
  ok: true;
  nfseNumber: number;
  verificationCode: string;
  municipalRegistration: string | null;
};

export type EnvioRpsFailure = {
  ok: false;
  code: string;
  message: string;
};

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

function cpfCnpjXml(document: string): string {
  const digits = onlyDigits(document);
  if (digits.length === 11) return `<CPF>${digits}</CPF>`;
  return `<CNPJ>${digits.padStart(14, "0")}</CNPJ>`;
}

function tag(xml: string, name: string): string | null {
  const m = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  return m ? m[1].trim() : null;
}

export function buildPedidoEnvioRpsXml(input: PedidoEnvioRpsInput): string {
  const im = onlyDigits(input.municipalRegistration).padStart(8, "0");
  const serviceCode = onlyDigits(input.serviceCode).padStart(5, "0");
  const t = input.taker;
  const streetType = t.streetType?.trim()
    ? `<TipoLogradouro>${esc(t.streetType.trim())}</TipoLogradouro>`
    : "";
  const street = t.street?.trim()
    ? `<Logradouro>${esc(t.street.trim())}</Logradouro>`
    : "";
  const number = t.number?.trim()
    ? `<NumeroEndereco>${esc(t.number.trim())}</NumeroEndereco>`
    : "";
  const complement = t.complement?.trim()
    ? `<ComplementoEndereco>${esc(t.complement.trim())}</ComplementoEndereco>`
    : "";
  const district = t.district?.trim()
    ? `<Bairro>${esc(t.district.trim())}</Bairro>`
    : "";
  const city = t.cityIbge?.trim()
    ? `<Cidade>${onlyDigits(t.cityIbge)}</Cidade>`
    : "";
  const uf = t.state?.trim()
    ? `<UF>${esc(t.state.trim().toUpperCase())}</UF>`
    : "";
  const zip = t.zip?.trim() ? `<CEP>${onlyDigits(t.zip)}</CEP>` : "";
  const email = t.email?.trim()
    ? `<EmailTomador>${esc(t.email.trim())}</EmailTomador>`
    : "";

  return `<nfe:PedidoEnvioRPS xmlns:nfe="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      ${cpfCnpjXml(input.senderDocument)}
    </CPFCNPJRemetente>
  </Cabecalho>
  <RPS>
    <Assinatura>${input.rpsSignature}</Assinatura>
    <ChaveRPS>
      <InscricaoPrestador>${im}</InscricaoPrestador>
      <SerieRPS>${esc(input.rpsSeries.trim())}</SerieRPS>
      <NumeroRPS>${input.rpsNumber}</NumeroRPS>
    </ChaveRPS>
    <TipoRPS>RPS</TipoRPS>
    <DataEmissao>${input.issuedOn}</DataEmissao>
    <StatusRPS>${input.status}</StatusRPS>
    <TributacaoRPS>${input.taxation}</TributacaoRPS>
    <ValorServicos>${money(input.serviceCents)}</ValorServicos>
    <ValorDeducoes>${money(input.deductionCents)}</ValorDeducoes>
    <CodigoServico>${serviceCode}</CodigoServico>
    <AliquotaServicos>${input.issRate.toFixed(2)}</AliquotaServicos>
    <ISSRetido>${input.issWithheld ? "true" : "false"}</ISSRetido>
    <CPFCNPJTomador>
      ${cpfCnpjXml(t.document)}
    </CPFCNPJTomador>
    <RazaoSocialTomador>${esc(t.name)}</RazaoSocialTomador>
    <EnderecoTomador>
      ${streetType}
      ${street}
      ${number}
      ${complement}
      ${district}
      ${city}
      ${uf}
      ${zip}
    </EnderecoTomador>
    ${email}
    <Discriminacao>${esc(input.discrimination)}</Discriminacao>
  </RPS>
</nfe:PedidoEnvioRPS>`;
}

export function buildConsultaCnpjXml(
  senderDocument: string,
  targetDocument: string,
): string {
  return `<nfe:PedidoConsultaCNPJ xmlns:nfe="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      ${cpfCnpjXml(senderDocument)}
    </CPFCNPJRemetente>
  </Cabecalho>
  <CNPJContribuinte>
    ${cpfCnpjXml(targetDocument)}
  </CNPJContribuinte>
</nfe:PedidoConsultaCNPJ>`;
}

export function signPedidoXml(
  xml: string,
  a1: LoadedA1,
  rootLocalName: string,
): string {
  const sig = new SignedXml({
    privateKey: a1.privateKeyPem,
    publicCert: a1.certificatePem,
    signatureAlgorithm: "http://www.w3.org/2000/09/xmldsig#rsa-sha1",
    canonicalizationAlgorithm: "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
  });

  sig.addReference({
    xpath: `//*[local-name(.)='${rootLocalName}']`,
    transforms: [
      "http://www.w3.org/2000/09/xmldsig#enveloped-signature",
      "http://www.w3.org/TR/2001/REC-xml-c14n-20010315",
    ],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
    uri: "",
    isEmptyUri: true,
  });

  sig.computeSignature(xml, {
    location: {
      reference: `//*[local-name(.)='${rootLocalName}']`,
      action: "append",
    },
    prefix: "ds",
  });

  return sig.getSignedXml();
}

export function parseEnvioRpsReturn(
  xml: string,
): EnvioRpsSuccess | EnvioRpsFailure {
  const sucesso = (tag(xml, "Sucesso") ?? "").toLowerCase();
  if (sucesso === "true") {
    const numberRaw = tag(xml, "NumeroNFe");
    const code = tag(xml, "CodigoVerificacao") ?? "";
    if (!numberRaw) {
      return {
        ok: false,
        code: "PARSE",
        message: "Retorno sem Número da NFS-e",
      };
    }
    return {
      ok: true,
      nfseNumber: Number(numberRaw),
      verificationCode: code,
      municipalRegistration: tag(xml, "InscricaoPrestador"),
    };
  }

  return {
    ok: false,
    code: tag(xml, "Codigo") ?? "ERRO",
    message: tag(xml, "Descricao") ?? "Prefeitura rejeitou o RPS",
  };
}

export function parseConsultaCnpjReturn(xml: string):
  | { ok: true; municipalRegistration: string; emitsNfse: boolean }
  | { ok: false; code: string; message: string } {
  const sucesso = (tag(xml, "Sucesso") ?? "").toLowerCase();
  if (sucesso !== "true") {
    return {
      ok: false,
      code: tag(xml, "Codigo") ?? "ERRO",
      message: tag(xml, "Descricao") ?? "Falha na consulta de CNPJ",
    };
  }
  const im = tag(xml, "InscricaoMunicipal");
  if (!im) {
    return {
      ok: false,
      code: "PARSE",
      message: "Consulta CNPJ sem inscrição municipal",
    };
  }
  const emits = (tag(xml, "EmiteNFe") ?? "").toLowerCase() === "true";
  return { ok: true, municipalRegistration: im, emitsNfse: emits };
}

export type HistoricNfse = {
  nfseNumber: number;
  verificationCode: string;
  issuedAt: string;
  rpsSeries: string;
  rpsNumber: number;
  serviceCode: string;
  discrimination: string;
  taxation: string;
  issRate: number;
  issWithheld: boolean;
  serviceCents: number;
  issCents: number;
  takerDocument: string | null;
  takerName: string | null;
  takerEmail: string | null;
  canceled: boolean;
};

export function buildConsultaNfePeriodoXml(input: {
  senderDocument: string;
  municipalRegistration: string;
  dateFrom: string;
  dateTo: string;
  page: number;
}): string {
  const im = onlyDigits(input.municipalRegistration).padStart(8, "0");
  return `<nfe:PedidoConsultaNFePeriodo xmlns:nfe="${NS}" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Cabecalho Versao="1">
    <CPFCNPJRemetente>
      ${cpfCnpjXml(input.senderDocument)}
    </CPFCNPJRemetente>
    <CPFCNPJ>
      ${cpfCnpjXml(input.senderDocument)}
    </CPFCNPJ>
    <Inscricao>${im}</Inscricao>
    <dtInicio>${input.dateFrom}</dtInicio>
    <dtFim>${input.dateTo}</dtFim>
    <NumeroPagina>${input.page}</NumeroPagina>
  </Cabecalho>
</nfe:PedidoConsultaNFePeriodo>`;
}

function firstCnpjOrCpf(block: string): string | null {
  const cnpj = tag(block, "CNPJ");
  if (cnpj) return onlyDigits(cnpj);
  const cpf = tag(block, "CPF");
  if (cpf) return onlyDigits(cpf);
  return null;
}

function reaisToCents(raw: string | null): number {
  if (!raw) return 0;
  const n = Number(raw.replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function parseConsultaNfeReturn(xml: string):
  | { ok: true; notes: HistoricNfse[] }
  | { ok: false; code: string; message: string } {
  const sucesso = (tag(xml, "Sucesso") ?? "").toLowerCase();
  if (sucesso !== "true") {
    return {
      ok: false,
      code: tag(xml, "Codigo") ?? "ERRO",
      message: tag(xml, "Descricao") ?? "Falha na consulta de NFS-e emitidas",
    };
  }

  const notes: HistoricNfse[] = [];
  const blocks = xml.match(/<NFe\b[\s\S]*?<\/NFe>/gi) ?? [];
  for (const block of blocks) {
    const chave = block.match(/<ChaveNFe\b[\s\S]*?<\/ChaveNFe>/i)?.[0] ?? "";
    const chaveRps = block.match(/<ChaveRPS\b[\s\S]*?<\/ChaveRPS>/i)?.[0] ?? "";
    const number = Number(tag(chave, "NumeroNFe"));
    if (!Number.isFinite(number) || number <= 0) continue;
    const takerBlock =
      block.match(/<CPFCNPJTomador\b[\s\S]*?<\/CPFCNPJTomador>/i)?.[0] ?? "";
    const status = tag(block, "StatusNFe") ?? "N";
    notes.push({
      nfseNumber: number,
      verificationCode: tag(chave, "CodigoVerificacao") ?? "",
      issuedAt: (tag(block, "DataEmissaoNFe") ?? "").slice(0, 19),
      rpsSeries: tag(chaveRps, "SerieRPS") ?? "A",
      rpsNumber: Number(tag(chaveRps, "NumeroRPS") ?? number),
      serviceCode: (tag(block, "CodigoServico") ?? "").padStart(5, "0"),
      discrimination: tag(block, "Discriminacao") ?? "Serviço importado da Prefeitura",
      taxation: tag(block, "TributacaoNFe") ?? "T",
      issRate: Number(tag(block, "AliquotaServicos") ?? "0.05"),
      issWithheld: (tag(block, "ISSRetido") ?? "").toLowerCase() === "true",
      serviceCents: reaisToCents(tag(block, "ValorServicos")),
      issCents: reaisToCents(tag(block, "ValorISS")),
      takerDocument: firstCnpjOrCpf(takerBlock),
      takerName: tag(block, "RazaoSocialTomador"),
      takerEmail: tag(block, "EmailTomador"),
      canceled: status.toUpperCase() === "C",
    });
  }

  return { ok: true, notes };
}
