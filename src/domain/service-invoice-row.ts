import type { Client } from "@libsql/client";

import type { ServiceInvoice, ServiceResult } from "./types";

export function mapServiceInvoice(row: Record<string, unknown>): ServiceInvoice {
  return {
    id: Number(row.id),
    companyId: Number(row.company_id),
    customerId: Number(row.customer_id),
    customerName:
      row.customer_name == null ? undefined : String(row.customer_name),
    rpsSeries: String(row.rps_series),
    rpsNumber: Number(row.rps_number),
    nfseNumber: row.nfse_number == null ? null : Number(row.nfse_number),
    verificationCode:
      row.verification_code == null ? null : String(row.verification_code),
    serviceCode: String(row.service_code),
    discrimination: String(row.discrimination),
    taxation: String(row.taxation),
    issRate: Number(row.iss_rate),
    issWithheld: Number(row.iss_withheld) === 1,
    status: row.status as ServiceInvoice["status"],
    subtotalCents: Number(row.subtotal_cents),
    issCents: Number(row.iss_cents),
    totalCents: Number(row.total_cents),
    xmlContent: row.xml_content == null ? null : String(row.xml_content),
    returnXml: row.return_xml == null ? null : String(row.return_xml),
    rejectionReason:
      row.rejection_reason == null ? null : String(row.rejection_reason),
    issuedAt: row.issued_at == null ? null : Number(row.issued_at) * 1000,
    createdAt: Number(row.created_at) * 1000,
    updatedAt: Number(row.updated_at) * 1000,
  };
}

export async function getServiceInvoice(
  client: Client,
  companyId: number,
  invoiceId: number,
): Promise<ServiceResult<{ invoice: ServiceInvoice }>> {
  const result = await client.execute({
    sql: `SELECT s.*, c.name AS customer_name
          FROM service_invoices s
          JOIN customers c ON c.id = s.customer_id
          WHERE s.id = ? AND s.company_id = ?`,
    args: [invoiceId, companyId],
  });
  if (result.rows.length === 0) {
    return {
      ok: false,
      error: { code: "NOT_FOUND", message: "NFS-e não encontrada" },
    };
  }
  return {
    ok: true,
    data: {
      invoice: mapServiceInvoice(
        result.rows[0] as unknown as Record<string, unknown>,
      ),
    },
  };
}
