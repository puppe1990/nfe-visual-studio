import type { BlogPost } from "../../domain/blog";
import { certificadoA1 } from "./certificado-a1-nfse-nfe";
import { codigoServicoNfse } from "./codigo-servico-nfse-sao-paulo";
import { comoEmitirNfseSaoPaulo } from "./como-emitir-nfs-e-sao-paulo";
import { nfeOuNfse } from "./nfe-ou-nfse-qual-usar";
import { nfseSemIntermediario } from "./nfs-e-sem-intermediario";

export const BLOG_POSTS: BlogPost[] = [
  comoEmitirNfseSaoPaulo,
  certificadoA1,
  nfeOuNfse,
  codigoServicoNfse,
  nfseSemIntermediario,
];
