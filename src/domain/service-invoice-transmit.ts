import type { Client } from "@libsql/client";

import { getActiveCertificateMaterial } from "./certificates";
import { getCompany } from "./companies";
import { getCustomer } from "./customers";
import { callNfseSoap, type NfsePostFn } from "./nfse-client";
import { buildRpsSignPayload, signRpsPayload } from "./nfse-rps";
import {
  buildPedidoEnvioRpsXml,
  parseEnvioRpsReturn,
  signPedidoXml,
} from "./nfse-xml";
import { loadA1FromPfx } from "./sefaz-sign";
import { getServiceInvoice, mapServiceInvoice } from "./service-invoice-row";
import type { ServiceInvoice, ServiceResult } from "./types";
import { resolveIbgeCityCode } from "./xml-export";

export async function transmitServiceInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
  options?: { postFn?: NfsePostFn; endpoint?: string; issuedOn?: string },
): Promise<ServiceResult<{ invoice: ServiceInvoice }>> {
  const current = await getServiceInvoice(client, companyId, invoiceId);
  if (!current.ok) return current;
  if (
    current.data.invoice.status !== "draft" &&
    current.data.invoice.status !== "rejected"
  ) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Somente rascunhos ou rejeitadas podem ser transmitidas",
      },
    };
  }

  const company = await getCompany(client, companyId);
  if (!company.ok) return company;
  const im = company.data.company.municipalRegistration?.replace(/\D/g, "");
  if (!im || im.length !== 8) {
    return {
      ok: false,
      error: {
        code: "VALIDATION",
        message: "Informe a inscrição municipal (8 dígitos) em Configurações",
      },
    };
  }

  const customer = await getCustomer(
    client,
    companyId,
    current.data.invoice.customerId,
  );
  if (!customer.ok) return customer;

  const material = await getActiveCertificateMaterial(client, companyId);
  if (!material.ok || !material.data) {
    return {
      ok: false,
      error: { code: "VALIDATION", message: "Cadastre o certificado A1" },
    };
  }

  const invoice = current.data.invoice;
  const issuedOn = options?.issuedOn ?? new Date().toISOString().slice(0, 10);
  const a1 = loadA1FromPfx(material.data.pfxBase64, material.data.password);
  const payload = buildRpsSignPayload({
    municipalRegistration: im,
    rpsSeries: invoice.rpsSeries,
    rpsNumber: invoice.rpsNumber,
    issuedOn,
    taxation: "T",
    status: "N",
    issWithheld: invoice.issWithheld,
    serviceCents: invoice.subtotalCents,
    deductionCents: 0,
    serviceCode: invoice.serviceCode,
    takerDocument: customer.data.customer.document,
  });
  const rpsSignature = signRpsPayload(payload, a1);

  const unsigned = buildPedidoEnvioRpsXml({
    senderDocument: company.data.company.document,
    municipalRegistration: im,
    rpsSeries: invoice.rpsSeries,
    rpsNumber: invoice.rpsNumber,
    issuedOn,
    taxation: "T",
    status: "N",
    issWithheld: invoice.issWithheld,
    serviceCents: invoice.subtotalCents,
    deductionCents: 0,
    serviceCode: invoice.serviceCode,
    discrimination: invoice.discrimination,
    issRate: invoice.issRate,
    rpsSignature,
    taker: {
      document: customer.data.customer.document,
      name: customer.data.customer.name,
      email: customer.data.customer.email,
      streetType: "Rua",
      street: customer.data.customer.street,
      number: customer.data.customer.number,
      complement: customer.data.customer.complement,
      district: customer.data.customer.district,
      cityIbge: resolveIbgeCityCode(
        customer.data.customer.city,
        customer.data.customer.state,
      ),
      state: customer.data.customer.state,
      zip: customer.data.customer.zip,
    },
  });
  const signed = signPedidoXml(unsigned, a1, "PedidoEnvioRPS");

  const soap = await callNfseSoap({
    method: "EnvioRPS",
    mensagemXml: signed,
    pfxBase64: material.data.pfxBase64,
    password: material.data.password,
    endpoint: options?.endpoint,
    postFn: options?.postFn,
  });
  const parsed = parseEnvioRpsReturn(soap.retornoXml);

  if (!parsed.ok) {
    await client.execute({
      sql: `UPDATE service_invoices SET
              status = 'rejected',
              xml_content = ?,
              return_xml = ?,
              rejection_reason = ?,
              updated_at = unixepoch()
            WHERE id = ? AND company_id = ?`,
      args: [
        signed,
        soap.retornoXml,
        `${parsed.code}: ${parsed.message}`,
        invoiceId,
        companyId,
      ],
    });
    return getServiceInvoice(client, companyId, invoiceId);
  }

  await client.execute({
    sql: `UPDATE service_invoices SET
            status = 'authorized',
            nfse_number = ?,
            verification_code = ?,
            xml_content = ?,
            return_xml = ?,
            rejection_reason = NULL,
            issued_at = unixepoch(),
            updated_at = unixepoch()
          WHERE id = ? AND company_id = ?`,
    args: [
      parsed.nfseNumber,
      parsed.verificationCode,
      signed,
      soap.retornoXml,
      invoiceId,
      companyId,
    ],
  });
  return getServiceInvoice(client, companyId, invoiceId);
}
