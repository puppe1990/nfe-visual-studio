import { describe, expect, it } from "vitest";

import { generateTestPfx, loadA1FromPfx } from "./sefaz-sign";
import {
  buildConsultaCnpjXml,
  buildPedidoEnvioRpsXml,
  parseConsultaCnpjReturn,
  parseConsultaNfeReturn,
  parseEnvioRpsReturn,
  signPedidoXml,
} from "./nfse-xml";

const avantPedido = {
  senderDocument: "24490987000138",
  municipalRegistration: "62105809",
  rpsSeries: "A",
  rpsNumber: 1,
  issuedOn: "2026-08-14",
  taxation: "T" as const,
  status: "N" as const,
  issWithheld: false,
  serviceCents: 150_000,
  deductionCents: 0,
  serviceCode: "01880",
  discrimination: "Servicos de assistencia tecnica no site institucional.",
  issRate: 0.05,
  taker: {
    document: "25238319000180",
    name: "AVANT-PROJETOS, INVESTIMENTOS E PARTICIPACOES LTDA",
    email: "tiago.pagani@ploomes.com",
    street: "CARLOS GOMES",
    streetType: "Rua",
    number: "700",
    complement: "ANDAR 8",
    district: "BOA VISTA",
    cityIbge: "4314902",
    state: "RS",
    zip: "90480000",
  },
};

describe("NFS-e SP XML", () => {
  it("builds PedidoEnvioRPS v1 with Avant and service 01880", () => {
    const xml = buildPedidoEnvioRpsXml({
      ...avantPedido,
      rpsSignature: "dGVzdA==",
    });

    expect(xml).toContain('xmlns:nfe="http://www.prefeitura.sp.gov.br/nfe"');
    expect(xml).toContain('<Cabecalho Versao="1">');
    expect(xml).toContain("<CNPJ>24490987000138</CNPJ>");
    expect(xml).toContain("<InscricaoPrestador>62105809</InscricaoPrestador>");
    expect(xml).toContain("<CodigoServico>01880</CodigoServico>");
    expect(xml).toContain("<ValorServicos>1500.00</ValorServicos>");
    expect(xml).toContain("<CNPJ>25238319000180</CNPJ>");
    expect(xml).toContain("<AliquotaServicos>0.05</AliquotaServicos>");
    expect(xml).toContain("<ISSRetido>false</ISSRetido>");
    expect(xml).toContain("<Discriminacao>");
  });

  it("parses a successful EnvioRPS return", () => {
    const raw = `<?xml version="1.0"?>
<RetornoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1"><Sucesso>true</Sucesso></Cabecalho>
  <ChaveNFeRPS>
    <ChaveNFe>
      <InscricaoPrestador>62105809</InscricaoPrestador>
      <NumeroNFe>72</NumeroNFe>
      <CodigoVerificacao>ABCD-1234</CodigoVerificacao>
    </ChaveNFe>
    <ChaveRPS>
      <InscricaoPrestador>62105809</InscricaoPrestador>
      <SerieRPS>A</SerieRPS>
      <NumeroRPS>1</NumeroRPS>
    </ChaveRPS>
  </ChaveNFeRPS>
</RetornoEnvioRPS>`;

    const parsed = parseEnvioRpsReturn(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.nfseNumber).toBe(72);
      expect(parsed.verificationCode).toBe("ABCD-1234");
    }
  });

  it("parses an EnvioRPS error", () => {
    const raw = `<RetornoEnvioRPS xmlns="http://www.prefeitura.sp.gov.br/nfe">
  <Cabecalho Versao="1"><Sucesso>false</Sucesso></Cabecalho>
  <Erro><Codigo>1107</Codigo><Descricao>Assinatura do RPS invalida</Descricao></Erro>
</RetornoEnvioRPS>`;

    const parsed = parseEnvioRpsReturn(raw);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) {
      expect(parsed.code).toBe("1107");
      expect(parsed.message).toMatch(/Assinatura/i);
    }
  });

  it("builds and signs ConsultaCNPJ", () => {
    const { pfxBase64, password } = generateTestPfx("x");
    const a1 = loadA1FromPfx(pfxBase64, password);
    const unsigned = buildConsultaCnpjXml("24490987000138", "24490987000138");
    expect(unsigned).toContain("PedidoConsultaCNPJ");
    const signed = signPedidoXml(unsigned, a1, "PedidoConsultaCNPJ");
    expect(signed).toContain("Signature");
    expect(signed).toContain("SignatureValue");
    expect(signed).not.toMatch(/PedidoConsultaCNPJ[^>]*\sId=/);
  });

  it("parses ConsultaNFeEmitidas notes", () => {
    const raw = `<RetornoConsulta>
      <Cabecalho Versao="1"><Sucesso>true</Sucesso></Cabecalho>
      <NFe>
        <ChaveNFe>
          <InscricaoPrestador>62105809</InscricaoPrestador>
          <NumeroNFe>67</NumeroNFe>
          <CodigoVerificacao>4PEG-2AJJ</CodigoVerificacao>
        </ChaveNFe>
        <DataEmissaoNFe>2026-03-20T15:56:11</DataEmissaoNFe>
        <ChaveRPS><SerieRPS>A</SerieRPS><NumeroRPS>8</NumeroRPS></ChaveRPS>
        <StatusNFe>N</StatusNFe>
        <TributacaoNFe>T</TributacaoNFe>
        <ValorServicos>3500.00</ValorServicos>
        <CodigoServico>1880</CodigoServico>
        <AliquotaServicos>0.05</AliquotaServicos>
        <ValorISS>175.00</ValorISS>
        <ISSRetido>false</ISSRetido>
        <CPFCNPJTomador><CNPJ>25238319000180</CNPJ></CPFCNPJTomador>
        <RazaoSocialTomador>AVANT-PROJETOS, INVESTIMENTOS E PARTICIPACOES LTDA</RazaoSocialTomador>
        <Discriminacao>configuracao de dominio e criacao de site</Discriminacao>
      </NFe>
    </RetornoConsulta>`;
    const parsed = parseConsultaNfeReturn(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.notes).toHaveLength(1);
    expect(parsed.notes[0]?.nfseNumber).toBe(67);
    expect(parsed.notes[0]?.serviceCents).toBe(350_000);
    expect(parsed.notes[0]?.takerDocument).toBe("25238319000180");
    expect(parsed.notes[0]?.serviceCode).toBe("01880");
  });

  it("parses ConsultaCNPJ return with municipal inscription", () => {
    const raw = `<RetornoConsultaCNPJ>
      <Cabecalho Versao="1"><Sucesso>true</Sucesso></Cabecalho>
      <Detalhe>
        <InscricaoMunicipal>62105809</InscricaoMunicipal>
        <EmiteNFe>true</EmiteNFe>
      </Detalhe>
    </RetornoConsultaCNPJ>`;
    const parsed = parseConsultaCnpjReturn(raw);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.municipalRegistration).toBe("62105809");
      expect(parsed.emitsNfse).toBe(true);
    }
  });
});
