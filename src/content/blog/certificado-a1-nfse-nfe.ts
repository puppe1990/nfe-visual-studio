import type { BlogPost } from "./post-types";

export const certificadoA1: BlogPost = {
  slug: "certificado-a1-nfse-nfe",
  title: "Certificado A1 para NFS-e e NF-e: o que conferir antes de emitir",
  description:
    "Titular, validade, senha e cadeia ICP-Brasil: os cinco pontos que fazem o certificado A1 assinar e autenticar sem erro.",
  publishedAt: "2026-09-18",
  tag: "Certificado",
  blocks: [
    {
      kind: "paragraph",
      text: "NFS-e e NF-e têm o mesmo pré-requisito no Brasil: um certificado digital do tipo A1. É o arquivo .pfx (PKCS#12) com a chave privada da empresa. Sem ele não existe assinatura XML válida e, na maioria dos webservices, nem conexão.",
    },
    {
      kind: "heading",
      text: "A1 e A3 não são intercambiáveis",
    },
    {
      kind: "paragraph",
      text: "O A3 mora em token ou cartão e exige o dispositivo plugado a cada assinatura. O A1 é um arquivo de validade curta, protegido por senha, que um servidor consegue usar sozinho. Por isso todo emissor automático trabalha com A1.",
    },
    {
      kind: "heading",
      text: "Cinco coisas para conferir",
    },
    {
      kind: "list",
      items: [
        "O titular do certificado é o CNPJ do emitente, não o CPF do sócio.",
        "A validade cobre todo o período em que você vai emitir.",
        "A senha está guardada em local seguro e sem espaço sobrando no início ou no fim.",
        "A cadeia ICP-Brasil está instalada na máquina ou no servidor que assina.",
        "O arquivo está em .pfx ou .p12, nunca apenas o .cer (que não tem a chave privada).",
      ],
    },
    {
      kind: "callout",
      title: "Titular errado derruba a emissão",
      text: "Um A1 no CPF do responsável até assina XML, mas a Prefeitura e a SEFAZ rejeitam porque o emitente da nota é o CNPJ. Confira o titular antes de subir o arquivo.",
    },
    {
      kind: "heading",
      text: "Por que o certificado aparece em dois lugares",
    },
    {
      kind: "paragraph",
      text: "Na assinatura, ele prova que o XML saiu da sua empresa. No transporte, ele autentica a conexão mTLS com a Prefeitura ou com a SEFAZ. Um certificado vencido derruba as duas coisas ao mesmo tempo, e o erro que aparece na tela muitas vezes fala só da segunda.",
    },
    {
      kind: "heading",
      text: "Quando trocar",
    },
    {
      kind: "paragraph",
      text: "Antes do vencimento, com folga de alguns dias. A troca no emissor é só subir o novo .pfx e a nova senha em Configurações. As notas já emitidas continuam válidas: a assinatura delas está no XML, não no certificado atual.",
    },
  ],
};
