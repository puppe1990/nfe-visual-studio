import type { BlogPost } from "./post-types";

export const nfeOuNfse: BlogPost = {
  slug: "nfe-ou-nfse-qual-usar",
  title: "NF-e ou NFS-e: qual nota a sua empresa precisa emitir",
  description:
    "Serviço vai em NFS-e, mercadoria vai em NF-e. Veja como decidir quando a empresa vende os dois e por que errar isso custa caro.",
  publishedAt: "2026-10-01",
  tag: "NF-e",
  blocks: [
    {
      kind: "paragraph",
      text: "A confusão é comum porque as duas são chamadas de nota fiscal eletrônica. A diferença está no que você vende: serviço vai em NFS-e, mercadoria vai em NF-e. Uma empresa pode precisar das duas na mesma semana.",
    },
    {
      kind: "heading",
      text: "NFS-e — serviço",
    },
    {
      kind: "list",
      items: [
        "Competência municipal: quem manda é a prefeitura do local da prestação.",
        "Em São Paulo o webservice é próprio, operado pela Nota do Milhão.",
        "Incide ISS, com alíquota definida pelo município e pelo código de serviço.",
        "Não existe modelo 55: NFS-e é NFS-e em todo o país.",
      ],
    },
    {
      kind: "heading",
      text: "NF-e — mercadoria",
    },
    {
      kind: "list",
      items: [
        "Competência estadual: SEFAZ da UF do emitente.",
        "Layout 4.00, chave de acesso com 44 dígitos e DANFE para circulação.",
        "Incide ICMS quando a operação é tributada.",
        "Modelo 55 é a nota clássica; a 65 é o cupom fiscal do varejo.",
      ],
    },
    {
      kind: "heading",
      text: "Quando é os dois",
    },
    {
      kind: "paragraph",
      text: "Uma empresa que instala e vende equipamento, por exemplo: o serviço de instalação é NFS-e, o equipamento é NF-e. Emitir tudo como serviço, ou tudo como mercadoria, é uma das causas mais comuns de autuação em empresas pequenas.",
    },
    {
      kind: "callout",
      title: "Regra prática",
      text: "Pergunte o que está sendo entregue: trabalho (NFS-e) ou coisa (NF-e). Se a resposta for as duas, são duas notas.",
    },
    {
      kind: "paragraph",
      text: "No NFeFácil os dois fluxos convivem: NFS-e paulistana e NF-e 55 na SEFAZ da UF do emitente, com o mesmo certificado A1 e o mesmo cadastro de clientes e produtos.",
    },
  ],
};
