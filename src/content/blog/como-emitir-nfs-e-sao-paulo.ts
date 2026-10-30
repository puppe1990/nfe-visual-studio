import type { BlogPost } from "./post-types";

export const comoEmitirNfseSaoPaulo: BlogPost = {
  slug: "como-emitir-nfs-e-sao-paulo",
  title: "Como emitir NFS-e em São Paulo sem depender de intermediário",
  description:
    "RPS, CCM, certificado A1 e webservice da Prefeitura: o caminho completo para emitir NFS-e paulistana direto do seu sistema.",
  publishedAt: "2026-09-02",
  tag: "NFS-e",
  blocks: [
    {
      kind: "paragraph",
      text: "Em São Paulo a NFS-e não nasce como nota: ela nasce como RPS, o Recibo Provisório de Serviços, que o seu sistema assina e envia ao webservice da Prefeitura. A conversão em nota fiscal acontece no retorno, quando o município devolve o número definitivo e o código de verificação.",
    },
    {
      kind: "paragraph",
      text: "Quem emite por um intermediário normalmente não vê essa etapa. Quando você fala direto com o webservice, o RPS é seu, a série é sua e o histórico é seu.",
    },
    {
      kind: "heading",
      text: "O que a Prefeitura exige antes do primeiro envio",
    },
    {
      kind: "list",
      items: [
        "CNPJ ativo com CCM (Cadastro de Contribuinte Mobiliário) na cidade de São Paulo.",
        "Certificado A1 em .pfx, válido, com a senha em mãos. É ele que assina o XML e autentica a conexão.",
        "Série e numeração de RPS definidas. Número repetido é rejeição na hora.",
        "Código de serviço da lista municipal, o mesmo item que aparece no seu cadastro de ISS.",
      ],
    },
    {
      kind: "heading",
      text: "O caminho de uma emissão",
    },
    {
      kind: "list",
      items: [
        "Você preenche tomador, serviço, valor e código.",
        "O sistema monta o XML do RPS e assina com o certificado A1 (XMLDSig).",
        "O XML segue por SOAP 1.1 com mTLS até o webservice da Nota do Milhão.",
        "A Prefeitura devolve o número da NFS-e, a data de emissão e o código de verificação.",
        "A nota fica consultável no portal do município e pode ser impressa em PDF.",
      ],
    },
    {
      kind: "callout",
      title: "Série e número não são detalhe",
      text: "RPS rejeitado por numeração fora de sequência é o erro mais comum de quem começa. Defina a série antes da primeira emissão e mantenha a sequência por série, nunca por dia.",
    },
    {
      kind: "heading",
      text: "O que muda quando a emissão é direta",
    },
    {
      kind: "paragraph",
      text: "O ganho não é só custo. É latência — a resposta volta em segundos, não em minutos de fila de terceiro —, é acesso ao XML original e é poder importar o histórico que já existe no município sem pedir nada a ninguém.",
    },
    {
      kind: "paragraph",
      text: "O preço é operacional: certificado vencendo, código de serviço errado e assinatura inválida passam a ser problema seu. Um emissor bem feito trata esses três antes de você ver a mensagem de erro.",
    },
    {
      kind: "quote",
      text: "Emitir direto é trocar mensalidade por responsabilidade. Para quem emite todo dia, a conta fecha rápido.",
    },
  ],
};
