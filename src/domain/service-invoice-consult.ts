import type { Client } from "@libsql/client";

import { getActiveCertificateMaterial } from "./certificates";
import { getCompany } from "./companies";
import { callNfseSoap, type NfsePostFn } from "./nfse-client";
import {
  buildConsultaCnpjXml,
  parseConsultaCnpjReturn,
  signPedidoXml,
} from "./nfse-xml";
import { loadA1FromPfx } from "./sefaz-sign";
import type { ServiceResult } from "./types";

export async function consultIssuerCnpj(
  client: Client,
  companyId: number,
  options?: { postFn?: NfsePostFn; endpoint?: string },
): Promise<
  ServiceResult<{ municipalRegistration: string; emitsNfse: boolean }>
> {
  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  const material = await getActiveCertificateMaterial(client, companyId);
  if (!material.ok || !material.data) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Cadastre o certificado A1" },
    };
  }

  const a1 = loadA1FromPfx(material.data.pfxBase64, material.data.password);
  const unsigned = buildConsultaCnpjXml(
    company.data.company.document,
    company.data.company.document,
  );
  const signed = signPedidoXml(unsigned, a1, "PedidoConsultaCNPJ");
  const soap = await callNfseSoap({
    method: "ConsultaCNPJ",
    mensagemXml: signed,
    pfxBase64: material.data.pfxBase64,
    password: material.data.password,
    endpoint: options?.endpoint,
    postFn: options?.postFn,
  });
  const parsed = parseConsultaCnpjReturn(soap.retornoXml);
  if (!parsed.ok) {
    return {
      ok: false,
      error: { code: parsed.code, message: parsed.message },
    };
  }
  return { ok: true, data: parsed };
}
