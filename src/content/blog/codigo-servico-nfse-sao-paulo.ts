import type { BlogPost } from "./post-types";

export const codigoServicoNfse: BlogPost = {
  slug: "codigo-servico-nfse-sao-paulo",
  title: "Código de serviço na NFS-e de São Paulo: como escolher o certo",
  description:
    "O código liga a nota ao seu cadastro de ISS. Veja onde ele aparece, os erros que mais geram rejeição e como mapear os serviços da empresa.",
  publishedAt: "2026-10-14",
  tag: "NFS-e",
  blocks: [
    {
      kind: "paragraph",
      text: "O código de serviço é o que liga a nota ao seu cadastro de ISS. Na NFS-e paulistana ele vem da lista de serviços do município, baseada na LC 116 com desdobramentos próprios de São Paulo.",
    },
    {
      kind: "heading",
      text: "Onde olhar antes de escolher",
    },
    {
      kind: "list",
      items: [
        "No seu cadastro de contribuinte (CCM): a atividade que você declarou lá é a referência.",
        "Na lista de serviços do município, pelo item e subitem.",
        "Na última NFS-e emitida pela contabilidade, se a empresa já emitia antes.",
      ],
    },
    {
      kind: "heading",
      text: "O que costuma dar errado",
    },
    {
      kind: "list",
      items: [
        "Usar o código de outro município: a lista é parecida, o desdobramento não.",
        "Escolher um item guarda-chuva para tudo, que não bate com a atividade cadastrada.",
        "Acertar o código e errar a alíquota — o código não define a alíquota sozinho.",
        "Usar manutenção (14.01) para instalação, que é outro item da lista.",
      ],
    },
    {
      kind: "callout",
      title: "Rejeição de código não consome numeração",
      text: "Se a Prefeitura recusa o código, a nota nem é autorizada. Você corrige e reenvia sem queimar o número do RPS — o cuidado com a sequência vale para notas aceitas.",
    },
    {
      kind: "heading",
      text: "Um código por serviço real",
    },
    {
      kind: "paragraph",
      text: "Empresas que prestam três serviços diferentes precisam de três códigos, e não de um código médio. Vale mapear isso uma vez, guardar a lista e escolher na hora de emitir, em vez de redescobrir a cada nota.",
    },
    {
      kind: "paragraph",
      text: "Depois de mapeado, o código é a parte fácil: ele fica preso ao serviço e não muda de nota para nota.",
    },
  ],
};
