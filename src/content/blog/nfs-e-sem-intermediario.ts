import type { BlogPost } from "./post-types";

export const nfseSemIntermediario: BlogPost = {
  slug: "nfs-e-sem-intermediario",
  title: "NFS-e sem intermediário: o que muda quando você fala direto com a Prefeitura",
  description:
    "O intermediário só entrega o XML no webservice. Veja o que você ganha e o que assume ao cortar essa camada do processo de emissão.",
  publishedAt: "2026-10-27",
  tag: "NFS-e",
  blocks: [
    {
      kind: "paragraph",
      text: "Intermediário de nota faz uma coisa só: pega o seu XML e entrega ao webservice oficial. É uma camada útil quando o seu sistema não fala SOAP, e uma camada caríssima quando ele já fala.",
    },
    {
      kind: "heading",
      text: "O que você entrega quando terceiriza a emissão",
    },
    {
      kind: "list",
      items: [
        "O certificado A1 da empresa, com a senha, para outra pessoa.",
        "O histórico de notas em um banco que não é seu.",
        "A latência: cada emissão vira uma fila de terceiro.",
        "A escolha do próprio preço, que passa a depender do fornecedor.",
      ],
    },
    {
      kind: "heading",
      text: "O que o webservice oficial já resolve",
    },
    {
      kind: "list",
      items: [
        "Assinatura XML com o seu certificado A1 (XMLDSig).",
        "Transporte SOAP 1.1 com mTLS.",
        "Autorização, cancelamento e inutilização.",
        "Consulta do histórico e impressão do PDF no portal do município.",
      ],
    },
    {
      kind: "paragraph",
      text: "A parte chata não é o protocolo. É tratar rejeição, numeração e validade de certificado. É exatamente aí que um emissor pronto economiza o seu tempo: o protocolo é igual para todos, o tratamento de erro não.",
    },
    {
      kind: "callout",
      title: "A conta real",
      text: "Não é só a mensalidade. É o tempo gasto na conciliação quando uma nota falha no meio do caminho e ninguém do seu lado tem o XML original para reenviar.",
    },
    {
      kind: "heading",
      text: "Como testar sem risco",
    },
    {
      kind: "paragraph",
      text: "Comece emitindo uma nota com valor simbólico e cancele em seguida. Se o XML e o PDF batem com o seu cadastro de contribuinte, o caminho está pronto para valer.",
    },
    {
      kind: "quote",
      text: "Emitir direto não é mais barato por ser simples. É mais barato por ser curto.",
    },
  ],
};
