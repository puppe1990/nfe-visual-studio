export const LANDING_PROOF = [
  "Prefeitura de São Paulo",
  "SEFAZ direta",
  "Certificado A1",
  "Sem Focus / TecnoSpeed",
] as const;

export const LANDING_PRODUCTS = [
  {
    kicker: "Serviço",
    title: "NFS-e Paulistana",
    text: "RPS assinado, lista oficial de códigos e PDF no portal da Prefeitura. Você importa o histórico que já existe no município.",
  },
  {
    kicker: "Mercadoria",
    title: "NF-e modelo 55",
    text: "XML 4.00, autorização, cancelamento e inutilização direto nos webservices da SEFAZ da UF do emitente.",
  },
] as const;

export const LANDING_STEPS = [
  {
    n: "01",
    title: "Cadastre o emitente",
    text: "CNPJ, CCM e o certificado A1 em Configurações.",
  },
  {
    n: "02",
    title: "Inclua o tomador",
    text: "Cliente com documento e endereço — você emite no nome da sua empresa.",
  },
  {
    n: "03",
    title: "Emita a nota",
    text: "NFS-e agora. NF-e quando a SEFAZ estiver no modo real.",
  },
] as const;

export const LANDING_FAQ = [
  {
    q: "Preciso de certificado A1?",
    a: "Sim, o PFX da empresa. Sem token de terceiro.",
  },
  {
    q: "Emite NFS-e fora de São Paulo?",
    a: "Não. Serviço é Pref. SP (Nota do Milhão). Mercadoria é SEFAZ da UF do emitente.",
  },
  {
    q: "Vocês passam por Focus ou TecnoSpeed?",
    a: "Não. SOAP + mTLS no webservice oficial.",
  },
  {
    q: "Tem mensalidade?",
    a: "Conta grátis neste momento. Sem tabela de planos nesta página.",
  },
] as const;

export const LANDING_RPS = {
  series: "A",
  number: "0072",
  customer: "Avant Projetos Ltda",
  service: "01880 · assistência",
  amount: "R$ 2.000,00",
} as const;

export const LANDING_GITHUB =
  "https://github.com/puppe1990/nfe-visual-studio";
